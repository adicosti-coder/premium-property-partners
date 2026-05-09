// Daily E2E system tests — runs voice agent simulate test + SEO smoke check.
// Logs results to e2e_test_runs and cron_run_log. Failed tests trigger an
// automatic retry after 10 minutes; only after the retry also fails do we
// notify admins with severity 'critical'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const RETRY_DELAY_MS = 10 * 60 * 1000; // 10 minutes

async function runVoice(SUPABASE_URL: string, SERVICE_KEY: string) {
  const start = Date.now();
  let passed = false; let details: any = {}; let err: string | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-e2e-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
      body: JSON.stringify({ mode: "simulate" }),
    });
    details = await r.json().catch(() => ({}));
    passed = r.ok && (details?.success !== false) && (details?.checks?.every?.((c: any) => c.passed) ?? r.ok);
    if (!passed) err = details?.error || `HTTP ${r.status}: ${JSON.stringify(details).slice(0, 500)}`;
  } catch (e: any) {
    err = `${e?.name || "Error"}: ${e?.message || String(e)}\n${e?.stack || ""}`.slice(0, 2000);
  }
  return { passed, details, err, duration: Date.now() - start };
}

async function runSeo(SUPABASE_URL: string, SERVICE_KEY: string, seoUrl: string) {
  const start = Date.now();
  let passed = false; let details: any = {}; let err: string | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/seo-ai-optimizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
      body: JSON.stringify({ url: seoUrl, language: "ro" }),
    });
    details = await r.json().catch(() => ({}));
    passed = r.ok && Boolean(details?.audit?.overall_score ?? details?.audit);
    if (!passed) err = details?.error || `HTTP ${r.status}: ${JSON.stringify(details).slice(0, 500)}`;
  } catch (e: any) {
    err = `${e?.name || "Error"}: ${e?.message || String(e)}\n${e?.stack || ""}`.slice(0, 2000);
  }
  return { passed, details: { ...details, url: seoUrl }, err, duration: Date.now() - start };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const t0 = Date.now();

  // Optional retry mode: { retry_of: <e2e_test_run_id>, test_type: 'voice'|'seo' }
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const isRetry = Boolean(body?.retry_of && body?.test_type);

  await sb.from("cron_run_log").insert({
    job_name: isRetry ? "system-e2e-tests-retry" : "system-e2e-tests",
    status: "started",
  });

  const { data: cfg } = await sb.from("system_health_thresholds").select("*").maybeSingle();
  const seoUrl: string = cfg?.e2e_seo_url || "https://www.realtrust.ro/";

  // Helper: schedule a retry by inserting a placeholder record + invoking pg_net delay.
  // Simpler approach: inline setTimeout-style delay isn't available; use pg cron-less
  // self-call via net.http_post scheduled by setting retry_scheduled_at and relying on
  // cron-health-monitor or a direct delayed fetch inside this invocation isn't reliable.
  // We use waitUntil-style background dispatch with EdgeRuntime.waitUntil.
  const scheduleRetry = (testType: "voice" | "seo", parentId: number) => {
    const retryAt = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
    sb.from("e2e_test_runs").update({ retry_scheduled_at: retryAt }).eq("id", parentId).then(() => {});
    // @ts-ignore EdgeRuntime is a Deno deploy global
    const ert = (globalThis as any).EdgeRuntime;
    const delayed = (async () => {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      await fetch(`${SUPABASE_URL}/functions/v1/system-e2e-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
        body: JSON.stringify({ retry_of: parentId, test_type: testType }),
      }).catch(() => {});
    })();
    if (ert?.waitUntil) ert.waitUntil(delayed); else delayed.catch(() => {});
  };

  const notifyAdmins = async (label: string, msg: string, severity: "warning" | "error") => {
    await sb.from("admin_audit_log").insert({
      action: "e2e_test_failure", actor_label: "system-e2e-tests",
      entity_type: "e2e_test_runs", severity, details: { label, msg },
    });
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await sb.from("user_notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        title: severity === "error" ? "🚨 Test E2E CRITIC (după retry)" : "⚠️ Test E2E eșuat",
        message: msg, type: severity,
        action_url: "/admin/system-health", action_label: "Vezi dashboard",
      })));
    }
  };

  let voicePassed = true, seoPassed = true;
  let voiceErr: string | null = null, seoErr: string | null = null;
  let voiceDuration = 0, seoDuration = 0;

  if (isRetry) {
    // Retry only the requested test type
    const parentId = body.retry_of as number;
    const testType = body.test_type as "voice" | "seo";
    const res = testType === "voice"
      ? await runVoice(SUPABASE_URL, SERVICE_KEY)
      : await runSeo(SUPABASE_URL, SERVICE_KEY, seoUrl);

    await sb.from("e2e_test_runs").insert({
      test_type: testType,
      status: res.passed ? "passed" : (testType === "voice" ? "critical" : "failed"),
      duration_ms: res.duration,
      details: res.details,
      error_message: res.err,
      retry_count: 1,
      parent_run_id: parentId,
    });

    if (!res.passed) {
      await notifyAdmins(
        `${testType.toUpperCase()} retry`,
        `${testType.toUpperCase()} a eșuat și după retry: ${res.err || "fail"}`,
        "error",
      );
    }
    if (testType === "voice") { voicePassed = res.passed; voiceErr = res.err; voiceDuration = res.duration; }
    else { seoPassed = res.passed; seoErr = res.err; seoDuration = res.duration; }
  } else {
    // Initial run: both tests
    const v = await runVoice(SUPABASE_URL, SERVICE_KEY);
    voicePassed = v.passed; voiceErr = v.err; voiceDuration = v.duration;
    const { data: vRow } = await sb.from("e2e_test_runs").insert({
      test_type: "voice",
      status: v.passed ? "passed" : "failed", // initial fail is 'failed', retry-fail upgrades to 'critical'
      duration_ms: v.duration, details: v.details, error_message: v.err, retry_count: 0,
    }).select("id").single();
    if (!v.passed && vRow?.id) scheduleRetry("voice", vRow.id);

    const s = await runSeo(SUPABASE_URL, SERVICE_KEY, seoUrl);
    seoPassed = s.passed; seoErr = s.err; seoDuration = s.duration;
    const { data: sRow } = await sb.from("e2e_test_runs").insert({
      test_type: "seo",
      status: s.passed ? "passed" : "failed",
      duration_ms: s.duration, details: s.details, error_message: s.err, retry_count: 0,
    }).select("id").single();
    if (!s.passed && sRow?.id) scheduleRetry("seo", sRow.id);

    // Soft warning on initial failure (no critical alert yet — wait for retry)
    if (!v.passed || !s.passed) {
      const failures: string[] = [];
      if (!v.passed) failures.push(`Voice: ${v.err || "fail"}`);
      if (!s.passed) failures.push(`SEO: ${s.err || "fail"}`);
      await notifyAdmins("Initial fail", `Eșec inițial; retry programat în 10 min. ${failures.join(" | ")}`, "warning");
    }
  }

  await sb.from("cron_run_log").insert({
    job_name: isRetry ? "system-e2e-tests-retry" : "system-e2e-tests", status: "success",
    duration_ms: Date.now() - t0,
    details: { voice_passed: voicePassed, seo_passed: seoPassed, retry: isRetry },
  });

  return new Response(JSON.stringify({
    ok: true, retry: isRetry,
    voice: { passed: voicePassed, duration_ms: voiceDuration, error: voiceErr },
    seo: { passed: seoPassed, duration_ms: seoDuration, error: seoErr },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
