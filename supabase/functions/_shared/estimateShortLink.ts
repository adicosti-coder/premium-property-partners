// Linkul scurt și curat spre estimarea unui anunț: https://realtrust.ro/e/<cod>.
// Codul (8 caractere) e coloana `prospect_listings.short_code`, rezolvat public prin
// RPC-ul `get_estimate_link` (doar zonă, tip și linkul de pe portal — fără date de contact).
export const ESTIMATE_LINK_BASE = "https://realtrust.ro/e/";
export const ESTIMATE_CODE_RE = /^[a-z0-9]{7,8}$/;

export function isEstimateCode(code: unknown): code is string {
  return typeof code === "string" && ESTIMATE_CODE_RE.test(code);
}

/** `https://realtrust.ro/e/<cod>` sau null dacă anunțul nu are încă un cod valid. */
export function estimateShortUrl(p?: { short_code?: string | null } | null): string | null {
  const code = String(p?.short_code ?? "").trim().toLowerCase();
  return isEstimateCode(code) ? `${ESTIMATE_LINK_BASE}${code}` : null;
}
