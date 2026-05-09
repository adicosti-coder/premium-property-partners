// Voice Latency Monitor — checks last completed Andrei calls; alerts when
// 3 consecutive calls exceed 1500ms average TTS latency.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_THRESHOLD_MS = 1500;
const DEFAULT_STREAK = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const t0 = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "voice-latency-monitor", status: "started" });

  // Last 5 completed calls with measurable latency
  const { data: calls } = await sb
    .from("voice_call_sessions")
    .select("id, started_at, tts_latency_ms_avg, status")
    .not("tts_latency_ms_avg", "is", null)
    .order("started_at", { ascending: false })
    .limit(5);

  const last3 = (calls || []).slice(0, STREAK_REQUIRED);
  const breached = last3.length === STREAK_REQUIRED && last3.every((c: any) => (c.tts_latency_ms_avg ?? 0) > THRESHOLD_MS);

  let alertId: number | null = null;

  if (breached) {
    const avg = Math.round(last3.reduce((s: number, c: any) => s + c.tts_latency_ms_avg, 0) / last3.length);

    // Avoid duplicate alerts in last 30min
    const { data: recent } = await sb
      .from("voice_latency_alerts")
      .select("id")
      .gt("triggered_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .limit(1);

    if (!recent || recent.length === 0) {
      const { data: inserted } = await sb.from("voice_latency_alerts").insert({
        avg_latency_ms: avg,
        consecutive_calls: STREAK_REQUIRED,
        call_session_ids: last3.map((c: any) => c.id),
        details: { threshold_ms: THRESHOLD_MS, samples: last3 },
      }).select("id").single();
      alertId = inserted?.id ?? null;

      await sb.from("admin_audit_log").insert({
        action: "voice_latency_breach",
        actor_label: "voice-latency-monitor",
        entity_type: "voice_call_sessions",
        severity: "error",
        details: { avg_latency_ms: avg, threshold_ms: THRESHOLD_MS, calls: last3.map((c: any) => c.id) },
      });

      const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await sb.from("user_notifications").insert(admins.map((a: any) => ({
          user_id: a.user_id,
          title: "🚨 Latență Andrei depășită",
          message: `Ultimele ${STREAK_REQUIRED} apeluri au avut o latență medie TTS de ${avg}ms (>${THRESHOLD_MS}ms). Verifică Voice Agent.`,
          type: "error",
          action_url: "/admin",
          action_label: "Vezi apelurile",
        })));
      }
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: "voice-latency-monitor",
    status: "success",
    duration_ms: Date.now() - t0,
    details: { breached, samples: last3.length, alert_id: alertId },
  });

  return new Response(JSON.stringify({ ok: true, breached, samples: last3, alert_id: alertId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
