// Re-contactarea unică pe WhatsApp a proprietarilor care nu au răspuns la primul mesaj
// cu butoane, dacă anunțul rămâne activ la 30 de zile după outreach.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "./waConfig.ts";
import { WA_OWNER_OUTREACH_FOOTER } from "./waOwnerOutreachTemplate.ts";

export const WA_OWNER_RECONTACT_TEMPLATE = "outreach_proprietar_reluare_v1";
export const WA_OWNER_RECONTACT_LANGUAGE = "ro";
export const OWNER_RECONTACT_AFTER_DAYS = 30;
export const OWNER_RECONTACT_SOURCE = "owner_recontact";

// Meta nu acceptă o variabilă la finalul corpului → încheiem cu „Vă mulțumim!”.
export const WA_OWNER_RECONTACT_BODY =
  "Bună ziua! Am văzut că apartamentul dumneavoastră din {{1}} este încă disponibil. " +
  "Avem noi cereri de la investitori și clienți calificați în zonă. Doriți să îl prezentăm acestora? {{2}}\n\nVă mulțumim!";

export const WA_OWNER_RECONTACT_COMPONENTS = [
  {
    type: "BODY",
    text: WA_OWNER_RECONTACT_BODY,
    example: { body_text: [["Iosefin", "https://realtrust.ro/analiza-anunt?zona=Iosefin&tip=vanzare&listing_type=vanzare"]] },
  },
  { type: "FOOTER", text: WA_OWNER_OUTREACH_FOOTER },
];

/** Stările care înseamnă „mesajul cu butoane a plecat, proprietarul n-a răspuns”. */
const SENT_NO_REPLY = new Set(["whatsapp_sent", "whatsapp_delivered", "whatsapp_read"]);
const CLOSED_LIFECYCLE = new Set(["rejected", "expired", "failed", "posted"]);
const INACTIVE_SOURCE = new Set(["expired", "inactiv_sursa"]);

export type RecontactCandidate = {
  outreach_status?: string | null;
  outreach_status_at?: string | null;
  outreach_recontact_at?: string | null;
  lifecycle_status?: string | null;
  expiry_check_status?: string | null;
  do_not_call?: boolean | null;
  auto_blacklisted_at?: string | null;
  agency_suspicion_score?: number | null;
  seller_type?: string | null;
};

/** Motivul pentru care anunțul NU se re-contactează, sau null dacă e eligibil. */
export function recontactBlocker(p: RecontactCandidate, now: Date = new Date()): string | null {
  if (!SENT_NO_REPLY.has(String(p.outreach_status ?? ""))) return "status";
  if (p.outreach_recontact_at) return "already_recontacted";
  const at = Date.parse(String(p.outreach_status_at ?? ""));
  if (!Number.isFinite(at) || now.getTime() - at < OWNER_RECONTACT_AFTER_DAYS * 86400000) return "too_early";
  if (CLOSED_LIFECYCLE.has(String(p.lifecycle_status ?? ""))) return "closed";
  if (INACTIVE_SOURCE.has(String(p.expiry_check_status ?? ""))) return "inactive_on_source";
  if (p.do_not_call || p.auto_blacklisted_at) return "excluded";
  if ((p.agency_suspicion_score ?? 0) >= 70 || ["agency", "agentie"].includes(String(p.seller_type ?? ""))) return "agency";
  return null;
}

/** Starea șablonului la Meta; îl trimite la aprobare dacă nu există încă. */
export async function ensureRecontactTemplate(): Promise<string> {
  const token = waToken();
  if (!token) return "missing_wa_token";
  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const q = await fetch(`${base}?name=${WA_OWNER_RECONTACT_TEMPLATE}&fields=name,status,language&limit=10`, { headers });
  const j = await q.json().catch(() => ({}));
  if (!q.ok) return `check_failed:${JSON.stringify(j).slice(0, 200)}`;
  const t = (j?.data ?? []).find((x: { name?: string; language?: string }) =>
    x.name === WA_OWNER_RECONTACT_TEMPLATE && x.language === WA_OWNER_RECONTACT_LANGUAGE);
  if (t) return String(t.status || "UNKNOWN");
  const c = await fetch(base, {
    method: "POST", headers,
    body: JSON.stringify({ name: WA_OWNER_RECONTACT_TEMPLATE, language: WA_OWNER_RECONTACT_LANGUAGE, category: "MARKETING", components: WA_OWNER_RECONTACT_COMPONENTS }),
  });
  const cj = await c.json().catch(() => ({}));
  return c.ok ? String(cj?.status || "PENDING") : `create_failed:${JSON.stringify(cj).slice(0, 200)}`;
}
