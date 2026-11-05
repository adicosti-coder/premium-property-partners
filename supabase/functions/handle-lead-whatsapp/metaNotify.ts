// Trimitere directă prin Meta pentru cererile calculatorului: alertă către
// Andrei (număr de administrare) și confirmare prin șablon către vizitator.
// Rezervă fiecare trimitere în `request_idempotency` înainte de Meta; nu reîncearcă.
import { WA_API_VERSION, WA_BUSINESS_ACCOUNT_ID, WA_PHONE_NUMBER_ID, waToken } from "../_shared/waConfig.ts";
import {
  CALC_ALERT_TEMPLATE, CALC_LANG, CALC_VISITOR_TEMPLATE, calcLeadAdminUrl, cleanParam, renderTemplate,
} from "../_shared/calculatorLeadTemplates.ts";

export const ADMIN_ALERT_NUMBER = "40723154520";

export type DeliveryResult = { status: "sent" | "skipped" | "failed"; mode?: "template" | "text"; detail?: string; message_id?: string };

// deno-lint-ignore no-explicit-any
type Client = any;

async function approvedTemplates(token: string): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,language&limit=200`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { console.error(`[calc-wa] template list ${r.status}: ${await r.text()}`); return out; }
    for (const t of (await r.json()).data ?? []) if (t.status === "APPROVED" && t.language === CALC_LANG) out.add(t.name);
  } catch (e) { console.error("[calc-wa] template list failed", e); }
  return out;
}

async function reserve(supabase: Client, key: string) {
  const { error } = await supabase.from("request_idempotency").insert({
    key, scope: "calc-lead-wa", expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  });
  return !error;
}

async function sendMeta(token: string, body: Record<string, unknown>): Promise<DeliveryResult> {
  try {
    const r = await fetch(`https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    if (!r.ok) { console.error(`[calc-wa] Meta ${r.status}: ${text}`); return { status: "failed", detail: `${r.status}: ${text.slice(0, 300)}` }; }
    return { status: "sent", message_id: JSON.parse(text)?.messages?.[0]?.id };
  } catch (e) {
    return { status: "failed", detail: String(e).slice(0, 300) };
  }
}

export async function notifyCalculatorLead(supabase: Client, input: {
  leadId: string; name: string; phone: string; location: string; serviceTag: string | null;
  property: string; incomeRange: string;
}): Promise<{ admin: DeliveryResult; visitor: DeliveryResult }> {
  const token = waToken();
  if (!token) return { admin: { status: "skipped", detail: "missing_token" }, visitor: { status: "skipped", detail: "missing_token" } };
  const approved = await approvedTemplates(token);

  const adminParams = [
    cleanParam(input.name, 80), cleanParam(input.phone, 20),
    cleanParam(`${input.location}${input.serviceTag ? ` ${input.serviceTag}` : ""}`, 160),
    cleanParam(input.property, 120), cleanParam(input.incomeRange, 60), calcLeadAdminUrl(input.leadId),
  ];
  let admin: DeliveryResult = { status: "skipped", detail: "already_sent" };
  if (await reserve(supabase, `${input.leadId}:admin`)) {
    admin = approved.has(CALC_ALERT_TEMPLATE.name)
      ? { ...(await sendMeta(token, { to: ADMIN_ALERT_NUMBER, type: "template", template: {
          name: CALC_ALERT_TEMPLATE.name, language: { code: CALC_LANG },
          components: [{ type: "body", parameters: adminParams.map((text) => ({ type: "text", text })) }],
        } })), mode: "template" }
      // Până la aprobare: text liber (ajunge doar dacă numărul de administrare a scris în ultimele 24h).
      : { ...(await sendMeta(token, { to: ADMIN_ALERT_NUMBER, type: "text", text: {
          preview_url: false, body: renderTemplate(CALC_ALERT_TEMPLATE.body, adminParams) } })), mode: "text" };
  }

  let visitor: DeliveryResult = { status: "skipped", detail: "template_not_approved" };
  if (approved.has(CALC_VISITOR_TEMPLATE.name)) {
    visitor = { status: "skipped", detail: "already_sent" };
    if (await reserve(supabase, `${input.leadId}:visitor`)) {
      const params = [cleanParam(input.name.split(/\s+/)[0], 40), cleanParam(input.location, 100),
        cleanParam(input.property, 100), cleanParam(input.incomeRange, 60)];
      visitor = { ...(await sendMeta(token, { to: input.phone, type: "template", template: {
        name: CALC_VISITOR_TEMPLATE.name, language: { code: CALC_LANG },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      } })), mode: "template" };
    }
  }
  return { admin, visitor };
}
