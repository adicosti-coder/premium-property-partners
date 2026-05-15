// Automation Daily Digest
// Aggregates last 24h of automation activity, sends Email digest to admin via
// send-transactional-email + WhatsApp alert for critical issues (jobs disabled or critical approvals).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = reqBody?.dry_run === true;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const today = new Date().toLocaleDateString("ro-RO");

  // Recipient: try system_health_thresholds.daily_report_email; fallback to constant
  const { data: cfg } = await supabase
    .from("system_health_thresholds").select("daily_report_email").maybeSingle();
  const recipients: string[] = String(cfg?.daily_report_email || "contact@realtrust.ro")
    .split(/[,;]/).map((s) => s.trim()).filter((s) => s.includes("@"));

  // Aggregate KPIs in parallel
  const [
    pendingApprovalsRes,
    jobsRes,
    agencySuspectsRes,
    highScoreLeadsRes,
    duplicatesRes,
    seoDraftsRes,
    seoAnomaliesRes,
    recentApprovalsRes,
  ] = await Promise.all([
    supabase.from("automation_approvals").select("id, severity", { count: "exact" }).eq("status", "pending"),
    supabase.from("automation_jobs").select("job_key, last_status, last_error, consecutive_failures, enabled"),
    supabase.from("prospect_listings").select("id", { count: "exact", head: true })
      .gte("agency_classified_at", since).gte("agency_suspicion_score", 85),
    supabase.from("prospect_listings").select("id", { count: "exact", head: true })
      .gte("created_at", since).gte("lead_score", 90),
    supabase.from("prospect_listings").select("id", { count: "exact", head: true })
      .gte("updated_at", since).not("duplicate_of", "is", null),
    supabase.from("seo_overrides").select("id", { count: "exact", head: true })
      .eq("pending_review", true),
    supabase.from("seo_anomaly_log").select("id", { count: "exact", head: true })
      .gte("sent_at", since),
    supabase.from("automation_approvals").select("action_type, severity, created_at")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(5),
  ]);

  const jobs = jobsRes.data ?? [];
  const failed = jobs.filter((j) => j.last_status === "failed");
  const disabled = jobs.filter((j) => !j.enabled && j.consecutive_failures >= 3);
  const topFailures = failed
    .sort((a, b) => (b.consecutive_failures ?? 0) - (a.consecutive_failures ?? 0))
    .slice(0, 5)
    .map((j) => ({
      job_key: j.job_key,
      error: (j.last_error ?? "—").slice(0, 140),
      consecutive_failures: j.consecutive_failures ?? 0,
    }));

  const data = {
    date: today,
    pending_approvals: pendingApprovalsRes.count ?? 0,
    jobs_failed: failed.length,
    jobs_disabled_self_healing: disabled.length,
    agency_suspects_24h: agencySuspectsRes.count ?? 0,
    high_score_leads_24h: highScoreLeadsRes.count ?? 0,
    duplicates_marked_24h: duplicatesRes.count ?? 0,
    seo_drafts_pending: seoDraftsRes.count ?? 0,
    seo_anomalies_24h: seoAnomaliesRes.count ?? 0,
    top_failures: topFailures,
    top_approvals: recentApprovalsRes.data ?? [],
  };

  // Email — one per recipient via existing transactional pipeline
  const emailResults: Array<{ to: string; ok: boolean; status: number; skipped?: boolean }> = [];
  if (dryRun) {
    for (const to of recipients) emailResults.push({ to, ok: true, status: 0, skipped: true });
  } else {
    for (const to of recipients) {
      const idempotencyKey = `automation-digest-${new Date().toISOString().slice(0, 10)}-${to}`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          "x-webhook-secret": SERVICE_KEY,
        },
        body: JSON.stringify({
          template_name: "automation-daily-digest",
          to,
          idempotency_key: idempotencyKey,
          purpose: "transactional",
          data,
        }),
      });
      emailResults.push({ to, ok: res.ok, status: res.status });
    }
  }

  // WhatsApp critical alert: only if there are critical-severity approvals or self-healing-disabled jobs
  const criticalApprovals = (pendingApprovalsRes.data ?? []).filter((a) => a.severity === "critical").length;
  const isCritical = criticalApprovals > 0 || disabled.length > 0;
  let whatsappResult: { skipped?: boolean; status?: number; error?: string } = { skipped: true };

  if (isCritical) {
    const webhookUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL") || Deno.env.get("LEAD_WEBHOOK_URL");
    if (webhookUrl) {
      const lines = [
        `🚨 *RealTrust Automation - Alertă* (${today})`,
        ``,
        criticalApprovals > 0 ? `• ${criticalApprovals} aprobări CRITICE pending` : null,
        disabled.length > 0 ? `• ${disabled.length} joburi auto-dezactivate (3+ eșuări consecutive):` : null,
        ...disabled.slice(0, 5).map((d) => `   ↳ ${d.job_key}`),
        ``,
        `Acțiune: realtrust.ro/admin/automation`,
      ].filter(Boolean).join("\n");

      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "automation_critical_alert",
            timestamp: new Date().toISOString(),
            to: "+40799069256",
            message: lines,
            summary: { critical_approvals: criticalApprovals, disabled_jobs: disabled.length },
          }),
        });
        whatsappResult = { status: resp.status };
      } catch (e) {
        whatsappResult = { error: e instanceof Error ? e.message : String(e) };
      }
    } else {
      whatsappResult = { skipped: true, error: "no_webhook_configured" } as { skipped: boolean; error: string };
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    recipients: emailResults,
    whatsapp: whatsappResult,
    digest: data,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
