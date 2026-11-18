// Core Web Vitals regression check. Compares the last few days of real-visitor
// p75 (LCP, CLS, INP per device) with the two weeks before and alerts the team
// by email + WhatsApp alert webhook. Runs every 6h via pg_cron; admins can run
// it on demand from /admin/viteza-site.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";
import {
  BASELINE_WINDOW_DAYS,
  CURRENT_WINDOW_DAYS,
  DEVICE_CLASSES,
  MONITORED_METRICS,
  evaluateRegression,
  formatVital,
  regressionAlertKey,
  type DeviceClass,
  type MonitoredMetric,
} from "../_shared/webVitalsRegression.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};
const ALERT_EMAIL = "adicosti@gmail.com";
const ADMIN_URL = "https://realtrust.ro/admin/viteza-site";
const RETENTION_DAYS = 120;
const DAY = 24 * 3600 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type StatRow = { metric: string; device: string; samples: number; p75: number };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const currentFrom = new Date(now.getTime() - CURRENT_WINDOW_DAYS * DAY);
  const baselineFrom = new Date(currentFrom.getTime() - BASELINE_WINDOW_DAYS * DAY);

  const [cur, base] = await Promise.all([
    admin.rpc("web_vitals_window_stats", { p_from: currentFrom.toISOString(), p_to: now.toISOString() }),
    admin.rpc("web_vitals_window_stats", { p_from: baselineFrom.toISOString(), p_to: currentFrom.toISOString() }),
  ]);
  if (cur.error || base.error) {
    console.error("[web-vitals-regression-check] stats failed", cur.error ?? base.error);
    return json({ ok: false, error: "stats_failed" }, 500);
  }
  const find = (rows: StatRow[] | null, m: string, d: string) => {
    const r = (rows ?? []).find((x) => x.metric === m && x.device === d);
    return r ? { samples: Number(r.samples), p75: Number(r.p75) } : null;
  };

  // Releases seen in the recent window, newest first — tells which publish to suspect.
  const { data: relRows } = await admin
    .from("web_vital_samples")
    .select("release, created_at")
    .gte("created_at", currentFrom.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);
  const releases = [...new Set((relRows ?? []).map((r: { release: string }) => r.release))].slice(0, 5);

  const checks: Array<Record<string, unknown>> = [];
  const created: Array<{ metric: MonitoredMetric; device: DeviceClass; severity: string; reason: string; current: number; baseline: number | null }> = [];

  for (const metric of MONITORED_METRICS) {
    for (const device of DEVICE_CLASSES) {
      const current = find(cur.data as StatRow[], metric, device);
      const baseline = find(base.data as StatRow[], metric, device);
      const verdict = evaluateRegression(metric, device, current, baseline);
      checks.push({ metric, device, current, baseline, alert: verdict?.severity ?? null });
      if (!verdict || !current) continue;

      const { data: inserted, error } = await admin
        .from("web_vital_alerts")
        .insert({
          alert_key: regressionAlertKey(metric, device, now),
          metric,
          device,
          severity: verdict.severity,
          reason: verdict.reason,
          current_p75: current.p75,
          baseline_p75: baseline?.p75 ?? null,
          current_samples: current.samples,
          baseline_samples: baseline?.samples ?? null,
          releases,
        })
        .select("id");
      // Unique alert_key: a second run on the same day is a silent no-op.
      if (error || !inserted?.length) continue;
      created.push({ metric, device, severity: verdict.severity, reason: verdict.reason, current: current.p75, baseline: baseline?.p75 ?? null });
    }
  }

  let emailed = false;
  let whatsapped = false;
  if (created.length > 0) {
    const rows = created
      .map((c) => `<tr><td>${escapeHtml(c.metric)}</td><td>${c.device === "mobile" ? "Telefon" : "Calculator"}</td>` +
        `<td>${c.baseline == null ? "—" : escapeHtml(formatVital(c.metric, c.baseline))}</td>` +
        `<td><strong>${escapeHtml(formatVital(c.metric, c.current))}</strong></td><td>${escapeHtml(c.reason)}</td></tr>`)
      .join("");
    const res = await sendTeamEmail({
      to: ALERT_EMAIL,
      subject: `[Viteză site] ${created.length} indicator(i) înrăutățiți pe realtrust.ro`,
      source: "web_vitals_regression",
      html: `<h2>Viteza site-ului s-a înrăutățit pentru vizitatorii reali</h2>
        <p style="font-family:sans-serif">Ultimele ${CURRENT_WINDOW_DAYS} zile față de cele ${BASELINE_WINDOW_DAYS} zile dinainte (valoarea pe care o depășesc 75% dintre vizite).</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <tr style="background:#f3f4f6"><th>Indicator</th><th>Ecran</th><th>Înainte</th><th>Acum</th><th>Detaliu</th></tr>${rows}</table>
        <p style="font-family:sans-serif;font-size:13px">Versiuni publicate în perioadă: ${escapeHtml(releases.join(", ") || "—")}</p>
        <p><a href="${ADMIN_URL}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-family:sans-serif">Deschide Viteză site</a></p>`,
    }, admin);
    emailed = res.sent;

    const webhookUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL") || Deno.env.get("LEAD_WEBHOOK_URL");
    if (webhookUrl) {
      try {
        const r = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "web_vitals_alert",
            site: "realtrust.ro",
            count: created.length,
            severity: created.some((c) => c.severity === "error") ? "error" : "warning",
            message: `⚠️ Viteza realtrust.ro s-a înrăutățit:\n` + created.map((c) => `• ${c.reason}`).join("\n") + `\n${ADMIN_URL}`,
            admin_url: ADMIN_URL,
            sent_at: now.toISOString(),
          }),
        });
        whatsapped = r.ok;
      } catch (e) {
        console.error("[web-vitals-regression-check] webhook failed", e);
      }
    }
    const keys = created.map((c) => regressionAlertKey(c.metric, c.device, now));
    await admin.from("web_vital_alerts").update({ email_sent: emailed, whatsapp_sent: whatsapped }).in("alert_key", keys);
  }

  await admin.from("web_vital_samples").delete().lt("created_at", new Date(now.getTime() - RETENTION_DAYS * DAY).toISOString());

  return json({ ok: true, checks, alerts_created: created.length, emailed, whatsapped, releases });
});
