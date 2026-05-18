// Automation Self-Healing
// Curăță runs vechi, detectează joburi "stale" (au ratat >2× intervalul scheduled)
// și inserează anomalies pentru admin. Invocat de orchestrator ca job normal.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { Cron } from "npm:croner@8";

const TZ = "Europe/Bucharest";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. retention cleanup (30 zile)
  const { data: cleanedRaw } = await supabase.rpc("automation_runs_cleanup", { _retention_days: 30 });
  const cleaned = Number(cleanedRaw) || 0;

  // 2. detectează joburi stale
  const { data: jobs } = await supabase
    .from("automation_jobs")
    .select("job_key, schedule, trigger_type, enabled, last_run_at")
    .eq("enabled", true)
    .eq("trigger_type", "cron");

  const now = new Date();
  const stale: Array<{ job_key: string; missed_minutes: number }> = [];

  for (const j of jobs ?? []) {
    if (!j.schedule || j.schedule === "event-driven") continue;
    try {
      const cron = new Cron(j.schedule, { timezone: TZ });
      const prev = cron.previousRun(now);
      if (!prev) continue;
      const lastRun = j.last_run_at ? new Date(j.last_run_at) : null;
      // dacă ultimul rulaj e cu >120 min în urma celui scheduled → stale
      if (!lastRun || lastRun.getTime() < prev.getTime() - 0) {
        const missed = Math.round((now.getTime() - prev.getTime()) / 60000);
        if (missed >= 120) stale.push({ job_key: j.job_key, missed_minutes: missed });
      }
    } catch { /* ignore */ }
  }

  // 3. inserează anomalies (deduplicat pe job_key în ultimele 24h)
  let inserted = 0;
  for (const s of stale) {
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
    inserted++;
  }

  return new Response(
    JSON.stringify({ ok: true, retention_deleted: cleaned, stale_detected: stale.length, anomalies_inserted: inserted }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
