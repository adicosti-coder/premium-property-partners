// Automation Orchestrator
// Cron */5 min. Reads automation_jobs (cron + enabled + global ON), dispatches each
// job by invoking its corresponding edge function. Records the run via automation_complete_run().
// Also accepts manual { job_key } POST from Admin "Run now".
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// job_key -> edge function name to invoke
const JOB_FN: Record<string, string> = {
  "lead.auto_classify_agency": "lead-auto-classify-agency",
  "lead.auto_dedup": "lead-auto-dedup",
  // future iterations will plug more handlers here:
  // "lead.auto_recall_no_answer": "lead-auto-recall",
  // "seo.auto_audit_on_update": "seo-auto-audit",
  // "seo.auto_fill_meta": "seo-auto-fill-meta",
  // "seo.anomaly_detector": "seo-anomaly-detector",
  // "system.daily_digest": "automation-daily-digest",
};

// crude cron-due check: parse "*/N * * * *" or "M H * * *"
function isDue(schedule: string | null, lastRunAt: string | null, now: Date): boolean {
  if (!schedule) return false;
  const m = schedule.trim().match(/^(\S+)\s+(\S+)\s+\*\s+\*\s+(\*|\d+)$/);
  if (!m) return false;
  const [, minPart, hourPart] = m;
  const minutesSinceLast = lastRunAt ? (now.getTime() - new Date(lastRunAt).getTime()) / 60000 : Infinity;
  // */N pattern
  const everyMin = minPart.match(/^\*\/(\d+)$/);
  if (everyMin && hourPart === "*") return minutesSinceLast >= Number(everyMin[1]);
  // explicit "M H * * *" — fire if current hour matches and we haven't run today
  const min = Number(minPart);
  const hour = Number(hourPart);
  if (Number.isFinite(min) && Number.isFinite(hour)) {
    if (now.getUTCHours() !== hour) return false;
    return minutesSinceLast >= 60; // at most once per matching hour
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let manualJobKey: string | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.job_key === "string") manualJobKey = body.job_key;
    }
  } catch { /* ignore */ }

  // global kill switch
  const { data: settings } = await supabase
    .from("automation_settings").select("enabled, paused_reason").eq("id", true).maybeSingle();
  if (!settings?.enabled && !manualJobKey) {
    return new Response(JSON.stringify({ skipped: "global_off", reason: settings?.paused_reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: jobs } = await supabase
    .from("automation_jobs").select("job_key, enabled, schedule, trigger_type, last_run_at");

  const now = new Date();
  const candidates = (jobs ?? []).filter((j) => {
    if (manualJobKey) return j.job_key === manualJobKey;
    if (!j.enabled) return false;
    if (j.trigger_type !== "cron") return false;
    if (!JOB_FN[j.job_key]) return false;
    return isDue(j.schedule, j.last_run_at, now);
  });

  const results: Array<{ job_key: string; ok: boolean; error?: string }> = [];

  for (const job of candidates) {
    const fnName = JOB_FN[job.job_key];
    if (!fnName) {
      results.push({ job_key: job.job_key, ok: false, error: "no_handler" });
      continue;
    }
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { triggered_by: "orchestrator", job_key: job.job_key },
      });
      if (error) throw error;
      await supabase.rpc("automation_complete_run", {
        _job_key: job.job_key,
        _success: true,
        _payload: (data ?? {}) as Record<string, unknown>,
      });
      results.push({ job_key: job.job_key, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.rpc("automation_complete_run", {
        _job_key: job.job_key,
        _success: false,
        _error: msg.slice(0, 500),
      });
      results.push({ job_key: job.job_key, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ran: results.length, results, manual: manualJobKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
