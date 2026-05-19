// Automation Orchestrator v2
// Cron */5 min. Cron parser complet (croner), Europe/Bucharest TZ, paralel cu cap,
// timeout per job (AbortController), retry pe joburi event/manuale.
// Acceptă POST { job_key } pentru Run Now din Admin, sau { dry_run: true }.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { Cron } from "npm:croner@8";

const TZ = "Europe/Bucharest";
const DEFAULT_TIMEOUT_MS = 50_000;
const DEFAULT_CONCURRENCY = 4;

// job_key -> edge function name
const JOB_FN: Record<string, string> = {
  // Lead automations
  "lead.auto_classify_agency": "lead-auto-classify-agency",
  "lead.auto_dedup": "lead-auto-dedup",
  "lead.auto_archive_callers": "voice-caller-archive-stale",
  // SEO automations
  "seo.auto_fill_meta": "seo-auto-fill-meta",
  "seo.anomaly_detector": "seo-anomaly-detector",
  "seo.weekly_report": "seo-weekly-report",
  "seo.competitor_tracker": "seo-competitor-cron",
  "seo.opportunity_detector": "seo-opportunity-detector",
  "seo.page_audit": "seo-page-audit-cron",
  "seo.indexing_alerts": "seo-indexing-alerts",
  "seo.monthly_snapshot": "seo-monthly-snapshot",
  "seo.ai_optimizer_audit": "seo-ai-optimizer",
  "seo.canonical_conflict_scan": "seo-canonical-conflict-scan",
  // Blog / analytics
  "blog.hub_clicks_weekly_digest": "blog-hub-weekly-digest",
  "blog.sitemap_refresh": "generate-blog-sitemap",
  // AI / prospect intelligence
  "ai.bulk_cache_refresh": "bulk-generate-ai-cache",
  "prospect.predictive_rescore": "scraper-lead-predictive",
  // System
  "system.daily_digest": "automation-daily-digest",
  "system.self_healing": "automation-self-healing",
  "system.anomaly_notifier": "automation-anomaly-notifier",
};

const INLINE_JOB = new Set([
  "lead.auto_archive_callers",
  "seo.canonical_conflict_scan",
]);

type Job = {
  job_key: string;
  enabled: boolean;
  schedule: string | null;
  trigger_type: string;
  last_run_at: string | null;
  config: Record<string, unknown> | null;
};

/** True if `schedule` should have fired between lastRunAt and now (Europe/Bucharest). */
function isDue(schedule: string | null, lastRunAt: string | null, now: Date): boolean {
  if (!schedule || schedule.trim() === "event-driven") return false;
  try {
    const cron = new Cron(schedule.trim(), { timezone: TZ });
    // previousRun returns the most recent scheduled tick at or before `now`
    const prev = cron.previousRun(now);
    if (!prev) return false;
    if (!lastRunAt) return true;
    return new Date(lastRunAt).getTime() < prev.getTime();
  } catch (_e) {
    return false;
  }
}

async function runWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let to: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    to = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms) as unknown as number;
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (to) clearTimeout(to);
  }
}

async function runJob(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  triggeredBy: string,
  dryRun: boolean,
): Promise<{ job_key: string; ok: boolean; error?: string; duration_ms: number; status: string; output?: unknown; retries: number }> {
  if (INLINE_JOB.has(job.job_key)) {
    const startedAt = Date.now();
    try {
      const output = job.job_key === "lead.auto_archive_callers"
        ? await runArchiveStaleCallers(supabase, dryRun)
        : await runCanonicalConflictScan(dryRun);
      const duration = Date.now() - startedAt;
      if (!dryRun) await completeRun(supabase, job.job_key, true, null, output, duration, "success", triggeredBy);
      return { job_key: job.job_key, ok: true, duration_ms: duration, status: "success", output, retries: 0 };
    } catch (e) {
      const duration = Date.now() - startedAt;
      const msg = errorMessage(e);
      if (!dryRun) await completeRun(supabase, job.job_key, false, msg, {}, duration, "failed", triggeredBy);
      return { job_key: job.job_key, ok: false, error: msg, duration_ms: duration, status: "failed", retries: 0 };
    }
  }

  const fnName = JOB_FN[job.job_key];
  if (!fnName) {
    return { job_key: job.job_key, ok: false, error: "no_handler", duration_ms: 0, status: "skipped", retries: 0 };
  }
  const cfg = (job.config ?? {}) as Record<string, unknown>;
  const timeoutMs = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, Math.min(3, Number(cfg.max_retries ?? (dryRun ? 0 : 1))));
  const startedAt = Date.now();

  let attempt = 0;
  let lastErr: string | null = null;
  let lastStatus: string = "failed";
  let lastData: unknown = null;

  while (attempt <= maxRetries) {
    try {
      const { data, error } = await runWithTimeout(
        supabase.functions.invoke(fnName, {
          body: { triggered_by: triggeredBy, job_key: job.job_key, dry_run: dryRun, attempt },
        }),
        timeoutMs,
      );
      if (error) throw error;
      lastData = data;
      lastStatus = "success";
      lastErr = null;
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastErr = msg;
      lastStatus = msg.startsWith("timeout") ? "timeout" : "failed";
      // do not retry on timeouts (likely deterministic), retry only transient failures
      if (lastStatus === "timeout" || attempt >= maxRetries) break;
      // exponential backoff: 1s, 4s, 9s
      const backoffMs = Math.min(9_000, 1_000 * Math.pow(attempt + 1, 2));
      await new Promise((r) => setTimeout(r, backoffMs));
      attempt++;
    }
  }

  const duration = Date.now() - startedAt;
  const ok = lastStatus === "success";

  if (!dryRun) {
    await completeRun(supabase, job.job_key, ok, ok ? null : lastErr, ok ? ((lastData ?? {}) as Record<string, unknown>) : {}, duration, lastStatus, triggeredBy);
    // Best-effort: stamp retry_count on most recent run row
    if (attempt > 0) {
      const { data: lastRun } = await supabase
        .from("automation_runs")
        .select("id")
        .eq("job_key", job.job_key)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRun?.id) {
        await supabase.from("automation_runs").update({ retry_count: attempt }).eq("id", lastRun.id);
      }
    }
  }

  return {
    job_key: job.job_key,
    ok,
    error: ok ? undefined : (lastErr ?? undefined),
    duration_ms: duration,
    status: lastStatus,
    output: lastData,
    retries: attempt,
  };
}

/** Run promises with a concurrency cap. */
async function pMap<T, R>(items: T[], cap: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(cap, items.length) }, worker));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let manualJobKey: string | null = null;
  let dryRun = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.job_key === "string") manualJobKey = body.job_key;
      if (body?.dry_run === true) dryRun = true;
    }
  } catch { /* ignore */ }

  const triggeredBy = manualJobKey ? "manual" : dryRun ? "dry_run" : "cron";

  // global kill switch (bypassed for manual + dry-run)
  const { data: settings } = await supabase
    .from("automation_settings").select("enabled, paused_reason").eq("id", true).maybeSingle();
  if (!settings?.enabled && !manualJobKey && !dryRun) {
    return new Response(JSON.stringify({ skipped: "global_off", reason: settings?.paused_reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: jobs } = await supabase
    .from("automation_jobs")
    .select("job_key, enabled, schedule, trigger_type, last_run_at, config");

  const now = new Date();
  const candidates = ((jobs ?? []) as Job[]).filter((j) => {
    if (manualJobKey) return j.job_key === manualJobKey;
    if (!j.enabled) return false;
    if (j.trigger_type !== "cron") return false;
    if (!JOB_FN[j.job_key]) return false;
    return isDue(j.schedule, j.last_run_at, now);
  });

  // global concurrency cap (settings.config not yet wired → fixed default)
  const results = await pMap(candidates, DEFAULT_CONCURRENCY, (j) => runJob(supabase, j, triggeredBy, dryRun));

  return new Response(
    JSON.stringify({
      ran: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      manual: manualJobKey,
      dry_run: dryRun,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
