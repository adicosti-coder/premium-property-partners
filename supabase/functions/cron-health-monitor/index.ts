import { requireAdmin } from "../_shared/adminAuth.ts";
// Cron Health Monitor — checks cron_job_registry vs cron_run_log;
// alerts admins when an expected job has skipped its window.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __auth = await requireAdmin(req, corsHeaders);
  if (!__auth.ok) return __auth.response!;


  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedAt = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "cron-health-monitor", status: "started" });

  const { data: jobs, error } = await sb.from("cron_job_registry").select("*").eq("is_active", true);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  const now = Date.now();
  const missed: any[] = [];

  for (const j of jobs || []) {
    const { data: lastRun } = await sb
      .from("cron_run_log")
      .select("started_at, status")
      .eq("job_name", j.job_name)
      .in("status", ["success", "started"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxGapMs = (j.expected_interval_minutes + j.grace_minutes) * 60_000;
    const lastRunMs = lastRun ? new Date(lastRun.started_at).getTime() : 0;
    const gap = now - lastRunMs;

    if (!lastRun || gap > maxGapMs) {
      missed.push({
        job: j.job_name,
        last_run_at: lastRun?.started_at ?? null,
        gap_minutes: Math.round(gap / 60000),
        expected_minutes: j.expected_interval_minutes,
      });

      // Throttle alerts: only re-alert every 6h
      const cool = j.last_alert_at ? now - new Date(j.last_alert_at).getTime() : Infinity;
      if (cool > 6 * 3600_000) {
        await sb.from("admin_audit_log").insert({
          action: "cron_job_missed",
          actor_label: "cron-health-monitor",
          entity_type: "cron_job",
          entity_id: j.job_name,
          severity: "warning",
          details: {
            last_run_at: lastRun?.started_at ?? null,
            gap_minutes: Math.round(gap / 60000),
            expected_interval_minutes: j.expected_interval_minutes,
          },
        });
        await sb.from("cron_job_registry").update({ last_alert_at: new Date().toISOString() }).eq("job_name", j.job_name);

        // Notify admins
        const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
        if (admins?.length) {
          await sb.from("user_notifications").insert(admins.map((a: any) => ({
            user_id: a.user_id,
            title: "⚠️ Job programat sărit",
            message: `Jobul "${j.job_name}" nu a rulat de ${Math.round(gap / 60000)} minute (așteptat: ${j.expected_interval_minutes} min).`,
            type: "warning",
            action_url: "/admin",
            action_label: "Vezi jurnalele",
          })));
        }
      }
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: "cron-health-monitor",
    status: "success",
    duration_ms: Date.now() - startedAt,
    details: { checked: jobs?.length ?? 0, missed_count: missed.length, missed },
  });

  return new Response(JSON.stringify({ ok: true, checked: jobs?.length, missed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
