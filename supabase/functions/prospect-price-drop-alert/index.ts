// Alertă (email + in-app) când un anunț găsit scade prețul semnificativ.
// Compară ultimele două prețuri din `prospect_price_history` și trimite o alertă
// cu linkul și data scăderii. Fiecare scădere este alertată o singură dată.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const ALERT_TO = "info@realtrust.ro";
/** Prag implicit: scădere de minim 4% și minim 2.000 €. */
const DEFAULT_MIN_PCT = 4;
const DEFAULT_MIN_ABS = 2_000;

interface HistoryRow {
  listing_id: string | null;
  price: number | null;
  recorded_at: string;
  source_platform: string | null;
  source_url: string | null;
  zone: string | null;
  rooms: number | null;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const eur = (v: number) => `${Math.round(v).toLocaleString("ro-RO")} €`;

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
    try { body = await req.json(); } catch { /* fără corp */ }
    const minPct = Math.max(1, Number(body?.min_pct) || DEFAULT_MIN_PCT);
    const minAbs = Math.max(0, Number(body?.min_abs) ?? DEFAULT_MIN_ABS);
    const hours = Math.min(168, Math.max(1, Number(body?.hours) || 24));
    const since = new Date(Date.now() - hours * 3600_000).toISOString();

    // Toate înregistrările recente + contextul lor (ultimul preț anterior)
    const { data: recent, error } = await admin
      .from("prospect_price_history")
      .select("listing_id,price,recorded_at,source_platform,source_url,zone,rooms")
      .gte("recorded_at", since)
      .not("price", "is", null)
      .order("recorded_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const rows = (recent || []) as HistoryRow[];
    const byListing = new Map<string, HistoryRow[]>();
    for (const r of rows) {
      if (!r.listing_id) continue;
      if (!byListing.has(r.listing_id)) byListing.set(r.listing_id, []);
      byListing.get(r.listing_id)!.push(r);
    }

    const drops: {
      listing_id: string;
      old_price: number;
      new_price: number;
      drop_pct: number;
      recorded_at: string;
      platform: string;
      url: string | null;
      zone: string | null;
      rooms: number | null;
      title: string | null;
    }[] = [];

    for (const [listingId, list] of byListing) {
      const latest = list[0];
      const newPrice = Number(latest.price || 0);
      if (!newPrice) continue;

      // Prețul anterior: din aceeași fereastră sau, dacă lipsește, din istoricul mai vechi.
      let oldPrice = list.length > 1 ? Number(list[1].price || 0) : 0;
      if (!oldPrice) {
        const { data: prev } = await admin
          .from("prospect_price_history")
          .select("price")
          .eq("listing_id", listingId)
          .lt("recorded_at", latest.recorded_at)
          .not("price", "is", null)
          .order("recorded_at", { ascending: false })
          .limit(1);
        oldPrice = Number(prev?.[0]?.price || 0);
      }
      if (!oldPrice || newPrice >= oldPrice) continue;

      const diff = oldPrice - newPrice;
      const pct = (diff / oldPrice) * 100;
      if (pct < minPct || diff < minAbs) continue;

      // Aceeași scădere nu se alertează de două ori.
      const { data: already } = await admin
        .from("prospect_price_drop_alerts")
        .select("id")
        .eq("listing_id", listingId)
        .eq("new_price", newPrice)
        .limit(1);
      if (already?.length) continue;

      const { data: listing } = await admin
        .from("prospect_listings")
        .select("title,listing_url,source_url,zone,rooms,source_platform")
        .eq("id", listingId)
        .maybeSingle();

      drops.push({
        listing_id: listingId,
        old_price: oldPrice,
        new_price: newPrice,
        drop_pct: Math.round(pct * 10) / 10,
        recorded_at: latest.recorded_at,
        platform: latest.source_platform || (listing?.source_platform as string) || "Necunoscut",
        url: (listing?.listing_url as string) || latest.source_url ||
          (listing?.source_url as string) || null,
        zone: latest.zone || (listing?.zone as string) || null,
        rooms: latest.rooms ?? (listing?.rooms as number) ?? null,
        title: (listing?.title as string) || null,
      });
    }

    if (!drops.length) return json({ ok: true, drops: 0, since, notified: false });

    drops.sort((a, b) => b.drop_pct - a.drop_pct);

    const items = drops.map((d) => {
      const bits = [
        d.platform,
        d.zone,
        d.rooms ? `${d.rooms} camere` : null,
        `${eur(d.old_price)} → <strong>${eur(d.new_price)}</strong> (−${d.drop_pct}%)`,
        new Date(d.recorded_at).toLocaleString("ro-RO"),
      ].filter(Boolean).map((b) => esc(String(b))).join(" · ");
      const link = d.url ? ` — <a href="${esc(d.url)}">vezi anunțul</a>` : "";
      return `<li><strong>${esc(d.title || "Anunț fără titlu")}</strong><br/><span style="color:#555">${
        bits.replace("&lt;strong&gt;", "<strong>").replace("&lt;/strong&gt;", "</strong>")
      }</span>${link}</li>`;
    }).join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
        <h2 style="margin:0 0 4px">Scăderi de preț: ${drops.length} anunțuri</h2>
        <p style="color:#555;margin:0 0 8px">Scăderi de minim ${minPct}% în ultimele ${hours} ore.</p>
        <ul style="padding-left:18px">${items}</ul>
        <p style="margin-top:20px"><a href="https://realtrust.ro/admin?tab=listing-import">Deschide Anunțuri noi găsite în Admin</a></p>
      </div>`;

    const email = await sendTeamEmail(
      {
        to: ALERT_TO,
        subject: `RealTrust — ${drops.length} scăderi de preț (max −${drops[0].drop_pct}%)`,
        html,
        source: "prospect-price-drop-alert",
      },
      admin,
    );

    await admin.from("prospect_price_drop_alerts").insert(
      drops.map((d) => ({
        listing_id: d.listing_id,
        old_price: d.old_price,
        new_price: d.new_price,
        drop_pct: d.drop_pct,
        source_platform: d.platform,
        source_url: d.url,
        recorded_at: d.recorded_at,
      })),
    );

    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const preview = drops.slice(0, 3).map((d) =>
      `${d.platform} · ${d.zone || "zonă necunoscută"} · ${eur(d.old_price)} → ${eur(d.new_price)} (−${d.drop_pct}%)${
        d.url ? ` — ${d.url}` : ""
      }`
    ).join("\n");

    const notifications = (admins || []).map((a: { user_id: string }) => ({
      user_id: a.user_id,
      title: `${drops.length} anunțuri au scăzut prețul`,
      message: `${preview}${drops.length > 3 ? `\n+ ${drops.length - 3} alte scăderi` : ""}`,
      type: "warning",
      action_url: "/admin?tab=listing-import",
      action_label: "Vezi scăderile",
    }));
    if (notifications.length) await admin.from("user_notifications").insert(notifications);

    return json({
      ok: true,
      drops: drops.length,
      since,
      email_sent: email.sent,
      in_app: notifications.length,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
