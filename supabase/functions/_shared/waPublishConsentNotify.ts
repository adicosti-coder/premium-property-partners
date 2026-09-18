// Notificare pe e-mail către echipă când un proprietar din „Cozi Aprobare”
// (cerere de acord pentru preluarea anunțului pe realtrust.ro) răspunde pe
// WhatsApp — indiferent dacă răspunsul e acordul, retragerea sau o întrebare.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "./teamEmail.ts";

const TEAM_EMAIL = "info@realtrust.ro";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const STATUS_LABEL: Record<string, string> = {
  requested: "cerere trimisă, așteptăm acordul",
  granted: "acord primit (DA PUBLIC)",
  revoked: "acord retras (RETRAG)",
  published: "anunț publicat pe realtrust.ro",
};

export async function notifyConsentReply(
  supabase: SupabaseClient,
  args: {
    phone: string;
    message: string;
    profileName?: string | null;
    conversationId?: string | null;
    /** „consent” / „revoke” când răspunsul a fost explicit. */
    intent?: "consent" | "revoke" | null;
  },
): Promise<void> {
  const { phone, message, profileName, conversationId, intent } = args;

  // Trimitem doar pentru proprietarii care au deja o cerere în Cozi Aprobare.
  const { data: consent } = await supabase
    .from("wa_publish_consents")
    .select("id, status, prospect_listing_id, requested_at, last_reply_notified_at")
    .eq("phone_normalized", phone)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!consent) return;

  // Anti-spam: maximum un e-mail la 30 de minute pentru același proprietar,
  // dar răspunsurile explicite (acord / retragere) trec întotdeauna.
  const last = (consent as { last_reply_notified_at?: string | null }).last_reply_notified_at;
  if (!intent && last && Date.now() - new Date(last).getTime() < 30 * 60 * 1000) return;

  let listing: { title?: string | null; zone?: string | null; price?: number | null; source_url?: string | null } | null = null;
  if (consent.prospect_listing_id) {
    const { data } = await supabase
      .from("prospect_listings")
      .select("title, zone, price, source_url")
      .eq("id", consent.prospect_listing_id)
      .maybeSingle();
    listing = data as typeof listing;
  }

  const statusText = STATUS_LABEL[String(consent.status)] ?? String(consent.status);
  const subject = intent === "consent"
    ? `Acord primit pe WhatsApp: ${listing?.title || phone}`
    : intent === "revoke"
      ? `Acord retras pe WhatsApp: ${listing?.title || phone}`
      : `Răspuns de la proprietar (Cozi Aprobare): ${phone}`;

  const html = `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px">
  <h2 style="color:#1a1a2e;margin:0 0 12px">${esc(subject)}</h2>
  <p style="margin:0 0 8px"><strong>Telefon:</strong> ${esc(phone)}</p>
  ${profileName ? `<p style="margin:0 0 8px"><strong>Nume WhatsApp:</strong> ${esc(profileName)}</p>` : ""}
  <p style="margin:0 0 8px"><strong>Stare acord:</strong> ${esc(statusText)}</p>
  ${listing?.title ? `<p style="margin:0 0 8px"><strong>Anunț:</strong> ${esc(listing.title)}${listing.zone ? ` · ${esc(listing.zone)}` : ""}${listing.price ? ` · ${Number(listing.price).toLocaleString("ro-RO")} €` : ""}</p>` : ""}
  ${listing?.source_url ? `<p style="margin:0 0 8px"><a href="${esc(listing.source_url)}">Vezi anunțul original</a></p>` : ""}
  <div style="background:#f5f6f8;border-left:4px solid #d4af37;padding:12px;border-radius:6px;margin:12px 0">
    ${esc(message).slice(0, 1500)}
  </div>
  <p style="margin:0"><a href="https://realtrust.ro/admin?tab=wa-publish-consents">Deschide Cozi Aprobare</a></p>
  ${conversationId ? `<p style="color:#888;font-size:12px;margin:8px 0 0">Conversație: ${esc(conversationId)}</p>` : ""}
</div>`;

  const res = await sendTeamEmail(
    { to: TEAM_EMAIL, subject, html, source: "wa-publish-consent-reply" },
    supabase,
  );
  if (!res.sent) console.error("[consent-reply-email] not sent:", res.error);

  await supabase
    .from("wa_publish_consents")
    .update({ last_reply_notified_at: new Date().toISOString() })
    .eq("id", consent.id);
}
