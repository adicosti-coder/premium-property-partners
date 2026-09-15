// E-mail automat către CLIENT cu linkul chatului WhatsApp, ca să nu mai întrebe
// „unde suntem / unde vă scriu”. Se trimite o singură dată per conversație,
// doar când avem adresa lui de e-mail (dintr-un lead legat de același număr).
import { sendTeamEmail } from "./teamEmail.ts";

/** Numărul public de WhatsApp al RealTrust (contact clienți). */
export const PUBLIC_WA_NUMBER = "40799069256";
export const PUBLIC_WA_LINK = `https://wa.me/${PUBLIC_WA_NUMBER}`;

type Db = { from: (t: string) => any };

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildClientChatEmail(name?: string | null): { subject: string; html: string } {
  const hello = name ? `Bună ziua, ${escapeHtml(name)}!` : "Bună ziua!";
  return {
    subject: "Discuția dvs. cu RealTrust Timișoara — link direct de chat",
    html: `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:16px;margin:0 0 12px">${hello}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">
    Vă mulțumim pentru mesaj. Discuția continuă direct pe WhatsApp, unde vă răspundem
    între <strong>09:00 și 20:00</strong> (luni–sâmbătă).
  </p>
  <p style="margin:20px 0">
    <a href="${PUBLIC_WA_LINK}" style="background:#D4AF37;color:#111827;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold;display:inline-block">
      Deschideți chatul cu RealTrust
    </a>
  </p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 8px">
    Puteți scrie oricând la <strong>+40 799 069 256</strong> sau răspunde la acest e-mail.
  </p>
  <p style="font-size:14px;line-height:1.6;margin:0 0 8px">
    Verificați disponibilitatea pentru cazare: <a href="https://realtrust.ro/rezervare">realtrust.ro/rezervare</a>
  </p>
  <p style="font-size:12px;color:#6b7280;margin:24px 0 0">RealTrust Timișoara · ApArt Hotel</p>
</div></body></html>`,
  };
}

/**
 * Trimite clientului linkul chatului, o singură dată per conversație.
 * Fără adresă de e-mail cunoscută → nu trimite nimic (fără erori).
 */
export async function notifyClientChatLink(
  supabase: Db,
  args: { phone: string; conversation_id: string },
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

    // O singură dată per conversație.
    const { count } = await supabase
      .from("make_lead_events")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", args.conversation_id)
      .eq("event", "client_chat_link_email");
    if (count) return { sent: false, reason: "already_sent" };

    const { subject, html } = buildClientChatEmail(lead?.name ?? null);
    const res = await sendTeamEmail(
      { to: email, subject, html, leadId: lead?.id ?? null, source: "wa-client-chat-link" },
      supabase as never,
    );

    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: "client_chat_link_email",
      conversation_id: args.conversation_id,
      phone_normalized: args.phone,
      lead_id: lead?.id ?? null,
      message: subject,
      status: res.sent ? "sent" : "failed",
      error: res.sent ? null : (res.error ?? "email_failed"),
      payload: { recipient: email, from: res.from ?? null },
    });

    return { sent: res.sent, reason: res.sent ? undefined : res.error };
  } catch (e) {
    console.error("[waClientEmail] failed:", (e as Error)?.message);
    return { sent: false, reason: "exception" };
  }
}
