// Daily 09:00 system health report — sends a status email to the admin.
// Aggregates last 24h of cron runs, key health, voice latency, e2e tests.
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
  await sb.from("cron_run_log").insert({ job_name: "system-health-report", status: "started" });

  const { data: cfg } = await sb.from("system_health_thresholds").select("*").maybeSingle();
  if (!cfg?.daily_report_enabled) {
    await sb.from("cron_run_log").insert({ job_name: "system-health-report", status: "skipped", duration_ms: Date.now()-t0 });
    return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: corsHeaders });
  }

  const since = new Date(Date.now() - 24*3600_000).toISOString();

  // Aggregate
  const [{ data: cronRuns }, { data: keyHealth }, { data: latency }, { data: e2e }] = await Promise.all([
    sb.from("cron_run_log").select("job_name,status,error_message,started_at").gte("started_at", since).order("started_at", { ascending: false }).limit(500),
    sb.from("external_keys_health").select("provider,is_valid,message,checked_at").gte("checked_at", since).order("checked_at", { ascending: false }),
    sb.from("voice_call_sessions").select("tts_latency_ms_avg,started_at").gte("started_at", since).not("tts_latency_ms_avg", "is", null).limit(200),
    sb.from("e2e_test_runs").select("test_type,status,error_message,run_at").gte("run_at", since).order("run_at", { ascending: false }),
  ]);

  const failed = (cronRuns || []).filter((r: any) => r.status === "failed");
  const e2eFailed = (e2e || []).filter((r: any) => r.status !== "passed");
  const keysInvalid: Record<string, boolean> = {};
  for (const k of keyHealth || []) {
    if (keysInvalid[k.provider] === undefined) keysInvalid[k.provider] = !k.is_valid;
  }
  const invalidKeys = Object.entries(keysInvalid).filter(([,bad]) => bad).map(([p]) => p);
  const avgLatency = latency?.length
    ? Math.round(latency.reduce((s: number, c: any) => s + (c.tts_latency_ms_avg || 0), 0) / latency.length)
    : null;

  const allOk = failed.length === 0 && e2eFailed.length === 0 && invalidKeys.length === 0;
  const errors: string[] = [];
  if (failed.length) errors.push(`${failed.length} cron job(s) eșuate: ${failed.slice(0,5).map((f:any)=>f.job_name).join(", ")}`);
  if (e2eFailed.length) errors.push(`${e2eFailed.length} test(e) E2E eșuate: ${e2eFailed.map((f:any)=>`${f.test_type}(${f.status})`).join(", ")}`);
  if (invalidKeys.length) errors.push(`Chei invalide: ${invalidKeys.join(", ")}`);

  // Send email via send-transactional-email
  const idempotencyKey = `system-health-${new Date().toISOString().slice(0,10)}`;
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
    body: JSON.stringify({
      template_name: "system-health-report",
      to: cfg.daily_report_email,
      idempotency_key: idempotencyKey,
      purpose: "transactional",
      data: {
        date: new Date().toLocaleDateString("ro-RO"),
        all_ok: allOk,
        errors,
        summary: {
          cron_runs_24h: cronRuns?.length ?? 0,
          cron_failures: failed.length,
          e2e_failures: e2eFailed.length,
          invalid_keys: invalidKeys,
          avg_voice_latency_ms: avgLatency,
          voice_calls_24h: latency?.length ?? 0,
        },
      },
    }),
  });
  const sendData = await sendRes.json().catch(() => ({}));

  await sb.from("cron_run_log").insert({
    job_name: "system-health-report", status: "success",
    duration_ms: Date.now() - t0,
    details: { all_ok: allOk, errors_count: errors.length, email: sendData },
  });

  return new Response(JSON.stringify({ ok: true, all_ok: allOk, errors, sent: sendRes.ok }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
