// E-mail automat către CLIENT cu oferta: apartamentul discutat, prețul real din
// anunț, linkul anunțului și linkul chatului WhatsApp. Se trimite din server,
// independent de browser, o singură dată per conversație + apartament.
import { sendTeamEmail } from "./teamEmail.ts";
import { PUBLIC_WA_LINK, PUBLIC_WA_NUMBER } from "./waClientEmail.ts";

type Db = { from: (t: string) => any };

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface OfferEmailProperty {
  id?: string | null;
  name?: string | null;
  url?: string | null;
  price?: number | null;
  rooms?: number | null;
  size?: number | null;
  location?: string | null;
}

export function buildClientOfferEmail(
  prop: OfferEmailProperty,
  name?: string | null,
): { subject: string; html: string } {
  const hello = name ? `Bună ziua, ${escapeHtml(name)}!` : "Bună ziua!";
  const propName = escapeHtml(String(prop.name ?? "apartamentul discutat"));
  const priceTxt = prop.price
    ? `${Number(prop.price).toLocaleString("ro-RO")} €`
    : null;
  const specs = [
    prop.rooms ? `${prop.rooms} ${prop.rooms === 1 ? "cameră" : "camere"}` : null,
    prop.size ? `${Math.round(Number(prop.size))} m²` : null,
    prop.location ? escapeHtml(String(prop.location)) : null,
  ].filter(Boolean).join(" · ");

  return {
    subject: `Oferta RealTrust pentru ${prop.name ?? "apartamentul discutat"}${priceTxt ? ` — ${priceTxt}` : ""}`,
    html: `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:16px;margin:0 0 12px">${hello}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
    Vă trimitem oferta pentru <strong>${propName}</strong>, discutată pe WhatsApp.
  </p>
  <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 18px">
    <tr><td style="padding:14px 16px">
      <p style="margin:0 0 6px;font-size:16px;font-weight:bold">${propName}</p>
      ${specs ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280">${specs}</p>` : ""}
      ${priceTxt ? `<p style="margin:0;font-size:20px;font-weight:bold;color:#111827">${priceTxt}</p>` : ""}
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Pașii următori:</p>
  <ol style="font-size:14px;line-height:1.7;margin:0 0 18px;padding-left:20px">
    <li>Ofertă — prețul, comisionul și costurile de achiziție.</li>
    <li>Vizionare — direct la apartament, 09:00–20:00 (luni–sâmbătă).</li>
    <li>Negociere — transmitem oferta dvs. proprietarului.</li>
    <li>Acte — antecontract, plată și programare la notar.</li>
  </ol>
  <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 18px;background:#f9fafb">
    <tr><td style="padding:14px 16px">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold">Cifrele pentru acest apartament</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#374151">
        <li><strong>Venit brut estimat:</strong> ${money(grossMonth) ?? "tariful pe noapte × ocupare medie de 75%"} pe lună, la o ocupare medie de 75%.</li>
        <li><strong>Comisionul nostru de administrare:</strong> 15-20% din încasări${feeMin && feeMax ? `, adică ${feeMin}–${feeMax} pe lună` : ""} — anunțuri, prețuri dinamice, comunicarea cu oaspeții, curățenie și mentenanță.</li>
        <li><strong>Profit net estimat:</strong> ${money(netMonth) ? `${money(netMonth)} pe lună (${money(netYear)} pe an), ` : ""}circa 9,4% pe an din valoarea apartamentului — estimare medie, în funcție de gradul real de ocupare și de costurile reale de administrare.</li>
      </ul>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280">Primiți lunar un raport cu încasările, cheltuielile și profitul net.</p>
    </td></tr>
  </table>
  ${prop.url ? `<p style="margin:0 0 18px;font-size:14px"><a href="${prop.url}">Vedeți anunțul complet și pozele</a></p>` : ""}
  <p style="margin:20px 0">
    <a href="${PUBLIC_WA_LINK}" style="background:#D4AF37;color:#111827;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold;display:inline-block">
      Continuați discuția pe WhatsApp
    </a>
  </p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 8px">
    Ne găsiți la <strong>+40 799 069 256</strong> sau răspundeți la acest e-mail.
  </p>
  <p style="font-size:12px;color:#6b7280;margin:24px 0 0">RealTrust Timișoara · ApArt Hotel · wa.me/${PUBLIC_WA_NUMBER}</p>
</div></body></html>`,
  };
}

/**
 * Trimite clientului oferta pe e-mail (o singură dată per conversație + apartament).
 * Fără adresă de e-mail cunoscută → nu trimite nimic, fără erori.
 */
export async function notifyClientOfferEmail(
  supabase: Db,
  args: {
    phone: string;
    conversation_id: string;
    property: OfferEmailProperty;
    step?: string;
  },
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, email")
      .eq("whatsapp_number", args.phone)
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const email = String(lead?.email ?? "").trim();
    if (!email || !email.includes("@")) return { sent: false, reason: "no_client_email" };

    const dedupeKey = `client_offer_email:${args.property?.id ?? "generic"}`;
    const { data: already } = await supabase
      .from("make_lead_events")
      .select("id")
      .eq("conversation_id", args.conversation_id)
      .eq("event", "client_offer_email")
      .contains("payload", { dedupe: dedupeKey })
      .limit(1)
      .maybeSingle();
    if (already) return { sent: false, reason: "already_sent" };

    const { subject, html } = buildClientOfferEmail(args.property, lead?.name ?? null);
    const res = await sendTeamEmail(
      { to: email, subject, html, leadId: lead?.id ?? null, source: "wa-client-offer" },
      supabase as never,
    );

    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: "client_offer_email",
      conversation_id: args.conversation_id,
      phone_normalized: args.phone,
      lead_id: lead?.id ?? null,
      message: subject,
      status: res.sent ? "sent" : "failed",
      error: res.sent ? null : (res.error ?? "email_failed"),
      payload: {
        dedupe: dedupeKey,
        recipient: email,
        step: args.step ?? null,
        property_id: args.property?.id ?? null,
        price: args.property?.price ?? null,
      },
    });

    return { sent: res.sent, reason: res.sent ? undefined : res.error };
  } catch (e) {
    console.error("[waClientOfferEmail] failed:", (e as Error)?.message);
    return { sent: false, reason: "exception" };
  }
}
