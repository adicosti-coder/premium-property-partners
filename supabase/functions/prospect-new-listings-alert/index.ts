// Alertă (email + in-app) pentru anunțurile noi găsite, grupate pe platformă.
// Apelabilă din cron (x-cron-secret) sau din Admin (JWT admin).
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const ALERT_TO = "info@realtrust.ro";

interface Row {
  id: string;
  title: string | null;
  zone: string | null;
  price: number | null;
  rooms: number | null;
  contact_phone: string | null;
  source_platform: string | null;
  source_url: string | null;
  created_at: string | null;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const force = body?.force === true;

    const { data: state } = await admin
      .from("prospect_new_listing_alert_state")
      .select("last_alerted_at")
      .eq("id", true)
      .maybeSingle();

    const since = force
      ? new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      : (state?.last_alerted_at as string | undefined) ??
        new Date(Date.now() - 3600 * 1000).toISOString();

    const { data, error } = await admin
      .from("prospect_listings")
      .select("id,title,zone,price,rooms,contact_phone,source_platform,source_url,created_at")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = (data || []) as Row[];
    if (rows.length === 0) {
      return json({ ok: true, new_listings: 0, since, notified: false });
    }

    // Grupare pe platformă
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const key = r.source_platform || "Necunoscut";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const platformSummary = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([p, list]) => `${p}: ${list.length}`)
      .join(" · ");

    const sections = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([platform, list]) => {
        const items = list
          .map((r) => {
            const bits = [
              r.zone ? esc(r.zone) : null,
              r.rooms ? `${r.rooms} camere` : null,
              r.price ? `${Number(r.price).toLocaleString("ro-RO")} €` : null,
              r.contact_phone ? `tel: ${esc(r.contact_phone)}` : "fără telefon",
            ].filter(Boolean).join(" · ");
            const link = r.source_url
              ? ` — <a href="${esc(r.source_url)}">vezi anunțul</a>`
              : "";
            return `<li><strong>${esc(r.title || "Anunț fără titlu")}</strong><br/><span style="color:#555">${bits}</span>${link}</li>`;
          })
          .join("");
        return `<h3 style="margin:18px 0 6px">${esc(platform)} — ${list.length} anunțuri</h3><ul style="padding-left:18px">${items}</ul>`;
      })
      .join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
        <h2 style="margin:0 0 4px">Anunțuri noi găsite: ${rows.length}</h2>
        <p style="color:#555;margin:0 0 8px">${esc(platformSummary)}</p>
        ${sections}
        <p style="margin-top:20px"><a href="https://realtrust.ro/admin?tab=listing-import">Deschide Anunțuri noi găsite în Admin</a></p>
      </div>`;

    const email = await sendTeamEmail(
      {
        to: ALERT_TO,
        subject: `RealTrust — ${rows.length} anunțuri noi găsite (${platformSummary})`,
        html,
        source: "prospect-new-listings-alert",
      },
      admin,
    );

    // Notificări in-app pentru toți administratorii
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    // Preview cu preț + link pentru primele anunțuri
    const preview = rows.slice(0, 3).map((r) => {
      const bits = [
        r.source_platform || "Necunoscut",
        r.zone || null,
        r.rooms ? `${r.rooms} cam` : null,
        r.price ? `${Number(r.price).toLocaleString("ro-RO")} €` : "preț nespecificat",
      ].filter(Boolean).join(" · ");
      return r.source_url ? `${bits} — ${r.source_url}` : bits;
    }).join("\n");

    const notifications = (admins || []).map((a: { user_id: string }) => ({
      user_id: a.user_id,
      title: `${rows.length} anunțuri noi găsite`,
      message: `${platformSummary}\n${preview}${rows.length > 3 ? `\n+ ${rows.length - 3} alte anunțuri` : ""}`,
      type: "info",
      action_url: "/admin?tab=listing-import",
      action_label: "Vezi anunțurile",
    }));
    if (notifications.length) {
      await admin.from("user_notifications").insert(notifications);
    }

    await admin
      .from("prospect_new_listing_alert_state")
      .upsert({ id: true, last_alerted_at: new Date().toISOString(), last_count: rows.length });

    return json({
      ok: true,
      new_listings: rows.length,
      since,
      platforms: Object.fromEntries([...groups.entries()].map(([p, l]) => [p, l.length])),
      email_sent: email.sent,
      in_app: notifications.length,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
