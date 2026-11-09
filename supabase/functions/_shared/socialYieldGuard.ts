// Garda de randament pentru textele generate automat de Social Engine.
// Orice afirmație de randament / ROI / yield devine intervalul aprobat
// „6,5%–9,4% net estimat”, cu excepția unei valori setate explicit de admin
// pe proprietate (`properties.social_yield_override`).
export const APPROVED_YIELD_RO = "6,5%–9,4% net estimat";
export const APPROVED_YIELD_EN = "6.5% – 9.4% net estimat";

const NUM = String.raw`\d{1,2}(?:[.,]\d{1,2})?`;
const QUAL = String.raw`(?:net|brut|anual|annual|estimat|estimată|mediu|medie|potențial|potential|garantat|de|peste|până|pana|la|minim|minimum|min\.|cca\.?|aprox\.?|aproximativ|chiar|un|over|up|to|of|al|anual)`;
// keyword [qualifiers] [: / –] [NUM% –] NUM % [+] [trailing qualifiers]
const KEYWORD_FIRST = new RegExp(
  String.raw`\b(yield|randament(?:ul|e|ele)?|roi|rentabilitate(?:a)?)((?:\s+${QUAL})*)\s*[:–-]?\s*(?:${NUM}\s*%?\s*(?:[-–—]|până la|pana la|to)\s*)?${NUM}\s*%\s*\+?(?:\s*(?:\/\s*an|pe an|per an|anual|net|brut|estimat)\b)*`,
  "giu",
);
// NUM% [+] keyword  (ex. „9%+ yield”, „9% randament”)
const NUMBER_FIRST = new RegExp(
  String.raw`(?:${NUM}\s*%?\s*[-–—]\s*)?${NUM}\s*%\s*\+?\s+(?:net\s+)?(yield|randament(?:ul)?|roi)\b`,
  "giu",
);

function formatOverride(v: number): string {
  return `${v.toFixed(v % 1 === 0 ? 0 : 1).replace(".", ",")}% net estimat`;
}

/** Parses an explicit admin override; anything else (null, NaN, out of range) means "use the approved range". */
export function yieldOverride(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 30 ? n : null;
}

const label = (kw: string) => {
  const k = kw.toLowerCase();
  const word = k === "yield" || k.startsWith("rentabilitate") ? "randament" : k === "roi" ? "ROI" : k;
  if (word === "ROI") return word;
  return kw[0] === kw[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;
};

/** Rewrites every yield/ROI claim in `text` to the approved range (or the explicit override). */
export function normalizeYieldClaims(text: string | null | undefined, override?: unknown): string {
  if (!text) return text ?? "";
  const o = yieldOverride(override);
  const value = o == null ? APPROVED_YIELD_RO : formatOverride(o);
  return text
    .replace(KEYWORD_FIRST, (_m, kw: string) => `${label(kw)} ${value}`)
    .replace(NUMBER_FIRST, (_m, kw: string) => `${label(kw)} ${value}`);
}

/** True when the text contains a yield claim that differs from the approved form. */
export function hasNonApprovedYield(text: string | null | undefined, override?: unknown): boolean {
  return normalizeYieldClaims(text, override) !== (text ?? "");
}

/** Applies the guard to a social post's title, caption and per-format captions. */
export function guardSocialPostYield<T extends { title?: string | null; caption?: string | null; content_variants?: unknown }>(
  post: T, override?: unknown,
): { title: string; caption: string; content_variants: unknown; changed: boolean } {
  const title = normalizeYieldClaims(post.title, override);
  const caption = normalizeYieldClaims(post.caption, override);
  let variants = post.content_variants ?? null;
  if (variants && typeof variants === "object") {
    variants = JSON.parse(JSON.stringify(variants), (k, v) =>
      typeof v === "string" && (k === "caption" || k === "text" || k === "title" || k === "overlay_text") ? normalizeYieldClaims(v, override) : v);
  }
  const changed = title !== (post.title ?? "") || caption !== (post.caption ?? "")
    || JSON.stringify(variants) !== JSON.stringify(post.content_variants ?? null);
  return { title, caption, content_variants: variants, changed };
}
