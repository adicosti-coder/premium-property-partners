// Backup pe e-mail către agentul alocat conversației — trimis în momentul în
// care sosește mesajul clientului (nu doar în rezumatul zilnic de la 20:15).
import { sendTeamEmail } from "./teamEmail.ts";
import { prospectSummary, type ProspectContext } from "./waAutoReply.ts";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const FALLBACK_AGENT_EMAIL = "info@realtrust.ro";

export type AgentInfo = { id: string | null; name: string; email: string };

/** Alocă (o singură dată) un agent activ conversației și îl returnează. */
export async function resolveAgent(
  supabase: any,
  conversationId: string | null,
): Promise<AgentInfo> {
  const fallback: AgentInfo = { id: null, name: "Echipa RealTrust", email: FALLBACK_AGENT_EMAIL };
  if (!conversationId) return fallback;
  try {
    const { data: agentId } = await supabase.rpc("wa_assign_agent", {
      _conversation_id: conversationId,
    });
    if (!agentId) return fallback;
    const { data: agent } = await supabase
      .from("wa_agents")
      .select("id, name, email")
      .eq("id", agentId)
      .maybeSingle();
    if (!agent?.email) return fallback;
    return { id: agent.id, name: agent.name || "Agent", email: agent.email };
  } catch (e) {
    console.error("[wa-agent-notify] assign failed:", e);
    return fallback;
  }
}

export async function notifyAgentInbound(
  supabase: any,
  input: {
    phone: string;
    profile_name?: string | null;
    message: string;
    conversation_id?: string | null;
    lead_id?: string | null;
    prospect?: ProspectContext | null;
    auto_reply?: string | null;
    first?: boolean;
    meta_response?: string | null;
  },
) {
  const agent = await resolveAgent(supabase, input.conversation_id ?? null);
  const summary = prospectSummary(input.prospect ?? null);
  const when = new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
  const kind = input.first ? "Primul mesaj" : "Mesaj nou";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:620px">
      <h2 style="margin:0 0 6px">${esc(kind)} pe WhatsApp</h2>
      <p style="color:#555;font-size:13px;margin:0 0 16px">
        Primit ${esc(when)} (ora României) · agent alocat: <strong>${esc(agent.name)}</strong>
      </p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0">Client</td><td><strong>${esc(input.profile_name || "necunoscut")}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0">Telefon</td><td><strong>${esc(input.phone)}</strong></td></tr>
        ${summary ? `<tr><td style="padding:4px 12px 4px 0">Anunț</td><td>${esc(summary.replace(/^Despre /, "").replace(/:$/, ""))}</td></tr>` : ""}
        ${input.auto_reply ? `<tr><td style="padding:4px 12px 4px 0">Răspuns automat</td><td>${esc(input.auto_reply)}</td></tr>` : ""}
        ${input.meta_response ? `<tr><td style="padding:4px 12px 4px 0">Răspuns Meta</td><td>${esc(input.meta_response)}</td></tr>` : ""}
      </table>
      <div style="margin:16px 0;padding:12px;border-left:3px solid #D4AF37;background:#faf8f2">
        <div style="font-size:12px;color:#666;margin-bottom:4px">Mesajul clientului</div>
        <div style="font-size:14px;white-space:pre-wrap">${esc(input.message).slice(0, 2000)}</div>
      </div>
      <p style="font-size:13px;color:#555">
        Conversația completă: <a href="https://realtrust.ro/admin?tab=whatsapp-live">Admin → Conversații live</a>
      </p>
    </div>`;

  try {
    const res = await sendTeamEmail({
      to: agent.email,
      subject: `WhatsApp — ${input.first ? "client nou" : "mesaj nou"} de la ${input.profile_name || input.phone}`,
      html,
      leadId: input.lead_id ?? null,
      source: "wa-inbound-agent-notify",
    }, supabase);
    return { ...res, agent };
  } catch (e) {
    console.error("[wa-agent-notify] failed:", e);
    return { sent: false, error: String(e).slice(0, 300), agent };
  }
}

/** Compatibilitate cu apelurile anterioare. */
export const notifyAgentFirstMessage = (supabase: any, input: Parameters<typeof notifyAgentInbound>[1]) =>
  notifyAgentInbound(supabase, { ...input, first: true });
