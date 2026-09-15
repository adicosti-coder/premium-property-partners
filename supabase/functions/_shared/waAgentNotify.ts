// Notificare pe e-mail către agent la primul mesaj primit de la un client pe
// WhatsApp — backup pentru conversația live și pentru automatizarea Make.
import { sendTeamEmail } from "./teamEmail.ts";
import { prospectSummary, type ProspectContext } from "./waAutoReply.ts";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function agentEmail(): string {
  const raw = (Deno.env.get("AGENT_NOTIFY_EMAIL") || "").trim();
  return raw.includes("@") ? raw : "info@realtrust.ro";
}

export async function notifyAgentFirstMessage(
  supabase: any,
  input: {
    phone: string;
    profile_name?: string | null;
    message: string;
    conversation_id?: string | null;
    lead_id?: string | null;
    prospect?: ProspectContext;
    auto_reply?: string | null;
  },
) {
  const summary = prospectSummary(input.prospect ?? null);
  const when = new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:620px">
      <h2 style="margin:0 0 6px">Mesaj nou pe WhatsApp</h2>
      <p style="color:#555;font-size:13px;margin:0 0 16px">Primit ${esc(when)} (ora României).</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0">Client</td><td><strong>${esc(input.profile_name || "necunoscut")}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Telefon</td><td><strong>${esc(input.phone)}</strong></td></tr>
        ${summary ? `<tr><td style="padding:4px 12px 4px 0">Anunț</td><td>${esc(summary.replace(/^Despre /, "").replace(/:$/, ""))}</td></tr>` : ""}
        ${input.auto_reply ? `<tr><td style="padding:4px 12px 4px 0">Răspuns automat</td><td>${esc(input.auto_reply)}</td></tr>` : ""}
      </table>
      <div style="margin:16px 0;padding:12px;border-left:3px solid #D4AF37;background:#faf8f2">
        <div style="font-size:12px;color:#666;margin-bottom:4px">Mesajul clientului</div>
        <div style="font-size:14px;white-space:pre-wrap">${esc(input.message).slice(0, 2000)}</div>
      </div>
      <p style="font-size:13px;color:#555">
        Conversația completă: <a href="https://realtrust.ro/admin/whatsapp-live">Admin → Conversații live</a>
      </p>
    </div>`;

  try {
    return await sendTeamEmail({
      to: agentEmail(),
      subject: `WhatsApp — mesaj nou de la ${input.profile_name || input.phone}`,
      html,
      leadId: input.lead_id ?? null,
      source: "wa-first-message-agent-notify",
    }, supabase);
  } catch (e) {
    console.error("[wa-agent-notify] failed:", e);
    return { sent: false, error: String(e).slice(0, 300) };
  }
}
