// Automation Self-Healing TEST harness.
// Seeds a dummy job + fake failed/timeout runs, then invokes automation-self-healing
// so the admin can watch the reaction in the Live Logs tab.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DUMMY = "system.self_healing_dummy";

type Mode = "failures" | "timeouts" | "mixed";

async function liveLog(
  supabase: ReturnType<typeof createClient>,
  level: "info" | "warning" | "error" | "success",
  message: string,
  details: Record<string, unknown> = {},
) {
  try {
    await supabase.from("automation_live_logs").insert({
      source: "self_healing_test",
      level,
      message,
      details,
      job_key: DUMMY,
    });
  } catch { /* never throw */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const mode: Mode = (body?.mode === "failures" || body?.mode === "timeouts" || body?.mode === "mixed")
    ? body.mode : "mixed";
  const failures = Math.max(3, Math.min(20, Number(body?.consecutive_failures ?? 7)));
  const override = (body?.override && typeof body.override === "object") ? body.override : null;

  await liveLog(supabase, "info", `🧪 Test self-healing start · mode=${mode} · consecutive_failures=${failures}`, {
    mode, failures, override,
  });

  // 1. Upsert dummy job (cron + event-driven so orchestrator never picks it up)
  const dummyConfig: Record<string, unknown> = { timeout_ms: 5000, max_retries: 1 };
  if (override) dummyConfig.self_healing_override = override;
  const { error: upErr } = await supabase.from("automation_jobs").upsert({
    job_key: DUMMY,
    category: "system",
    label: "Self-Healing Dummy (test)",
    description: "Job virtual pentru testarea regulilor de self-healing. Nu se execută real.",
    enabled: true,
    schedule: "event-driven",
    trigger_type: "cron",
    consecutive_failures: failures,
    last_status: "failed",
    last_error: `Simulated ${mode} failure for self-healing test`,
    config: dummyConfig,
  }, { onConflict: "job_key" });
  if (upErr) {
    await liveLog(supabase, "error", `Upsert dummy eșuat: ${upErr.message}`);
    return new Response(JSON.stringify({ ok: false, error: upErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Wipe any previous test runs, then seed 15 fake runs
  await supabase.from("automation_runs").delete().eq("job_key", DUMMY);

  const nowMs = Date.now();
  const rows = Array.from({ length: 15 }).map((_, i) => {
    const status =
      mode === "failures" ? "failed"
      : mode === "timeouts" ? "timeout"
      : (i % 4 === 0 ? "success" : i % 2 === 0 ? "failed" : "timeout");
    return {
      job_key: DUMMY,
      started_at: new Date(nowMs - (i + 1) * 60_000).toISOString(),
      finished_at: new Date(nowMs - (i + 1) * 60_000 + 4800).toISOString(),
      duration_ms: status === "timeout" ? 5000 : 4800,
      status,
      error: status === "success" ? null : `simulated ${status}`,
      triggered_by: "self_healing_test",
    };
  });
  const { error: insErr } = await supabase.from("automation_runs").insert(rows);
  if (insErr) {
    await liveLog(supabase, "warning", `Insert runs partial: ${insErr.message}`);
  }

  await liveLog(supabase, "info", `📦 Seed complet: ${rows.length} runs simulate + ${failures} consecutive_failures`, {
    runs_seeded: rows.length, mode, override_applied: !!override,
  });

  // 3. Invoke self-healing → it will live-log its own reaction
  const t0 = Date.now();
  const { data, error } = await supabase.functions.invoke("automation-self-healing", { body: {} });
  const ms = Date.now() - t0;

  if (error) {
    await liveLog(supabase, "error", `❌ Self-healing invoke eșuat (${ms}ms): ${error.message ?? String(error)}`);
  } else {
    await liveLog(supabase, "success", `✅ Self-healing test complet în ${ms}ms — verifică logurile de mai sus`, {
      healing_summary: data,
    });
  }

  return new Response(
    JSON.stringify({
      ok: !error,
      ms,
      mode,
      consecutive_failures: failures,
      override_applied: !!override,
      healing_result: data ?? null,
      error: error ? (error.message ?? String(error)) : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
