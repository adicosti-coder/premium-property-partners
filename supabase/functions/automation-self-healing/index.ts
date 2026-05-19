// Automation Self-Healing & Self-Improvement
// Reads tunable thresholds from public.automation_settings.self_healing_config.
// Streams progress to public.automation_live_logs so the Admin "Live Logs" tab can tail it.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { Cron } from "npm:croner@8";

const TZ = "Europe/Bucharest";

type Cfg = {
  failure_disable_threshold: number;
  timeout_bump_ratio: number;
  timeout_ceiling_ms: number;
  default_timeout_ms: number;
  success_rate_low: number;
  success_rate_high: number;
  recent_runs_window: number;
  stale_threshold_minutes: number;
  retention_days: number;
};

const DEFAULTS: Cfg = {
  failure_disable_threshold: 5,
  timeout_bump_ratio: 1.25,
  timeout_ceiling_ms: 120_000,
  default_timeout_ms: 50_000,
  success_rate_low: 0.5,
  success_rate_high: 0.9,
  recent_runs_window: 20,
  stale_threshold_minutes: 120,
  retention_days: 30,
};

function mergeCfg(raw: unknown): Cfg {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (k: keyof Cfg) => {
    const v = Number(o[k as string]);
    return Number.isFinite(v) && v > 0 ? v : DEFAULTS[k];
  };
  return {
    failure_disable_threshold: num("failure_disable_threshold"),
    timeout_bump_ratio: num("timeout_bump_ratio"),
    timeout_ceiling_ms: num("timeout_ceiling_ms"),
    default_timeout_ms: num("default_timeout_ms"),
    success_rate_low: num("success_rate_low"),
    success_rate_high: num("success_rate_high"),
    recent_runs_window: num("recent_runs_window"),
    stale_threshold_minutes: num("stale_threshold_minutes"),
    retention_days: num("retention_days"),
  };
}

async function liveLog(
  supabase: ReturnType<typeof createClient>,
  level: "info" | "warning" | "error" | "success",
  message: string,
  details: Record<string, unknown> = {},
  jobKey: string | null = null,
) {
  try {
    await supabase.from("automation_live_logs").insert({
      source: "self_healing",
      level,
      message,
      details,
      job_key: jobKey,
    });
  } catch { /* never throw from logger */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Read dynamic config from automation_settings (admin-tunable)
  const { data: settings } = await supabase
    .from("automation_settings")
    .select("self_healing_config")
    .eq("id", true)
    .maybeSingle();
  const cfg = mergeCfg((settings as { self_healing_config?: unknown } | null)?.self_healing_config);

  await liveLog(supabase, "info", "Self-healing tick start", { cfg });

  // 1. retention cleanup
  const { data: cleanedRaw } = await supabase.rpc("automation_runs_cleanup", { _retention_days: cfg.retention_days });
  const cleaned = Number(cleanedRaw) || 0;
  // also clean up live logs (keep 48h)
  try { await supabase.rpc("automation_live_logs_cleanup", { _keep_hours: 48 }); } catch { /* optional */ }

  // 2. fetch enabled jobs
  const { data: jobs } = await supabase
    .from("automation_jobs")
    .select("job_key, schedule, trigger_type, enabled, last_run_at, consecutive_failures, config")
    .eq("enabled", true);

  const now = new Date();
  const stale: Array<{ job_key: string; missed_minutes: number }> = [];
  const autoDisabled: string[] = [];
  const tuned: Array<{ job_key: string; field: string; from: number; to: number }> = [];

  for (const j of jobs ?? []) {
    // -- (a) STALE detection (cron only)
    if (j.trigger_type === "cron" && j.schedule && j.schedule !== "event-driven") {
      try {
        const cron = new Cron(j.schedule, { timezone: TZ });
        const prev = cron.previousRun(now);
        if (prev) {
          const lastRun = j.last_run_at ? new Date(j.last_run_at) : null;
          if (!lastRun || lastRun.getTime() < prev.getTime()) {
            const missed = Math.round((now.getTime() - prev.getTime()) / 60000);
            if (missed >= cfg.stale_threshold_minutes) stale.push({ job_key: j.job_key, missed_minutes: missed });
          }
        }
      } catch { /* ignore parse */ }
    }

    // -- (b) AUTO-DISABLE on failure streak
    if ((j.consecutive_failures ?? 0) >= cfg.failure_disable_threshold) {
      const { error: updErr } = await supabase
        .from("automation_jobs")
        .update({ enabled: false, last_status: "disabled" })
        .eq("job_key", j.job_key);
      if (!updErr) {
        autoDisabled.push(j.job_key);
        await supabase.from("automation_anomalies").insert({
          job_key: j.job_key,
          severity: "critical",
          message: `Job auto-dezactivat după ${j.consecutive_failures} eșuări consecutive (self-healing).`,
          details: { consecutive_failures: j.consecutive_failures, action: "auto_disable", threshold: cfg.failure_disable_threshold },
        });
        await liveLog(supabase, "error", `Auto-disabled ${j.job_key} după ${j.consecutive_failures} eșuări`, { threshold: cfg.failure_disable_threshold }, j.job_key);
      }
      continue;
    }

    // -- (c) ADAPTIVE TUNING
    const { data: recent } = await supabase
      .from("automation_runs")
      .select("status, duration_ms")
      .eq("job_key", j.job_key)
      .order("started_at", { ascending: false })
      .limit(cfg.recent_runs_window);
    if (!recent || recent.length < 5) continue;

    const jcfg = (j.config ?? {}) as Record<string, unknown>;
    const currentTimeout = Number(jcfg.timeout_ms) > 0 ? Number(jcfg.timeout_ms) : cfg.default_timeout_ms;
    const successCount = recent.filter((r) => r.status === "success").length;
    const successRate = successCount / recent.length;
    const validDurations = recent.map((r) => Number(r.duration_ms || 0)).filter((d) => d > 0);
    const avgDuration = validDurations.length
      ? validDurations.reduce((s, d) => s + d, 0) / validDurations.length
      : 0;
    const timeoutCount = recent.filter((r) => r.status === "timeout").length;

    const newCfg: Record<string, unknown> = { ...jcfg };
    let changed = false;

    if (
      (timeoutCount >= 2 || (avgDuration > 0 && avgDuration > currentTimeout * 0.8)) &&
      currentTimeout < cfg.timeout_ceiling_ms
    ) {
      const next = Math.min(cfg.timeout_ceiling_ms, Math.round(currentTimeout * cfg.timeout_bump_ratio));
      if (next !== currentTimeout) {
        newCfg.timeout_ms = next;
        tuned.push({ job_key: j.job_key, field: "timeout_ms", from: currentTimeout, to: next });
        changed = true;
        await liveLog(supabase, "info", `Adaptive timeout ${j.job_key}: ${currentTimeout}→${next}ms`, { avg_duration_ms: Math.round(avgDuration), timeouts: timeoutCount }, j.job_key);
      }
    }

    const currentRetries = Number(jcfg.max_retries ?? 1);
    if (successRate < cfg.success_rate_low && currentRetries > 0) {
      newCfg.max_retries = 0;
      tuned.push({ job_key: j.job_key, field: "max_retries", from: currentRetries, to: 0 });
      changed = true;
      await liveLog(supabase, "warning", `Retry off ${j.job_key} (success ${(successRate * 100).toFixed(0)}%)`, { success_rate: successRate }, j.job_key);
    } else if (successRate > cfg.success_rate_high && currentRetries < 1) {
      newCfg.max_retries = 1;
      tuned.push({ job_key: j.job_key, field: "max_retries", from: currentRetries, to: 1 });
      changed = true;
      await liveLog(supabase, "success", `Retry restored ${j.job_key} (success ${(successRate * 100).toFixed(0)}%)`, { success_rate: successRate }, j.job_key);
    }

    if (changed) {
      await supabase.from("automation_jobs").update({ config: newCfg }).eq("job_key", j.job_key);
    }
  }

  // 3. stale anomalies (deduplicated per 24h)
  let staleInserted = 0;
  for (const s of stale) {
    if (autoDisabled.includes(s.job_key)) continue;
    const { data: existing } = await supabase
      .from("automation_anomalies")
      .select("id")
      .eq("job_key", s.job_key)
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(1);
    if (existing && existing.length > 0) continue;
    await supabase.from("automation_anomalies").insert({
      job_key: s.job_key,
      severity: "warning",
      message: `Job stale: ratat de ${s.missed_minutes} min față de scheduled`,
      details: { missed_minutes: s.missed_minutes, threshold: cfg.stale_threshold_minutes },
    });
    await liveLog(supabase, "warning", `Stale ${s.job_key}: ratat de ${s.missed_minutes} min`, { threshold: cfg.stale_threshold_minutes }, s.job_key);
    staleInserted++;
  }

  await liveLog(supabase, "success", "Self-healing tick complete", {
    retention_deleted: cleaned,
    stale_detected: stale.length,
    anomalies_inserted: staleInserted,
    auto_disabled: autoDisabled.length,
    tuned: tuned.length,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      cfg,
      retention_deleted: cleaned,
      stale_detected: stale.length,
      anomalies_inserted: staleInserted,
      auto_disabled: autoDisabled,
      tuned,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
