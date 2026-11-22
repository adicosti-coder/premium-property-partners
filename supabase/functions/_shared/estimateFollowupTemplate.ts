// Șablonul Meta pentru follow-up-ul după deschiderea linkului scurt /e/<cod>.
// Mesaj inițiat de noi (proprietarul doar a deschis linkul, nu a scris) → fără sesiune
// de 24h, deci e nevoie de un șablon aprobat de Meta.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "./waConfig.ts";
import { ESTIMATE_FOLLOWUP_COMPONENTS, ESTIMATE_FOLLOWUP_LANGUAGE, ESTIMATE_FOLLOWUP_TEMPLATE } from "./estimateFollowup.ts";

/** Starea șablonului la Meta (APPROVED / PENDING / REJECTED …); îl trimite la aprobare dacă lipsește. */
export async function ensureEstimateFollowupTemplate(): Promise<string> {
  const token = waToken();
  if (!token) return "missing_wa_token";
  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const q = await fetch(`${base}?name=${ESTIMATE_FOLLOWUP_TEMPLATE}&fields=name,status,language&limit=10`, { headers });
    const j = await q.json().catch(() => ({}));
    if (!q.ok) return `check_failed:${JSON.stringify(j).slice(0, 200)}`;
    const t = (j?.data ?? []).find((x: { name?: string; language?: string }) =>
      x.name === ESTIMATE_FOLLOWUP_TEMPLATE && x.language === ESTIMATE_FOLLOWUP_LANGUAGE);
    if (t) return String(t.status || "UNKNOWN");
    const c = await fetch(base, {
      method: "POST", headers,
      body: JSON.stringify({ name: ESTIMATE_FOLLOWUP_TEMPLATE, language: ESTIMATE_FOLLOWUP_LANGUAGE, category: "MARKETING", components: ESTIMATE_FOLLOWUP_COMPONENTS }),
    });
    const cj = await c.json().catch(() => ({}));
    return c.ok ? String(cj?.status || "PENDING") : `create_failed:${JSON.stringify(cj).slice(0, 200)}`;
  } catch (e) {
    return `check_failed:${String((e as Error)?.message ?? e).slice(0, 120)}`;
  }
}
