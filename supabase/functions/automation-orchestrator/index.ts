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
): Promise<{ job_key: string; ok: boolean; error?: string; duration_ms: number; status: string; output?: unknown }> {
  const fnName = JOB_FN[job.job_key];
  if (!fnName) {
    return { job_key: job.job_key, ok: false, error: "no_handler", duration_ms: 0, status: "skipped" };
  }
  const cfg = (job.config ?? {}) as Record<string, unknown>;
  const timeoutMs = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();
  try {
    const { data, error } = await runWithTimeout(
      supabase.functions.invoke(fnName, {
        body: { triggered_by: triggeredBy, job_key: job.job_key, dry_run: dryRun },
      }),
      timeoutMs,
    );
    if (error) throw error;
    const duration = Date.now() - startedAt;
    if (!dryRun) {
      await supabase.rpc("automation_complete_run", {
        _job_key: job.job_key,
        _success: true,
        _payload: (data ?? {}) as Record<string, unknown>,
        _duration_ms: duration,
        _status: "success",
        _triggered_by: triggeredBy,
      });
    }
    return { job_key: job.job_key, ok: true, output: data, duration_ms: duration, status: "success" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const duration = Date.now() - startedAt;
    const status = msg.startsWith("timeout") ? "timeout" : "failed";
    if (!dryRun) {
      await supabase.rpc("automation_complete_run", {
        _job_key: job.job_key,
        _success: false,
        _error: msg.slice(0, 500),
        _duration_ms: duration,
        _status: status,
        _triggered_by: triggeredBy,
      });
    }
    return { job_key: job.job_key, ok: false, error: msg, duration_ms: duration, status };
  }
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
