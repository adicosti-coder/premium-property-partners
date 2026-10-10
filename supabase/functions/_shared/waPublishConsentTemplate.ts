import { publishConsentRequestText } from "./waAutoReply.ts";

export const WA_PUBLISH_CONSENT_TEMPLATE = "acord_publicare_proprietar_v3";
export const WA_PUBLISH_CONSENT_LANGUAGE = "ro";
export const WA_PUBLISH_CONSENT_BODY = publishConsentRequestText({ analysisUrl: "{{1}}" });
export const WA_PUBLISH_CONSENT_COMPONENTS = [{
  type: "BODY",
  text: WA_PUBLISH_CONSENT_BODY,
  example: { body_text: [[
    "https://realtrust.ro/analiza-anunt?url=https%3A%2F%2Fwww.olx.ro%2Fd%2Foferta%2Fexemplu",
  ]] },
}];

export function consentPropertyLabel(p?: { title?: string | null; zone?: string | null } | null): string {
  return String(p?.title || (p?.zone ? `apartamentul din zona ${p.zone}` : "proprietății dumneavoastră"))
    .replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function consentAnalysisUrl(p?: { source_url?: string | null } | null): string {
  const u = String(p?.source_url || "").trim();
  return u ? `https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(u)}` : "https://realtrust.ro/analiza-anunt";
}

export function isApprovedConsentTemplate(rows: Array<{ name?: string; status?: string; language?: string; components?: Array<{ type?: string; text?: string }> }>): boolean {
  return rows.some((t) => t.name === WA_PUBLISH_CONSENT_TEMPLATE &&
    t.status === "APPROVED" && t.language === WA_PUBLISH_CONSENT_LANGUAGE &&
    t.components?.some((c) => c.type === "BODY" && c.text === WA_PUBLISH_CONSENT_BODY) === true);
}
