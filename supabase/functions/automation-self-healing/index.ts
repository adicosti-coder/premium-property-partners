// Automation Self-Healing & Self-Improvement
// 1. Retention cleanup pe automation_runs (30 zile)
// 2. Detectează joburi stale (>120 min după ultimul tick scheduled) → anomalies (warning)
// 3. AUTO-DISABLE joburile cu ≥5 eșuări consecutive → anomaly critical + last_status='disabled'
// 4. ADAPTIVE TUNING: dacă avg duration > 80% din timeout_ms curent → bump timeout cu 25%
//    (max 120s). Dacă rata de succes < 50% pe ultimele 20 rulaje → reduce max_retries la 0
//    pentru a evita "amplificarea" eșecurilor.
// 5. AUTO-RECOVERY: dacă un job a fost auto-disabled și are 24h fără rulări noi, lăsăm anomaly-ul
//    deschis pentru admin (nu re-enable automat fără confirmare).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { Cron } from "npm:croner@8";

const TZ = "Europe/Bucharest";
const FAILURE_DISABLE_THRESHOLD = 5;
const TIMEOUT_CEILING_MS = 120_000;
const TIMEOUT_BUMP_RATIO = 1.25;
const DEFAULT_TIMEOUT_MS = 50_000;
const RECENT_RUNS_WINDOW = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. retention cleanup (30 zile)
  const { data: cleanedRaw } = await supabase.rpc("automation_runs_cleanup", { _retention_days: 30 });
  const cleaned = Number(cleanedRaw) || 0;

  // 2. detectează joburi stale + 3. auto-disable + 4. adaptive tuning
  const { data: jobs } = await supabase
    .from("automation_jobs")
    .select("job_key, schedule, trigger_type, enabled, last_run_at, consecutive_failures, config")
    .eq("enabled", true);

  const now = new Date();
  const stale: Array<{ job_key: string; missed_minutes: number }> = [];
  const autoDisabled: string[] = [];
  const tuned: Array<{ job_key: string; field: string; from: number; to: number }> = [];

  for (const j of jobs ?? []) {
    // -- (a) STALE detection (doar cron joburi)
    if (j.trigger_type === "cron" && j.schedule && j.schedule !== "event-driven") {
      try {
        const cron = new Cron(j.schedule, { timezone: TZ });
        const prev = cron.previousRun(now);
        if (prev) {
          const lastRun = j.last_run_at ? new Date(j.last_run_at) : null;
          if (!lastRun || lastRun.getTime() < prev.getTime()) {
            const missed = Math.round((now.getTime() - prev.getTime()) / 60000);
            if (missed >= 120) stale.push({ job_key: j.job_key, missed_minutes: missed });
          }
        }
      } catch { /* ignore parse */ }
    }

    // -- (b) AUTO-DISABLE pe streak eșuări
    if ((j.consecutive_failures ?? 0) >= FAILURE_DISABLE_THRESHOLD) {
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
          details: { consecutive_failures: j.consecutive_failures, action: "auto_disable" },
        });
      }
      continue; // sărim adaptive tuning pe joburi tocmai oprite
    }

    // -- (c) ADAPTIVE TUNING pe baza ultimelor rulări
    const { data: recent } = await supabase
      .from("automation_runs")
      .select("status, duration_ms")
      .eq("job_key", j.job_key)
      .order("started_at", { ascending: false })
      .limit(RECENT_RUNS_WINDOW);
    if (!recent || recent.length < 5) continue;

    const cfg = (j.config ?? {}) as Record<string, unknown>;
    const currentTimeout = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : DEFAULT_TIMEOUT_MS;
    const successCount = recent.filter((r) => r.status === "success").length;
    const successRate = successCount / recent.length;
    const validDurations = recent.map((r) => Number(r.duration_ms || 0)).filter((d) => d > 0);
    const avgDuration = validDurations.length
      ? validDurations.reduce((s, d) => s + d, 0) / validDurations.length
      : 0;
    const timeoutCount = recent.filter((r) => r.status === "timeout").length;

    const newCfg: Record<string, unknown> = { ...cfg };
    let changed = false;

    if (
      (timeoutCount >= 2 || (avgDuration > 0 && avgDuration > currentTimeout * 0.8)) &&
      currentTimeout < TIMEOUT_CEILING_MS
    ) {
      const next = Math.min(TIMEOUT_CEILING_MS, Math.round(currentTimeout * TIMEOUT_BUMP_RATIO));
      if (next !== currentTimeout) {
        newCfg.timeout_ms = next;
        tuned.push({ job_key: j.job_key, field: "timeout_ms", from: currentTimeout, to: next });
        changed = true;
      }
    }

    const currentRetries = Number(cfg.max_retries ?? 1);
    if (successRate < 0.5 && currentRetries > 0) {
      newCfg.max_retries = 0;
      tuned.push({ job_key: j.job_key, field: "max_retries", from: currentRetries, to: 0 });
      changed = true;
    } else if (successRate > 0.9 && currentRetries < 1) {
      newCfg.max_retries = 1;
      tuned.push({ job_key: j.job_key, field: "max_retries", from: currentRetries, to: 1 });
      changed = true;
    }

    if (changed) {
      await supabase.from("automation_jobs").update({ config: newCfg }).eq("job_key", j.job_key);
    }
  }

  // 5. inserează anomalies pentru stale (deduplicat pe job_key în ultimele 24h)
  let staleInserted = 0;
  for (const s of stale) {
    if (autoDisabled.includes(s.job_key)) continue; // deja semnalat critic
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
      details: { missed_minutes: s.missed_minutes },
    });
    staleInserted++;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      retention_deleted: cleaned,
      stale_detected: stale.length,
      anomalies_inserted: staleInserted,
      auto_disabled: autoDisabled,
      tuned,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
