import { publishConsentRequestText } from "./waAutoReply.ts";
import { estimateShortUrl } from "./estimateShortLink.ts";

// v4 = formularea aprobată pe 22 nov 2026 (Andrei, estimare de randament, DA / NU).
// v3 rămâne în uz până când Meta aprobă v4, apoi trecerea se face singură.
export const WA_PUBLISH_CONSENT_TEMPLATE = "acord_publicare_proprietar_v4";
export const WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE = "acord_publicare_proprietar_v3";
export const WA_PUBLISH_CONSENT_TEMPLATES = [WA_PUBLISH_CONSENT_TEMPLATE, WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE] as const;
export const WA_PUBLISH_CONSENT_LANGUAGE = "ro";
export const WA_PUBLISH_CONSENT_CATEGORY = "MARKETING";
export const WA_PUBLISH_CONSENT_EXAMPLE_URL = "https://realtrust.ro/e/k7m2qx9a";
export const WA_PUBLISH_CONSENT_BODY = publishConsentRequestText({ analysisUrl: "{{1}}" });
export const WA_PUBLISH_CONSENT_COMPONENTS = [{
  type: "BODY",
  text: WA_PUBLISH_CONSENT_BODY,
  example: { body_text: [[WA_PUBLISH_CONSENT_EXAMPLE_URL]] },
}];

/** Corpul v3 (aprobat anterior de Meta: DA / NU). */
export const WA_PUBLISH_CONSENT_V3_BODY =
  "Bună ziua! Am generat o evaluare gratuită de piață pentru proprietatea dvs.: {{1}}\n\n" +
  "Reprezint RealTrust Timișoara și avem investitori activi. Promovarea este 100% gratuită (Comision 0% pentru dvs., fără exclusivitate).\n\n" +
  "Sunteți de acord să publicăm anunțul complet cu poze pe RealTrust? Răspundeți DA pentru acord sau NU dacă nu doriți.";

// Corpurile mai vechi ale v3 (cereau „DA” / „CONFIRM”), încă acceptate dacă Meta le are aprobate.
export const WA_PUBLISH_CONSENT_LEGACY_BODIES = [
  WA_PUBLISH_CONSENT_V3_BODY,
  "Bună ziua! Am generat o evaluare gratuită de piață pentru proprietatea dvs.: {{1}}\n\n" +
  "Reprezint RealTrust Timișoara și avem investitori activi. Promovarea este 100% gratuită (Comision 0% pentru dvs., fără exclusivitate).\n\n" +
  "Dacă doriți să publicăm anunțul complet cu poze pe site-ul nostru, răspundeți doar cu „DA” și îl activăm în 2 minute.",
  "Bună ziua! Am generat o evaluare gratuită de piață pentru proprietatea dvs.: {{1}}\n\n" +
  "Reprezint RealTrust Timișoara și avem investitori activi. Promovarea este 100% gratuită (Comision 0% pentru dvs., fără exclusivitate).\n\n" +
  "Dacă doriți să publicăm anunțul complet cu poze pe site-ul nostru, răspundeți doar cu „CONFIRM” și îl activăm în 2 minute.",
];

/** true pentru oricare dintre șabloanele de acord (v4 sau v3) — ambele primesc linkul estimării ca {{1}}. */
export function isPublishConsentTemplate(name: string | null | undefined): boolean {
  return (WA_PUBLISH_CONSENT_TEMPLATES as readonly string[]).includes(String(name ?? ""));
}

export function consentPropertyLabel(p?: { title?: string | null; zone?: string | null } | null): string {
  return String(p?.title || (p?.zone ? `apartamentul din zona ${p.zone}` : "proprietății dumneavoastră"))
    .replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function consentAnalysisUrl(p?: { source_url?: string | null; short_code?: string | null } | null): string {
  const short = estimateShortUrl(p);
  if (short) return short;
  const u = String(p?.source_url || "").trim();
  return u ? `https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(u)}` : "https://realtrust.ro/analiza-anunt";
}

type TemplateRow = { name?: string; status?: string; language?: string; components?: Array<{ type?: string; text?: string }> };

const hasBody = (t: TemplateRow, bodies: string[]) =>
  t.components?.some((c) => c.type === "BODY" && bodies.includes(String(c.text ?? ""))) === true;
const approved = (t: TemplateRow, name: string) =>
  t.name === name && t.status === "APPROVED" && t.language === WA_PUBLISH_CONSENT_LANGUAGE;

/**
 * Șablonul de acord care se poate trimite acum: v4 dacă Meta l-a aprobat cu corpul exact,
 * altfel v3 aprobat (corp curent sau unul dintre corpurile vechi), altfel null.
 */
export function approvedConsentTemplate(rows: TemplateRow[]): string | null {
  if (rows.some((t) => approved(t, WA_PUBLISH_CONSENT_TEMPLATE) && hasBody(t, [WA_PUBLISH_CONSENT_BODY]))) {
    return WA_PUBLISH_CONSENT_TEMPLATE;
  }
  if (rows.some((t) => approved(t, WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE) && hasBody(t, WA_PUBLISH_CONSENT_LEGACY_BODIES))) {
    return WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE;
  }
  return null;
}

export function isApprovedConsentTemplate(rows: TemplateRow[]): boolean {
  return approvedConsentTemplate(rows) !== null;
}
