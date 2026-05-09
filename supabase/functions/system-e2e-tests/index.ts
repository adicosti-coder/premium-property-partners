// Daily E2E system tests — runs voice agent simulate test + SEO smoke check.
// Logs results to e2e_test_runs and cron_run_log. Failed tests trigger admin
// notification with severity 'critical'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const t0 = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "system-e2e-tests", status: "started" });

  const { data: cfg } = await sb.from("system_health_thresholds").select("*").maybeSingle();
  const seoUrl: string = cfg?.e2e_seo_url || "https://www.realtrust.ro/";

  // ── Voice E2E (simulate mode) ──────────────────────────────────────────
  const voiceStart = Date.now();
  let voicePassed = false;
  let voiceDetails: any = {};
  let voiceErr: string | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-e2e-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
      body: JSON.stringify({ mode: "simulate" }),
    });
    voiceDetails = await r.json().catch(() => ({}));
    voicePassed = r.ok && (voiceDetails?.success !== false) && (voiceDetails?.checks?.every?.((c: any) => c.passed) ?? r.ok);
    if (!voicePassed) voiceErr = voiceDetails?.error || "Voice checks failed";
  } catch (e: any) {
    voiceErr = e?.message || String(e);
  }
  const voiceDuration = Date.now() - voiceStart;
  await sb.from("e2e_test_runs").insert({
    test_type: "voice",
    status: voicePassed ? "passed" : "critical",
    duration_ms: voiceDuration,
    details: voiceDetails,
    error_message: voiceErr,
  });

  // ── SEO smoke test (audit one URL) ─────────────────────────────────────
  const seoStart = Date.now();
  let seoPassed = false;
  let seoDetails: any = {};
  let seoErr: string | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/seo-ai-optimizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
      body: JSON.stringify({ url: seoUrl, language: "ro" }),
    });
    seoDetails = await r.json().catch(() => ({}));
    seoPassed = r.ok && Boolean(seoDetails?.audit?.overall_score ?? seoDetails?.audit);
    if (!seoPassed) seoErr = seoDetails?.error || `HTTP ${r.status}`;
  } catch (e: any) {
    seoErr = e?.message || String(e);
  }
  const seoDuration = Date.now() - seoStart;
  await sb.from("e2e_test_runs").insert({
    test_type: "seo",
    status: seoPassed ? "passed" : "failed",
    duration_ms: seoDuration,
    details: { url: seoUrl, score: seoDetails?.audit?.overall_score },
    error_message: seoErr,
  });

  // Notify admins on any failure
  if (!voicePassed || !seoPassed) {
    const failures: string[] = [];
    if (!voicePassed) failures.push(`Voice: ${voiceErr || "fail"}`);
    if (!seoPassed) failures.push(`SEO: ${seoErr || "fail"}`);
    await sb.from("admin_audit_log").insert({
      action: "e2e_test_failure",
      actor_label: "system-e2e-tests",
      entity_type: "e2e_test_runs",
      severity: voicePassed ? "warning" : "error",
      details: { voice: { passed: voicePassed, err: voiceErr }, seo: { passed: seoPassed, err: seoErr } },
    });
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await sb.from("user_notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        title: voicePassed ? "⚠️ Test E2E SEO eșuat" : "🚨 Test E2E CRITIC",
        message: failures.join(" | "),
        type: voicePassed ? "warning" : "error",
        action_url: "/admin/system-health",
        action_label: "Vezi dashboard",
      })));
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: "system-e2e-tests", status: "success",
    duration_ms: Date.now() - t0,
    details: { voice_passed: voicePassed, seo_passed: seoPassed },
  });

  return new Response(JSON.stringify({
    ok: true, voice: { passed: voicePassed, duration_ms: voiceDuration, error: voiceErr },
    seo: { passed: seoPassed, duration_ms: seoDuration, error: seoErr },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
