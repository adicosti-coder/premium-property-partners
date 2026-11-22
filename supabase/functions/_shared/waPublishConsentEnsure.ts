// Auto-asigurarea șablonului de acord v4 la Meta: îl trimite la aprobare dacă nu e înregistrat.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "./waConfig.ts";
import {
  WA_PUBLISH_CONSENT_CATEGORY, WA_PUBLISH_CONSENT_COMPONENTS, WA_PUBLISH_CONSENT_LANGUAGE,
  WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE, WA_PUBLISH_CONSENT_TEMPLATE,
} from "./waPublishConsentTemplate.ts";

const base = () => `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

async function templateRows(name: string, token: string) {
  const r = await fetch(`${base()}?name=${name}&fields=name,status,language,category,components&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`check_failed:${JSON.stringify(j).slice(0, 200)}`);
  return ((j?.data ?? []) as Array<{ name?: string; language?: string; status?: string }>)
    .filter((t) => t.name === name && t.language === WA_PUBLISH_CONSENT_LANGUAGE);
}

/** Starea v4 la Meta (APPROVED / PENDING / REJECTED …); dacă lipsește, îl creează (MARKETING, ro). */
export async function ensurePublishConsentTemplate(): Promise<string> {
  const token = waToken();
  if (!token) return "missing_wa_token";
  try {
    const [t] = await templateRows(WA_PUBLISH_CONSENT_TEMPLATE, token);
    if (t) return String(t.status || "UNKNOWN");
    const c = await fetch(base(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: WA_PUBLISH_CONSENT_TEMPLATE, language: WA_PUBLISH_CONSENT_LANGUAGE,
        category: WA_PUBLISH_CONSENT_CATEGORY, components: WA_PUBLISH_CONSENT_COMPONENTS,
      }),
    });
    const cj = await c.json().catch(() => ({}));
    return c.ok ? String(cj?.status || "PENDING") : `create_failed:${JSON.stringify(cj).slice(0, 200)}`;
  } catch (e) {
    return String((e as Error)?.message ?? e).slice(0, 200);
  }
}

/** Starea v3 (folosit în tranziție), fără a-l modifica. */
export async function previousPublishConsentTemplateStatus(): Promise<string> {
  const token = waToken();
  if (!token) return "missing_wa_token";
  try {
    const [t] = await templateRows(WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE, token);
    return t ? String(t.status || "UNKNOWN") : "NOT_FOUND";
  } catch (e) {
    return String((e as Error)?.message ?? e).slice(0, 200);
  }
}
