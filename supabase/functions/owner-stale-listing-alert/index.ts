// Alertă zilnică: anunțuri de proprietari (OLX și celelalte portaluri) care sunt
// online de peste o lună. Proprietarul e deja obosit de anunț — e cel mai bun
// moment de contactat. Fiecare anunț e alertat o singură dată.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const ALERT_TO = "info@realtrust.ro";
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
    const body = await req.json().catch(() => ({}));
    const days = Math.min(120, Math.max(7, Number(body?.days) || 30));
    // Limită fixă de lucru pe rulare — restul intră în alerta de mâine.
    const limit = Math.min(50, Math.max(1, Number(body?.limit) || 25));
    const platform = body?.platform ? String(body.platform) : null;
    const cutoff = new Date(Date.now() - days * 24 * 3_600_000).toISOString();

    let query = admin
      .from("prospect_listings")
      .select("id, title, zone, rooms, price, currency, source_platform, source_url, published_at, contact_phone, phone_normalized")
      .eq("is_active", true)
      .is("stale_alerted_at", null)
      .not("published_at", "is", null)
      .lte("published_at", cutoff)
      .not("lifecycle_status", "in", "(posted,expired,failed,rejected)")
      .order("published_at", { ascending: true })
      .limit(limit);
    if (platform) query = query.ilike("source_platform", platform);

    const { data: rows, error } = await query;
    if (error) throw error;

    if (!rows?.length) {
      return json({ ok: true, found: 0, days });
    }

    const items = rows.map((r) => {
      const ageDays = r.published_at
        ? Math.floor((Date.now() - new Date(r.published_at).getTime()) / 86_400_000)
        : null;
      return { ...r, ageDays };
    });

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
      <h2 style="font-size:17px">${items.length} anunț(uri) online de peste ${days} de zile</h2>
      <p style="color:#555">Proprietarii care nu au vândut/închiriat într-o lună sunt cei mai receptivi la administrare.</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%">
        <tr style="background:#f4f4f5;text-align:left">
          <th>Anunț</th><th>Platformă</th><th>Zonă</th><th>Preț</th><th>Zile online</th><th>Telefon</th>
        </tr>
        ${items.map((r) => `<tr style="border-top:1px solid #e5e5e5">
          <td><a href="${esc(r.source_url || "https://realtrust.ro/admin/anunturi-gasite")}">${esc((r.title || "anunț").slice(0, 70))}</a></td>
          <td>${esc(r.source_platform || "—")}</td>
          <td>${esc(r.zone || "—")}</td>
          <td>${r.price ? `${Math.round(Number(r.price)).toLocaleString("ro-RO")} ${esc(r.currency || "EUR")}` : "—"}</td>
          <td>${r.ageDays ?? "—"}</td>
          <td>${esc(r.phone_normalized || r.contact_phone || "—")}</td>
        </tr>`).join("")}
      </table>
      <p style="margin-top:16px"><a href="https://realtrust.ro/admin?tab=flux-proprietari">Deschide Flux proprietari → Contactează</a></p>
    </div>`;

    const sent = await sendTeamEmail(
      {
        to: ALERT_TO,
        subject: `${items.length} anunțuri de proprietari online de peste ${days} de zile`,
        html,
        source: "owner-stale-listing-alert",
      },
      admin,
    );

    // Marcăm doar dacă alerta a plecat (sau a fost salvată pentru dashboard),
    // altfel le realertăm mâine.
    if (sent.sent || sent.storedFallback) {
      const ids = items.map((r) => r.id);
      const { error: upErr } = await admin
        .from("prospect_listings")
        .update({ stale_alerted_at: new Date().toISOString() })
        .in("id", ids);
      if (upErr) console.error("[owner-stale-listing-alert] update failed:", upErr.message);
    }

    return json({ ok: true, found: items.length, days, email_sent: sent.sent, email_error: sent.error ?? null });
  } catch (err) {
    console.error("[owner-stale-listing-alert]", (err as Error)?.message);
    return json({ error: (err as Error)?.message || "eroare necunoscută" }, 500);
  }
});
