// Backup pe e-mail către agentul alocat conversației — trimis în momentul în
// care sosește mesajul clientului (nu doar în rezumatul zilnic de la 20:15).
import { sendTeamEmail } from "./teamEmail.ts";
import { prospectSummary, type ProspectContext } from "./waAutoReply.ts";
import { WA_PHONE_NUMBER_ID, waToken } from "./waConfig.ts";

/** Numerele de administrare care primesc alertele urgente pe WhatsApp (0723 154 520 și 0799 069 256). */
export const ADMIN_WA_ALERT_NUMBERS = ["40723154520", "40799069256"];

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

/**
 * Backup pe e-mail în momentul ofertei: agentul alocat primește imediat
 * apartamentul propus și pașii trimiși clientului, nu doar în rezumatul de 20:15.
 */
export async function notifyAgentOffer(
  supabase: any,
  input: {
    conversation_id: string | null;
    phone: string;
    step: "offer_sent" | "offer_followup" | "negotiation";
    property_name?: string | null;
    property_url?: string | null;
    price?: number | null;
    message?: string | null;
    delivered: boolean;
    error?: string | null;
  },
) {
  const agent = await resolveAgent(supabase, input.conversation_id);
  const when = new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
  const label = input.step === "offer_sent"
    ? "Apartament propus clientului"
    : input.step === "offer_followup"
    ? "Ofertă și pași următori trimiși"
    : "Negociere pornită";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:620px">
      <h2 style="margin:0 0 6px">${esc(label)}</h2>
      <p style="color:#555;font-size:13px;margin:0 0 16px">
        ${esc(when)} (ora României) · agent alocat: <strong>${esc(agent.name)}</strong>
      </p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0">Client</td><td><strong>${esc(input.phone)}</strong></td></tr>
        ${input.property_name ? `<tr><td style="padding:4px 12px 4px 0">Apartament</td><td><strong>${esc(input.property_name)}</strong></td></tr>` : ""}
        ${input.price ? `<tr><td style="padding:4px 12px 4px 0">Preț</td><td>${esc(Number(input.price).toLocaleString("ro-RO"))} €</td></tr>` : ""}
        ${input.property_url ? `<tr><td style="padding:4px 12px 4px 0">Anunț</td><td><a href="${esc(input.property_url)}">${esc(input.property_url)}</a></td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0">Livrare WhatsApp</td><td>${input.delivered ? "livrat" : `eșuat${input.error ? ` — ${esc(input.error)}` : ""}`}</td></tr>
      </table>
      ${input.message ? `<div style="margin:16px 0;padding:12px;border-left:3px solid #D4AF37;background:#faf8f2">
        <div style="font-size:12px;color:#666;margin-bottom:4px">Mesajul trimis clientului</div>
        <div style="font-size:14px;white-space:pre-wrap">${esc(input.message).slice(0, 2000)}</div>
      </div>` : ""}
      <p style="font-size:13px;color:#555">
        Continuă discuția: <a href="https://realtrust.ro/admin?tab=whatsapp-live">Admin → Conversații live</a>
      </p>
    </div>`;

  try {
    const res = await sendTeamEmail({
      to: agent.email,
      subject: `WhatsApp — ${label.toLowerCase()} · ${input.property_name || input.phone}`,
      html,
      source: `wa-offer-${input.step}`,
    }, supabase);
    return { ...res, agent };
  } catch (e) {
    console.error("[wa-agent-notify] offer backup failed:", e);
    return { sent: false, error: String(e).slice(0, 300), agent };
  }
}


const HANDOVER_LABEL: Record<string, string> = {
  owner_viewing: "vrea VIZIONARE",
  owner_collab_yes: "acceptă COLABORAREA",
  owner_call_request: "cere să fie SUNAT",
  owner_hotel_calc: "vrea CALCUL REGIM HOTELIER",
  owner_question: "are o ÎNTREBARE",
  owner_consent_unverified: "a apăsat DA, dar Make nu a confirmat șablonul",
  owner_custom_notes: "a trimis o MODIFICARE / SOLICITARE",
};

/** Modificări / solicitări ale proprietarului: alerta începe cu antetul fix, urmat de textul exact. */
const OWNER_REQUEST_KINDS = new Set(["owner_custom_notes", "owner_hotel_calc"]);
const OWNER_REQUEST_HEADLINE = "[MODIFICARE/SOLICITARE PROPRIETAR DETECTATĂ]:";

export type OwnerHandoverResult = { email_sent: boolean; wa_sent: string[]; wa_failed: string[] };

/** Alertă imediată: proprietarul s-a arătat interesat → preia un om. */
export async function notifyOwnerHandover(
  supabase: any,
  input: {
    phone: string;
    profile_name?: string | null;
    message: string;
    kind: string;
    conversation_id?: string | null;
    prospect?: ProspectContext | null;
  },
): Promise<OwnerHandoverResult> {
  const result: OwnerHandoverResult = { email_sent: false, wa_sent: [], wa_failed: [] };
  const agent = await resolveAgent(supabase, input.conversation_id ?? null);
  const label = HANDOVER_LABEL[input.kind] ?? "este interesat";
  const p = input.prospect ?? null;
  const price = p?.price ? `${Math.round(Number(p.price)).toLocaleString("ro-RO")} ${String(p.currency || "EUR").toUpperCase() === "RON" ? "lei" : "€"}` : "—";
  const wa = `https://wa.me/${input.phone.replace(/\D/g, "")}`;
  const isRequest = OWNER_REQUEST_KINDS.has(input.kind);
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:620px">
      ${isRequest ? `<p style="margin:0 0 12px;font-size:16px"><b>${esc(OWNER_REQUEST_HEADLINE)}</b> ${esc(input.message)}</p>` : ""}
      <h2 style="margin:0 0 6px;color:#b45309">🔥 Proprietar ${esc(label)}</h2>
      <p style="margin:0 0 12px">${input.kind === "owner_question" ? "Preia conversația — Andrei a răspuns automat, dar întrebarea merită un răspuns de la un om." : "Preia conversația acum — Andrei a confirmat automat și a spus că revine un coleg."}</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 10px 4px 0"><b>Nume</b></td><td>${esc(input.profile_name || p?.contact_name || "—")}</td></tr>
        <tr><td style="padding:4px 10px 4px 0"><b>Telefon</b></td><td>${esc(input.phone)}</td></tr>
        <tr><td style="padding:4px 10px 4px 0"><b>Anunț</b></td><td>${esc(p?.title || "—")}</td></tr>
        <tr><td style="padding:4px 10px 4px 0"><b>Zonă / camere</b></td><td>${esc(p?.zone || p?.location || "—")} / ${esc(p?.rooms ?? "—")}</td></tr>
        <tr><td style="padding:4px 10px 4px 0"><b>Preț anunț</b></td><td>${esc(price)}</td></tr>
      </table>
      <p style="margin:14px 0 6px"><b>Mesajul proprietarului:</b></p>
      <blockquote style="margin:0;padding:8px 12px;border-left:3px solid #D4AF37;background:#faf7ee">${esc(input.message)}</blockquote>
      <p style="margin:16px 0"><a href="${wa}" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Răspunde pe WhatsApp</a></p>
    </div>`;
  const recipients = Array.from(new Set([agent.email, FALLBACK_AGENT_EMAIL]));
  for (const to of recipients) {
    try {
      const r = await sendTeamEmail({
        to,
        subject: isRequest
          ? `${OWNER_REQUEST_HEADLINE} ${input.message.replace(/\s+/g, " ").slice(0, 120)}`
          : `URGENT — proprietar ${label}: ${input.profile_name || input.phone}`,
        html,
        leadId: null,
        source: "wa-owner-handover",
      }, supabase);
      if (r?.sent) result.email_sent = true;
    } catch (e) {
      console.error("[wa-owner-handover] email failed:", e);
    }
  }

  // Alertă și pe WhatsApp, către numărul de administrare, ca preluarea să fie
  // imediată chiar dacă e-mailul nu este citit. Funcționează în fereastra de
  // 24h deschisă de ultimul mesaj trimis de admin către numărul de companie;
  // în afara ei Meta respinge mesajul liber — e-mailul rămâne canalul sigur.
  try {
    const token = waToken();
    if (token) {
      const waText = [
        isRequest ? `*${OWNER_REQUEST_HEADLINE}* ${input.message.slice(0, 600)}` : null,
        `🔥 URGENT: proprietar ${label}`,
        `Nume: ${input.profile_name || p?.contact_name || "—"}`,
        `Telefon: ${input.phone}`,
        p?.title ? `Anunț: ${p.title}` : null,
        p?.zone || p?.rooms ? `Zonă/camere: ${p?.zone || p?.location || "—"} / ${p?.rooms ?? "—"}` : null,
        isRequest ? null : `Mesaj: ${input.message.slice(0, 300)}`,
        `Răspunde: ${wa}`,
      ].filter(Boolean).join("\n");
      for (const to of ADMIN_WA_ALERT_NUMBERS) {
        const resp = await fetch(
          `https://graph.facebook.com/v20.0/${WA_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { preview_url: false, body: waText },
            }),
          },
        );
        if (!resp.ok) {
          result.wa_failed.push(to);
          console.error("[wa-owner-handover] admin WA alert failed:", to, resp.status, (await resp.text()).slice(0, 300));
        } else {
          result.wa_sent.push(to);
        }
      }
    }
  } catch (e) {
    console.error("[wa-owner-handover] admin WA alert error:", e);
  }
  return result;
}


/** Cerere de apel de la client („Mă puteți suna?”): colegul primește tot ce s-a notat. */
export async function notifyClientCallRequest(
  supabase: any,
  input: { phone: string; profile_name?: string | null; conversation_id?: string | null; summary: { topic: string; interval: string | null; zone: string | null; rooms: string | null; day: string | null; time: string | null } },
) {
  const agent = await resolveAgent(supabase, input.conversation_id ?? null);
  const s = input.summary;
  const wa = `https://wa.me/${input.phone.replace(/\D/g, "")}`;
  const lines = [
    `📞 Apel cerut de client: ${s.topic}`,
    `Nume: ${input.profile_name || "—"}`,
    `Telefon: ${input.phone}`,
    `Interval: ${s.interval || "—"}`,
    `Zonă: ${s.zone || "—"} · Camere: ${s.rooms || "—"}`,
    `Zi: ${s.day || "—"} · Ora: ${s.time || "—"}`,
    `WhatsApp: ${wa}`,
  ];
  const html = `<div style="font-family:Arial,sans-serif">${lines.map((l) => `<p style="margin:4px 0">${esc(l)}</p>`).join("")}</div>`;
  for (const to of Array.from(new Set([agent.email, FALLBACK_AGENT_EMAIL]))) {
    try {
      await sendTeamEmail({ to, subject: `Apel de făcut — ${s.topic}: ${input.profile_name || input.phone}`, html, leadId: null, source: "wa-client-call" }, supabase);
    } catch (e) { console.error("[wa-client-call] email failed:", e); }
  }
  try {
    const token = waToken();
    if (token) {
      const resp = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: ADMIN_WA_ALERT_NUMBERS[0], type: "text", text: { preview_url: false, body: lines.join("\n") } }),
      });
      if (!resp.ok) console.error("[wa-client-call] admin WA failed:", resp.status, (await resp.text()).slice(0, 300));
    }
  } catch (e) { console.error("[wa-client-call] admin WA error:", e); }
}
