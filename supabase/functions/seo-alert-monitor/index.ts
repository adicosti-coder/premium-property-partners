// Automatic SEO alerting: raises admin alerts for (a) indexing errors reported
// by the latest GSC inspection snapshot and (b) frequently hit 404 URLs.
// Runs daily via pg_cron and on demand from /admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const ALERT_EMAIL = "adicosti@gmail.com";
const DEDUPE_WINDOW_H = 24;

interface NewAlert {
  alert_type: "indexing" | "not_found";
  alert_key: string;
  title: string;
  severity: "warning" | "error";
  details: Record<string, unknown>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // pg_cron calls with x-cron-secret; admins call with their JWT.
  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let threshold = 5;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const t = Number(body?.min_hits);
      if (Number.isFinite(t) && t >= 2 && t <= 1000) threshold = Math.floor(t);
    }
  } catch { /* ignore */ }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const candidates: NewAlert[] = [];

  // 1. Indexing errors from the most recent inspection snapshot.
  const { data: snap } = await admin
    .from("seo_indexing_snapshots")
    .select("id, created_at, checked_pages, issues_count, issues")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snap && (snap.issues_count ?? 0) > 0) {
    candidates.push({
      alert_type: "indexing",
      alert_key: `snapshot:${snap.id}`,
      title: `${snap.issues_count} pagini cu probleme de indexare în Google`,
      severity: "error",
      details: {
        checked_pages: snap.checked_pages,
        issues_count: snap.issues_count,
        issues: snap.issues,
        snapshot_at: snap.created_at,
      },
    });
  }

  // 2. Frequently hit 404 URLs in the last 24h.
  const { data: notFound } = await admin
    .from("admin_404_logs")
    .select("path, hits, referrer, last_seen_at")
    .gte("last_seen_at", since)
    .gte("hits", threshold)
    .order("hits", { ascending: false })
    .limit(20);

  for (const row of notFound ?? []) {
    candidates.push({
      alert_type: "not_found",
      alert_key: `404:${row.path}`,
      title: `404 frecvent: ${row.path} (${row.hits} accesări)`,
      severity: "warning",
      details: { path: row.path, hits: row.hits, referrer: row.referrer, last_seen_at: row.last_seen_at },
    });
  }

  // Dedupe: skip anything already raised in the last 24h.
  const created: NewAlert[] = [];
  for (const c of candidates) {
    const { data: existing } = await admin
      .from("seo_alerts")
      .select("id")
      .eq("alert_type", c.alert_type)
      .eq("alert_key", c.alert_key)
      .gte("created_at", since)
      .limit(1);
    if (existing && existing.length > 0) continue;
    const { error } = await admin.from("seo_alerts").insert({ ...c, notified_at: null });
    if (!error) created.push(c);
  }

  // One digest email per run.
  let emailed = false;
  if (created.length > 0) {
    const rows = created
      .map((c) => `<tr><td>${c.alert_type}</td><td>${c.title}</td></tr>`)
      .join("");
    const res = await sendTeamEmail(
      {
        to: ALERT_EMAIL,
        subject: `[SEO Alert] ${created.length} alerte noi pe realtrust.ro`,
        html: `<h2>Alerte SEO noi</h2>
          <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
          <tr style="background:#f3f4f6"><th>Tip</th><th>Detaliu</th></tr>${rows}</table>
          <p style="color:#6b7280">Vezi tot în /admin → SEO → Alerte.</p>`,
        source: "seo-alert-monitor",
      },
      admin,
    );
    emailed = res.sent;
    if (emailed) {
      await admin
        .from("seo_alerts")
        .update({ notified_at: new Date().toISOString() })
        .is("notified_at", null)
        .gte("created_at", since);
    }
  }

  // Webhook notification (WhatsApp / Make.com) — one payload per run.
  let webhooked = false;
  const webhookUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL") || Deno.env.get("LEAD_WEBHOOK_URL");
  if (created.length > 0 && webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "seo_alert",
          site: "realtrust.ro",
          count: created.length,
          severity: created.some((c) => c.severity === "error") ? "error" : "warning",
          message: `⚠️ ${created.length} alerte SEO noi pe realtrust.ro:\n` +
            created.slice(0, 10).map((c) => `• ${c.title}`).join("\n"),
          alerts: created.map((c) => ({
            alert_type: c.alert_type,
            alert_key: c.alert_key,
            title: c.title,
            severity: c.severity,
          })),
          admin_url: "https://realtrust.ro/admin?tab=seo",
          sent_at: new Date().toISOString(),
        }),
      });
      webhooked = res.ok;
    } catch (e) {
      console.error("[seo-alert-monitor] webhook failed", e);
    }
    if (webhooked) {
      await admin
        .from("seo_alerts")
        .update({ webhook_sent_at: new Date().toISOString() })
        .is("webhook_sent_at", null)
        .gte("created_at", since);
    }
  }

  return json({
    ok: true,
    checked: candidates.length,
    created: created.length,
    emailed,
    webhooked,
    threshold,
  });
});
