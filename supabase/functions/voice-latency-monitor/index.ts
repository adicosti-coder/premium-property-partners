// Voice Latency Monitor — checks last completed Andrei calls; alerts when
// 3 consecutive RECENT calls (last 24h) exceed threshold avg TTS latency.
// Dedupes by call_session_ids set so the same stale calls never re-alert.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_THRESHOLD_MS = 1500;
const DEFAULT_STREAK = 3;
const RECENT_WINDOW_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const t0 = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "voice-latency-monitor", status: "started" });

  const { data: cfg } = await sb.from("system_health_thresholds").select("voice_latency_ms_threshold,voice_streak_required").maybeSingle();
  const THRESHOLD_MS = cfg?.voice_latency_ms_threshold ?? DEFAULT_THRESHOLD_MS;
  const STREAK_REQUIRED = cfg?.voice_streak_required ?? DEFAULT_STREAK;

  // Last completed calls with measurable latency, RESTRICTED to recent window
  // to prevent re-alerting on stale historical calls.
  const sinceIso = new Date(Date.now() - RECENT_WINDOW_HOURS * 3600_000).toISOString();
  const { data: calls } = await sb
    .from("voice_call_sessions")
    .select("id, started_at, tts_latency_ms_avg, status")
    .not("tts_latency_ms_avg", "is", null)
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false })
    .limit(5);

  const last3 = (calls || []).slice(0, STREAK_REQUIRED);
  const breached = last3.length === STREAK_REQUIRED && last3.every((c: any) => (c.tts_latency_ms_avg ?? 0) > THRESHOLD_MS);

  let alertId: number | null = null;
  let skippedReason: string | null = null;

  if (breached) {
    const avg = Math.round(last3.reduce((s: number, c: any) => s + c.tts_latency_ms_avg, 0) / last3.length);
    const currentIds = last3.map((c: any) => c.id).sort();
    const currentKey = currentIds.join(",");

    // Dedupe: skip if we've already alerted on the exact same set of calls (ever),
    // or if any latency alert was raised in last 6h.
    const { data: recent } = await sb
      .from("voice_latency_alerts")
      .select("id, call_session_ids, triggered_at")
      .order("triggered_at", { ascending: false })
      .limit(20);

    const sameSet = (recent || []).find((r: any) => {
      const ids = Array.isArray(r.call_session_ids) ? [...r.call_session_ids].sort().join(",") : "";
      return ids === currentKey;
    });
    const within6h = (recent || []).some((r: any) =>
      new Date(r.triggered_at).getTime() > Date.now() - 6 * 3600_000
    );

    if (sameSet) {
      skippedReason = "duplicate_call_set";
    } else if (within6h) {
      skippedReason = "cooldown_6h";
    } else {
      const { data: inserted } = await sb.from("voice_latency_alerts").insert({
        avg_latency_ms: avg,
        consecutive_calls: STREAK_REQUIRED,
        call_session_ids: currentIds,
        details: { threshold_ms: THRESHOLD_MS, samples: last3 },
      }).select("id").single();
      alertId = inserted?.id ?? null;

      await sb.from("admin_audit_log").insert({
        action: "voice_latency_breach",
        actor_label: "voice-latency-monitor",
        entity_type: "voice_call_sessions",
        severity: "error",
        details: { avg_latency_ms: avg, threshold_ms: THRESHOLD_MS, calls: currentIds },
      });

      // Only notify admins who don't already have an unread latency notification
      const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        const adminIds = admins.map((a: any) => a.user_id);
        const { data: existingUnread } = await sb
          .from("user_notifications")
          .select("user_id")
          .in("user_id", adminIds)
          .eq("title", "🚨 Latență Andrei depășită")
          .is("read_at", null);
        const alreadyNotified = new Set((existingUnread || []).map((n: any) => n.user_id));
        const toNotify = adminIds.filter((id: string) => !alreadyNotified.has(id));
        if (toNotify.length > 0) {
          await sb.from("user_notifications").insert(toNotify.map((user_id: string) => ({
            user_id,
            title: "🚨 Latență Andrei depășită",
            message: `Ultimele ${STREAK_REQUIRED} apeluri au avut o latență medie TTS de ${avg}ms (>${THRESHOLD_MS}ms). Verifică Voice Agent.`,
            type: "error",
            action_url: "/admin",
            action_label: "Vezi apelurile",
          })));
        }
      }
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: "voice-latency-monitor",
    status: "success",
    duration_ms: Date.now() - t0,
    details: { breached, samples: last3.length, alert_id: alertId, skipped: skippedReason, window_hours: RECENT_WINDOW_HOURS },
  });

  return new Response(JSON.stringify({ ok: true, breached, samples: last3, alert_id: alertId, skipped: skippedReason }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
