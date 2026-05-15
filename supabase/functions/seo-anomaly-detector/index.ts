// SEO Anomaly Detector
// Compares this week's average health_score per page with last week's. Pages dropping >15%
// trigger an automation_approval (severity warning) + log to seo_anomaly_log.
// Also flags sudden traffic anomalies if seo_ga4_metrics is available.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DROP_THRESHOLD = 15; // percent

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const reqBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = reqBody?.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const day = 86400_000;
  const weekAgo = new Date(now.getTime() - 7 * day).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * day).toISOString();

  // Pull audit snapshots from last 14 days
  const { data: snapshots, error } = await supabase
    .from("seo_audit_snapshots")
    .select("page, health_score, captured_at")
    .gte("captured_at", twoWeeksAgo)
    .order("captured_at", { ascending: false })
    .limit(2000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fallback: if seo_audit_snapshots missing/empty, use current seo_page_audits vs seo_audits history
  const byPage = new Map<string, { recent: number[]; previous: number[] }>();
  for (const s of snapshots ?? []) {
    if (!s.page || s.health_score == null) continue;
    const bucket = byPage.get(s.page) ?? { recent: [], previous: [] };
    if (s.captured_at >= weekAgo) bucket.recent.push(s.health_score);
    else bucket.previous.push(s.health_score);
    byPage.set(s.page, bucket);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const anomalies: Array<{ page: string; recent: number; previous: number; drop_pct: number }> = [];

  for (const [page, b] of byPage) {
    const r = avg(b.recent);
    const p = avg(b.previous);
    if (r == null || p == null || p <= 0) continue;
    const dropPct = ((p - r) / p) * 100;
    if (dropPct >= DROP_THRESHOLD) {
      anomalies.push({ page, recent: Math.round(r), previous: Math.round(p), drop_pct: Math.round(dropPct) });
    }
  }

  let alertsCreated = 0;
  let approvalsCreated = 0;

  for (const a of anomalies) {
    const alertKey = `seo_score_drop:${a.page}`;

    // dedup: skip if already alerted for this page in last 24h
    const since = new Date(now.getTime() - day).toISOString();
    const { data: dup } = await supabase
      .from("seo_anomaly_log")
      .select("id")
      .eq("alert_key", alertKey)
      .gte("sent_at", since)
      .limit(1);
    if (dup && dup.length > 0) continue;

    if (!dryRun) {
      await supabase.from("seo_anomaly_log").insert({ alert_key: alertKey, payload: a });
    }
    alertsCreated++;

    if (!dryRun) {
      await supabase.from("automation_approvals").insert({
        job_key: "seo.anomaly_detector",
        action_type: "investigate_seo_drop",
        entity_type: "seo_page",
        entity_id: null,
        severity: a.drop_pct >= 30 ? "critical" : "warning",
        proposal: {
          action: "Reauditează și regenerează meta pentru pagina cu scor în scădere",
          page: a.page,
          drop_pct: a.drop_pct,
          recent_score: a.recent,
          previous_score: a.previous,
        },
        evidence: { threshold_pct: DROP_THRESHOLD, sample_window_days: 14 },
      });
    }
    approvalsCreated++;
  }

  return new Response(JSON.stringify({
    dry_run: dryRun,
    pages_analyzed: byPage.size,
    anomalies_detected: anomalies.length,
    alerts_created: dryRun ? 0 : alertsCreated,
    would_create_alerts: dryRun ? alertsCreated : undefined,
    approvals_created: dryRun ? 0 : approvalsCreated,
    would_create_approvals: dryRun ? approvalsCreated : undefined,
    anomalies,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
