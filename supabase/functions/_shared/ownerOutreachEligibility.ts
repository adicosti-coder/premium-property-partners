// Cine poate primi mesaje automate de prospectare pe WhatsApp.
// Regula (22 nov 2026): agențiile sunt blocate complet (status `blocked_agency`,
// fără outreach și fără răspuns automat); trimiterea automată pleacă DOAR către
// proprietari particulari confirmați (`seller_type = privat`) cu scor > 60.
// Fișier pur (fără Deno/Supabase), folosit de funcții, de panoul admin și de teste.
// Oglinda SQL: `public.prospect_is_agency` (aceiași termeni, aceeași eliminare a negațiilor).

export const OUTREACH_MIN_SCORE = 60;
export const BLOCKED_AGENCY_STATUS = "blocked_agency";

/** Surse de prim contact / reluare la rece din coada WhatsApp (nu răspunsuri cerute de proprietar). */
export const COLD_OUTREACH_SOURCES = new Set([
  "auto_import", "auto_score", "scraper", "owner_recontact", "followup", "followup2", "estimate_followup",
]);

export type OutreachProspect = {
  seller_type?: string | null;
  agency_suspicion_score?: number | null;
  owner_sentiment?: string | null;
  prospect_type?: string | null;
  contact_name?: string | null;
  title?: string | null;
  tags?: string[] | null;
  lead_score?: number | null;
  outreach_status?: string | null;
};

const AGENCY_TYPES = new Set(["agentie", "agency", "agent", "broker", "agent imobiliar"]);

export function normalizeAgencyText(raw: string | null | undefined): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // Numele portalurilor (imobiliare.ro, storia.ro) nu înseamnă agenție.
    .replace(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:ro|com|eu|net)\b\S*/g, " ")
    .replace(/[_|/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// „Fără agenții”, „nu doresc agenți”, „agențiile să se abțină” = proprietar care refuză agențiile.
const NEGATED_AGENCY_RE =
  /\b(?:fara|nu(?:\s+(?:doresc|dorim|vreau|vrem|accept|acceptam|lucrez|lucram|colaborez|colaboram))?(?:\s+cu)?|exclus|rog)\s+(?:\w+\s+){0,2}?(?:agenti\w*|agent\w*|intermediar\w*|imobiliare|broker\w*)(?:\s+imobiliar\w*)?/g;
const AGENCY_ABSTAIN_RE =
  /\b(?:agenti\w*|agent\w*|intermediar\w*)(?:\s+imobiliar\w*)?\s+(?:va\s+rog\s+)?(?:sa\s+nu|sa\s+se\s+abtina|abtineti\w*|nu\s+sunati|nu\s+ma\s+contactati)\b/g;
const AGENCY_KEYWORD_RE =
  /\b(?:agenti\w*|agency|agent|agenta|broker\w*|imobiliare|srl|consultant\w*\s+imobiliar\w*)\b/;
// În titluri „Imobiliare” e de obicei categoria portalului („… ' Imobiliare ' OLX.ro”), nu agenția.
const TITLE_AGENCY_KEYWORD_RE =
  /\b(?:agenti\w*|agency|agent|agenta|broker\w*|srl|consultant\w*\s+imobiliar\w*)\b/;

const withoutNegations = (raw: string | null | undefined) =>
  normalizeAgencyText(raw).replace(NEGATED_AGENCY_RE, " ").replace(AGENCY_ABSTAIN_RE, " ");

/** true dacă numele / eticheta conține un termen de agenție (fără negații de tip „fără agenții”). */
export function hasAgencyKeyword(raw: string | null | undefined): boolean {
  return AGENCY_KEYWORD_RE.test(withoutNegations(raw));
}

/** Ca `hasAgencyKeyword`, dar pentru titlul anunțului (fără cuvântul de categorie „imobiliare”). */
export function titleHasAgencyKeyword(raw: string | null | undefined): boolean {
  return TITLE_AGENCY_KEYWORD_RE.test(withoutNegations(raw));
}

/** Agenție după etichetă, categorie, tip de contact sau cuvinte cheie (nume, titlu, etichete). */
export function isAgencyProspect(p: OutreachProspect | null | undefined): boolean {
  if (!p) return false;
  const seller = normalizeAgencyText(p.seller_type);
  if (seller === "agentie" || seller === "agency") return true;
  if (Number(p.agency_suspicion_score ?? 0) >= 70) return true;
  if (normalizeAgencyText(p.owner_sentiment) === "agentie") return true;
  if (AGENCY_TYPES.has(normalizeAgencyText(p.prospect_type))) return true;
  if ((p.tags ?? []).some((tag) => hasAgencyKeyword(tag))) return true;
  return hasAgencyKeyword(p.contact_name) || titleHasAgencyKeyword(p.title);
}

export type AutoOutreachBlock = "blocked_agency" | "not_private" | "low_score";

/** De ce nu poate pleca un mesaj automat de prospectare, sau null dacă poate. */
export function autoOutreachBlockReason(p: OutreachProspect | null | undefined): AutoOutreachBlock | null {
  if (!p || isAgencyProspect(p) || p.outreach_status === BLOCKED_AGENCY_STATUS) return "blocked_agency";
  if (p.seller_type !== "privat") return "not_private";
  if (!(Number(p.lead_score ?? 0) > OUTREACH_MIN_SCORE)) return "low_score";
  return null;
}

export const AUTO_OUTREACH_BLOCK_LABELS: Record<AutoOutreachBlock, string> = {
  blocked_agency: "Agenție blocată",
  not_private: "Neconfirmat",
  low_score: `Scor ≤ ${OUTREACH_MIN_SCORE}`,
};
