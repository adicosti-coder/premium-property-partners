// Automation Anomaly Notifier
// Trimite email admin pentru anomaliile noi (notified=false) din ultimele 24h
// și le marchează ca notificate. Suportă dry-run.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  // ============= STEP 0: detect "consecutive failures" anomalies per job_key =============
  // Pentru fiecare job activ, dacă ultimele N≥3 rulări sunt toate `failed` consecutiv,
  // emite o anomalie `job.consecutive_failures:<job_key>` (idempotent: dacă există deja
  // o anomalie cu același metric în ultimele 24h și încă neacknowledged, NU dublăm).
  try {
    const { data: jobs } = await supabase
      .from("automation_jobs")
      .select("job_key, enabled")
      .eq("enabled", true);

    for (const job of jobs ?? []) {
      const { data: runs } = await supabase
        .from("automation_runs")
        .select("status, started_at, error")
        .eq("job_key", job.job_key)
        .order("started_at", { ascending: false })
        .limit(5);

      const last3 = (runs ?? []).slice(0, 3);
      if (last3.length < 3) continue;
      if (!last3.every((r) => r.status === "failed")) continue;

      const metric = `job.consecutive_failures:${job.job_key}`;
      // Idempotency: skip dacă există anomalie recentă neacknowledged
      const { data: existing } = await supabase
        .from("automation_anomalies")
        .select("id")
        .eq("metric", metric)
        .is("acknowledged_at", null)
        .gte("created_at", since)
        .limit(1);
      if (existing && existing.length > 0) continue;

      await supabase.from("automation_anomalies").insert({
        metric,
        observed: last3.length,
        baseline: 0,
        delta_pct: null,
        severity: "critical",
        notified: false,
        context: {
          job_key: job.job_key,
          consecutive_failed: last3.length,
          last_error: last3[0]?.error ?? null,
          last_failed_at: last3[0]?.started_at ?? null,
        },
      });
    }
  } catch (e) {
    console.error("[anomaly-notifier] consecutive-failure detector error:", e);
  }

  const { data: anomalies, error } = await supabase
    .from("automation_anomalies")
    .select("id, metric, severity, observed, baseline, delta_pct, context, created_at")
    .eq("notified", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);


  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!anomalies || anomalies.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, anomalies: 0, sent: 0, dry_run: dryRun }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Recipient: din system_health_thresholds.daily_report_email, fallback constant
  const { data: cfg } = await supabase
    .from("system_health_thresholds").select("daily_report_email").maybeSingle();
  const recipients: string[] = String(cfg?.daily_report_email || "contact@realtrust.ro")
    .split(/[,;]/).map((s) => s.trim()).filter((s) => s.includes("@"));

  const critical = anomalies.filter((a) => a.severity === "critical");
  const warnings = anomalies.filter((a) => a.severity === "warning");
  const info = anomalies.filter((a) => a.severity === "info");

  const fmtRow = (a: typeof anomalies[number]) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${a.metric}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">
        <span style="background:${a.severity === "critical" ? "#fee" : a.severity === "warning" ? "#ffeacc" : "#eef"};color:${a.severity === "critical" ? "#a00" : a.severity === "warning" ? "#a06000" : "#246"};padding:2px 8px;border-radius:4px;font-size:11px;text-transform:uppercase;">${a.severity}</span>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;">${a.observed ?? "—"} ${a.baseline ? `(vs ${a.baseline})` : ""}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px;color:#666;">${new Date(a.created_at).toLocaleString("ro-RO")}</td>
    </tr>`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="color:#0c2340;margin:0 0 8px;">🚨 Anomalii automatizări — ${anomalies.length} noi</h2>
      <p style="color:#666;font-size:13px;margin:0 0 16px;">
        ${critical.length} critice · ${warnings.length} warning · ${info.length} info
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;">
        <thead style="background:#f8f9fb;">
          <tr>
            <th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Metric</th>
            <th style="text-align:center;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Severitate</th>
            <th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Observat</th>
            <th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#666;">Când</th>
          </tr>
        </thead>
        <tbody>
          ${critical.map(fmtRow).join("")}
          ${warnings.map(fmtRow).join("")}
          ${info.map(fmtRow).join("")}
        </tbody>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#666;">
        Vezi detalii complete: <a href="https://realtrust.ro/admin">Automation Control Center</a>.
      </p>
    </div>`;

  let sent = 0;
  if (!dryRun && recipients.length > 0) {
    try {
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          to: recipients,
          subject: `🚨 ${anomalies.length} anomalii automatizări (${critical.length} critice)`,
          html,
          template_name: "automation_anomaly_notifier",
          idempotency_key: `anomaly-${new Date().toISOString().slice(0, 13)}`,
          purpose: "transactional",
        },
      });
      if (sendErr) throw sendErr;
      sent = recipients.length;
      // mark as notified
      const ids = anomalies.map((a) => a.id);
      await supabase.from("automation_anomalies").update({ notified: true }).in("id", ids);
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), anomalies: anomalies.length }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      anomalies: anomalies.length,
      sent,
      dry_run: dryRun,
      would_notify: dryRun ? anomalies.length : undefined,
      recipients,
      breakdown: { critical: critical.length, warning: warnings.length, info: info.length },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
