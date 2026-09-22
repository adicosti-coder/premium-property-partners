// Trimite mesajul de colaborare direct pe e-mail proprietarului, ca alternativă
// la WhatsApp/SMS. Expeditorul este info@realtrust.ro (singurul domeniu verificat).
// Salvează trimiterea în `owner_outreach_messages` și programează mementoul la 24h.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

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
    const listingId = String(body?.prospect_listing_id || "").trim();
    const message = String(body?.message || "").trim();
    const subject = String(body?.subject || "Propunere administrare RealTrust Timișoara").slice(0, 150);
    const offerPrice = body?.offer_price == null ? null : Number(body.offer_price);
    const durationMonths = Number(body?.duration_months) || 12;
    const templateKey = body?.template_key ? String(body.template_key) : null;

    if (!listingId || !message) {
      return json({ error: "prospect_listing_id și message sunt obligatorii" }, 400);
    }

    const { data: listing, error: listErr } = await admin
      .from("prospect_listings")
      .select("id, title, zone, price, currency, contact_email, contact_name, source_url, is_active")
      .eq("id", listingId)
      .maybeSingle();
    if (listErr) throw listErr;
    if (!listing) return json({ error: "anunțul nu există" }, 404);

    const to = String(body?.email || listing.contact_email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(to)) {
      return json({ error: "Anunțul nu are o adresă de e-mail validă." }, 400);
    }

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <p>${esc(message).replace(/\n/g, "<br/>")}</p>
      ${listing.source_url ? `<p style="font-size:13px;color:#555">Anunțul dvs.: <a href="${esc(listing.source_url)}">${esc(listing.title || listing.source_url)}</a></p>` : ""}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:18px 0"/>
      <p style="font-size:13px;color:#555">
        Adrian Costi — RealTrust Timișoara<br/>
        <a href="https://realtrust.ro">realtrust.ro</a> · info@realtrust.ro
      </p>
    </div>`;

    const sent = await sendTeamEmail(
      { to, subject, html, source: "owner-outreach-email" },
      admin,
    );

    const now = new Date();
    const { error: insErr } = await admin.from("owner_outreach_messages").insert({
      prospect_listing_id: listing.id,
      email: to,
      offer_price: Number.isFinite(offerPrice as number) ? offerPrice : null,
      currency: (listing.currency || "EUR").toUpperCase(),
      duration_months: durationMonths,
      message,
      channel: "email",
      status: sent.sent ? "sent" : "failed",
      template_key: templateKey,
      sent_at: sent.sent ? now.toISOString() : null,
      reminder_stage: 0,
      next_reminder_at: sent.sent ? new Date(now.getTime() + 24 * 3_600_000).toISOString() : null,
    });
    if (insErr) console.error("[owner-outreach-email] log insert failed:", insErr.message);

    if (!sent.sent) {
      return json({ ok: false, error: sent.error || "Trimiterea a eșuat", stored: sent.storedFallback }, 502);
    }
    return json({ ok: true, to, from: sent.from });
  } catch (err) {
    console.error("[owner-outreach-email]", (err as Error)?.message);
    return json({ error: (err as Error)?.message || "eroare necunoscută" }, 500);
  }
});
