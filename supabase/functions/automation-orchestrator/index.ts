import { requireAdmin } from "../_shared/adminAuth.ts";
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
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_LEASE_TTL_MS = 180_000;
const DEFAULT_BACKOFF_JITTER_MS = 500;

type OrchCfg = {
  concurrency: number;
  default_timeout_ms: number;
  default_max_retries: number;
  retry_on_timeout: boolean;
  lease_ttl_ms: number;
  backoff_jitter_ms: number;
};

function mergeOrchCfg(raw: unknown): OrchCfg {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const numPos = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    concurrency: Math.max(1, Math.min(16, numPos(o.concurrency, DEFAULT_CONCURRENCY))),
    default_timeout_ms: Math.max(1_000, Math.min(120_000, numPos(o.default_timeout_ms, DEFAULT_TIMEOUT_MS))),
    default_max_retries: Math.max(0, Math.min(3, Number(o.default_max_retries ?? DEFAULT_MAX_RETRIES))),
    retry_on_timeout: o.retry_on_timeout === true,
    lease_ttl_ms: Math.max(5_000, Math.min(600_000, numPos(o.lease_ttl_ms, DEFAULT_LEASE_TTL_MS))),
    backoff_jitter_ms: Math.max(0, Math.min(5_000, Number(o.backoff_jitter_ms ?? DEFAULT_BACKOFF_JITTER_MS))),
  };
}

// job_key -> edge function name
const JOB_FN: Record<string, string> = {
  // Lead automations
  "lead.auto_classify_agency": "lead-auto-classify-agency",
  "lead.auto_dedup": "lead-auto-dedup",
  "lead.auto_archive_callers": "voice-caller-archive-stale",
  "lead.auto_twilio_lookup": "phone-lookup-enrich",
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
  // Listing import pipeline (auto-publish + self-heal + continuous learning)
  "auto-publish-listings": "auto-publish-listings",
  "listing-import-self-heal": "listing-import-self-heal",
  "listing.compile_prompt": "listing-import-compile-prompt",
  "listing.learn": "listing-import-learn",
};

// Per-job body overrides for manual Run (event-driven jobs that need params).
const JOB_BODY: Record<string, Record<string, unknown>> = {
  "lead.auto_twilio_lookup": { mode: "batch", limit: 50 },
  // Keep auto-publish below the edge CPU limit: smaller batches per orchestrator tick
  "auto-publish-listings": { batch_size: 3 },
};

// Event-driven jobs declanșate automat de triggere DB / cod aplicație.
// Manual "Run" devine no-op (returnează success cu notă informativă),
// pentru a evita eroarea "no_handler" în UI.
const NOOP_JOB = new Set([
  "system.orchestrator",                  // chiar acesta este orchestratorul
  "system.self_healing_dummy",            // job virtual de test self-healing
  "lead.auto_recall_no_answer",           // declanșat de voice-agent reconcile
  "lead.auto_call_rate_limit",            // aplicat inline la dial
  "seo.auto_audit_on_update",             // trigger DB pe properties/blog/complex
  "seo.auto_indexnow_push",               // emis inline la publicare conținut
  "blog.cta_dedup_server",                // trigger Postgres pe cta_analytics
  "ai.memory_cross_function",             // agregat inline de visitor-memory
  "prospect.predictive_score_on_insert",  // trigger DB la inserare prospect
  "listing.learn",                        // declanșat inline din FastReview după aprobare/respingere
]);

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

/** Invoke an edge function with hard AbortController-driven timeout. */
async function invokeFnWithAbort(
  fnName: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ data: unknown; error: null } | { data: null; error: { message: string; status?: number } }> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fnName}`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    if (!res.ok) {
      const msg = typeof parsed === "object" && parsed && "error" in (parsed as Record<string, unknown>)
        ? String((parsed as Record<string, unknown>).error)
        : (typeof parsed === "string" ? parsed.slice(0, 300) : `HTTP ${res.status}`);
      return { data: null, error: { message: `${res.status} ${msg}`, status: res.status } };
    }
    return { data: parsed, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (ctrl.signal.aborted || /aborted|timeout/i.test(msg)) {
      return { data: null, error: { message: `timeout after ${timeoutMs}ms` } };
    }
    return { data: null, error: { message: msg } };
  } finally {
    clearTimeout(to);
  }
}

async function runJob(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  triggeredBy: string,
  dryRun: boolean,
  orchCfg: OrchCfg,
): Promise<{ job_key: string; ok: boolean; error?: string; duration_ms: number; status: string; output?: unknown; retries: number; skipped?: boolean }> {
  // Inline + no-op short paths (no lease, no retry, no external invoke).
  if (INLINE_JOB.has(job.job_key)) {
    const startedAt = Date.now();
    try {
      const output = job.job_key === "lead.auto_archive_callers"
        ? await runArchiveStaleCallers(supabase, dryRun)
        : await runCanonicalConflictScan(dryRun);
      const duration = Date.now() - startedAt;
      if (!dryRun) await finishRun(supabase, null, job.job_key, true, null, output, duration, "success", 0);
      return { job_key: job.job_key, ok: true, duration_ms: duration, status: "success", output, retries: 0 };
    } catch (e) {
      const duration = Date.now() - startedAt;
      const msg = errorMessage(e);
      if (!dryRun) await finishRun(supabase, null, job.job_key, false, msg, {}, duration, "failed", 0);
      return { job_key: job.job_key, ok: false, error: msg, duration_ms: duration, status: "failed", retries: 0 };
    }
  }

  if (NOOP_JOB.has(job.job_key)) {
    const startedAt = Date.now();
    const output = { noop: true, reason: "event-driven; declanșat automat de triggere DB / cod aplicație" };
    const duration = Date.now() - startedAt;
    if (!dryRun) await finishRun(supabase, null, job.job_key, true, null, output, duration, "success", 0);
    return { job_key: job.job_key, ok: true, duration_ms: duration, status: "success", output, retries: 0 };
  }

  const fnName = JOB_FN[job.job_key];
  if (!fnName) {
    return { job_key: job.job_key, ok: false, error: "no_handler", duration_ms: 0, status: "skipped", retries: 0 };
  }

  const cfg = (job.config ?? {}) as Record<string, unknown>;
  const timeoutMs = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : orchCfg.default_timeout_ms;
  const maxRetries = Math.max(0, Math.min(3, Number(cfg.max_retries ?? (dryRun ? 0 : orchCfg.default_max_retries))));
  const retryOnTimeout = cfg.retry_on_timeout === true || orchCfg.retry_on_timeout;

  // Acquire run lease (skip if another orchestrator tick is still running this job).
  let runId: string | null = null;
  if (!dryRun) {
    const { data: leaseId, error: leaseErr } = await supabase.rpc("automation_acquire_run_lease", {
      _job_key: job.job_key,
      _triggered_by: triggeredBy,
      _lease_ttl_ms: orchCfg.lease_ttl_ms,
    });
    if (leaseErr) {
      return { job_key: job.job_key, ok: false, error: `lease_error: ${leaseErr.message}`, duration_ms: 0, status: "failed", retries: 0 };
    }
    if (!leaseId) {
      return { job_key: job.job_key, ok: false, error: "already_running", duration_ms: 0, status: "skipped", retries: 0, skipped: true };
    }
    runId = leaseId as string;
  }

  const startedAt = Date.now();
  let attempt = 0;
  let lastErr: string | null = null;
  let lastStatus: string = "failed";
  let lastData: unknown = null;
  const extraBody = JOB_BODY[job.job_key] ?? {};

  while (attempt <= maxRetries) {
    const { data, error } = await invokeFnWithAbort(
      fnName,
      { triggered_by: triggeredBy, job_key: job.job_key, dry_run: dryRun, attempt, ...extraBody },
      timeoutMs,
    );
    if (!error) {
      lastData = data;
      lastStatus = "success";
      lastErr = null;
      break;
    }
    lastErr = error.message;
    lastStatus = /^timeout/i.test(error.message) ? "timeout" : "failed";
    if (attempt >= maxRetries) break;
    if (lastStatus === "timeout" && !retryOnTimeout) break;
    // exponential backoff with jitter: ~1s, ~4s, ~9s ± jitter
    const base = Math.min(9_000, 1_000 * Math.pow(attempt + 1, 2));
    const jitter = orchCfg.backoff_jitter_ms > 0
      ? Math.floor((Math.random() * 2 - 1) * orchCfg.backoff_jitter_ms)
      : 0;
    await new Promise((r) => setTimeout(r, Math.max(250, base + jitter)));
    attempt++;
  }

  const duration = Date.now() - startedAt;
  const ok = lastStatus === "success";

  if (!dryRun) {
    await finishRun(
      supabase,
      runId,
      job.job_key,
      ok,
      ok ? null : lastErr,
      ok ? ((lastData ?? {}) as Record<string, unknown>) : {},
      duration,
      lastStatus,
      attempt,
    );
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

async function finishRun(
  supabase: ReturnType<typeof createClient>,
  runId: string | null,
  jobKey: string,
  success: boolean,
  error: string | null,
  payload: Record<string, unknown>,
  durationMs: number,
  status: string,
  retryCount: number,
) {
  await supabase.rpc("automation_finish_run", {
    _run_id: runId,
    _job_key: jobKey,
    _success: success,
    _payload: payload,
    _error: success ? null : (error ?? "").slice(0, 500),
    _duration_ms: durationMs,
    _status: status,
    _retry_count: retryCount,
  });
}


function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const anyErr = e as Record<string, unknown>;
    return String(anyErr.message || anyErr.error_description || anyErr.details || anyErr.hint || JSON.stringify(anyErr));
  }
  return String(e);
}

async function runArchiveStaleCallers(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  const cutoff = new Date(Date.now() - 6 * 30 * 86400_000).toISOString();
  const { data: candidates, error } = await supabase
    .from("voice_caller_profiles")
    .select("id, phone_normalized")
    .is("archived_at", null)
    .or(`last_call_at.lt.${cutoff},and(last_call_at.is.null,created_at.lt.${cutoff})`)
    .limit(100);
  if (error) throw error;

  const rows = candidates ?? [];
  if (!dryRun && rows.length > 0) {
    const ids = rows.map((r: any) => r.id);
    const { error: updateError } = await supabase
      .from("voice_caller_profiles")
      .update({ archived_at: new Date().toISOString() })
      .in("id", ids);
    if (updateError) throw updateError;
    await supabase.from("voice_caller_audit_log").insert(rows.map((r: any) => ({
      profile_id: r.id,
      phone_normalized: r.phone_normalized,
      action: "auto_archive",
      actor_label: "cron",
      details: { reason: "inactive_6_months", source: "automation_orchestrator" },
    })));
  }

  return { archived: dryRun ? 0 : rows.length, would_archive: dryRun ? rows.length : undefined, cutoff };
}

async function runCanonicalConflictScan(dryRun: boolean) {
  const sitemapUrl = "https://www.realtrust.ro/sitemap.xml";
  const res = await fetch(sitemapUrl, { headers: { "User-Agent": "RealTrust canonical scanner" } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  let urls = Array.from(xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)).map((m) => m[1]);
  if (urls.length === 0) {
    const childSitemaps = Array.from(xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/g)).map((m) => m[1]).slice(0, 5);
    const childXml = await Promise.all(childSitemaps.map(async (childUrl) => {
      try {
        const child = await fetch(childUrl, { headers: { "User-Agent": "RealTrust canonical scanner" } });
        return child.ok ? await child.text() : "";
      } catch {
        return "";
      }
    }));
    urls = childXml.flatMap((doc) => Array.from(doc.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)).map((m) => m[1]));
  }
  urls = Array.from(new Set(urls)).slice(0, 500);
  const conflicts = urls.flatMap((url) => {
    const u = new URL(url);
    const issues: string[] = [];
    if (u.search) issues.push("query_in_sitemap_url");
    if (u.hash) issues.push("hash_in_sitemap_url");
    if (u.pathname !== "/" && u.pathname.endsWith("/")) issues.push("trailing_slash");
    if (!["realtrust.ro", "www.realtrust.ro"].includes(u.hostname)) issues.push("unexpected_host");
    return issues.length ? [{ url, issues }] : [];
  });

  return { dry_run: dryRun, checked: urls.length, conflicts: conflicts.length, details: conflicts.slice(0, 25) };
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
  const __auth = await requireAdmin(req, corsHeaders);
  if (!__auth.ok) return __auth.response!;


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let manualJobKey: string | null = null;
  let dryRun = false;
  let runAll = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.job_key === "string") manualJobKey = body.job_key;
      if (body?.dry_run === true) dryRun = true;
      if (body?.run_all === true) runAll = true;
    }
  } catch { /* ignore */ }

  const triggeredBy = runAll ? "manual_run_all" : manualJobKey ? "manual" : dryRun ? "dry_run" : "cron";

  const liveLog = async (level: "info" | "warning" | "error" | "success", message: string, details: Record<string, unknown> = {}, jobKey: string | null = null) => {
    try {
      await supabase.from("automation_live_logs").insert({ source: "orchestrator", level, message, details, job_key: jobKey });
    } catch { /* never throw */ }
  };

  // global kill switch + orchestrator config (bypassed for manual + dry-run)
  const { data: settings } = await supabase
    .from("automation_settings")
    .select("enabled, paused_reason, orchestrator_config")
    .eq("id", true)
    .maybeSingle();
  if (!settings?.enabled && !manualJobKey && !dryRun && !runAll) {
    return new Response(JSON.stringify({ skipped: "global_off", reason: settings?.paused_reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const orchCfg = mergeOrchCfg((settings as { orchestrator_config?: unknown } | null)?.orchestrator_config);

  // Janitor: clear stale "running" rows (crashed orchestrator ticks) before evaluating leases.
  try {
    const { data: expired } = await supabase.rpc("automation_expire_stale_runs", { _lease_ttl_ms: orchCfg.lease_ttl_ms });
    if (Number(expired) > 0) {
      await liveLog("warning", `Expired ${expired} stale running rows (lease > ${orchCfg.lease_ttl_ms}ms)`, { expired });
    }
  } catch { /* best-effort */ }

  const { data: jobs } = await supabase
    .from("automation_jobs")
    .select("job_key, enabled, schedule, trigger_type, last_run_at, config");

  const now = new Date();
  const candidates = ((jobs ?? []) as Job[]).filter((j) => {
    if (manualJobKey) return j.job_key === manualJobKey;
    if (!j.enabled) return false;
    if (!JOB_FN[j.job_key] && !INLINE_JOB.has(j.job_key) && !NOOP_JOB.has(j.job_key)) return false;
    if (runAll) return true; // Run All include și joburile event-driven (manual trigger)
    if (j.trigger_type !== "cron") return false;
    return isDue(j.schedule, j.last_run_at, now);
  });

  if (runAll || manualJobKey) {
    await liveLog("info", runAll ? `Run All start: ${candidates.length} joburi` : `Manual run: ${manualJobKey}`, { triggered_by: triggeredBy, candidates: candidates.map((c) => c.job_key), orch_cfg: orchCfg });
  }

  // granular 401 logger – captures auth failures from invoked job functions
  const log401 = async (jobKey: string, fnName: string | undefined, errMsg: string) => {
    const ua = req.headers.get("user-agent") ?? "unknown";
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
    const url = fnName ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fnName}` : "(inline)";
    await liveLog(
      "error",
      `401 Unauthorized · ${jobKey}`,
      {
        kind: "auth_failure",
        url,
        function: fnName ?? null,
        triggered_by: triggeredBy,
        origin_ip: ip,
        user_agent: ua,
        reason: errMsg,
        hint: "Verifică verify_jwt în config.toml și validarea token-ului în funcția target.",
      },
      jobKey,
    );
  };

  const results = await pMap(candidates, orchCfg.concurrency, async (j) => {
    await liveLog("info", `▶ ${j.job_key}`, { triggered_by: triggeredBy }, j.job_key);
    const res = await runJob(supabase, j, triggeredBy, dryRun, orchCfg);
    if (res.skipped) {
      await liveLog("warning", `⏭ ${j.job_key} · already_running (lease held)`, { duration_ms: res.duration_ms }, j.job_key);
      return res;
    }
    // Detect 401 / Unauthorized in error message and log granular auth-failure entry
    if (!res.ok && res.error && /\b401\b|unauthor|invalid[_\s-]*jwt|missing[_\s-]*token|forbidden/i.test(res.error)) {
      await log401(j.job_key, JOB_FN[j.job_key], res.error);
    }
    await liveLog(
      res.ok ? "success" : (res.status === "timeout" ? "warning" : "error"),
      `${res.ok ? "✓" : "✗"} ${j.job_key} · ${res.status} · ${res.duration_ms}ms${res.retries ? ` · ↻${res.retries}` : ""}`,
      { status: res.status, duration_ms: res.duration_ms, retries: res.retries, error: res.error },
      j.job_key,
    );
    return res;
  });

  if (runAll || manualJobKey) {
    const okN = results.filter((r) => r.ok).length;
    await liveLog(results.length - okN > 0 ? "warning" : "success", `Run terminat: ${okN}/${results.length} OK`, { ok: okN, failed: results.length - okN });
  }

  return new Response(
    JSON.stringify({
      ran: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      manual: manualJobKey,
      dry_run: dryRun,
      run_all: runAll,
      orch_cfg: orchCfg,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
