// Garda de randament pentru textele generate automat de Social Engine.
// - Articole / servicii / atragere proprietari: mereu intervalul aprobat „6,5% – 9,4% net estimat”.
// - Anunțuri individuale de vânzare/investiție: randamentul exact al anunțului din baza de date
//   (`social_yield_override`, apoi `roi_percentage` până la plafonul grilei), altfel intervalul aprobat.
export const APPROVED_YIELD_RO = "6,5% – 9,4% net estimat";
/** Grila oficială: fără afirmații peste 9,5%; o valoare automată mai mare revine la interval. */
export const MAX_LISTING_YIELD = 9.5;
const LISTING_TYPES = new Set(["vanzare", "investitie"]);
export const APPROVED_YIELD_EN = "6.5% – 9.4% net estimat";

const NUM = String.raw`\d{1,2}(?:[.,]\d{1,2})?`;
const QUAL = String.raw`(?:net|brut|anual|annual|estimat|estimată|mediu|medie|potențial|potential|garantat|de|peste|până|pana|la|minim|minimum|min\.|cca\.?|aprox\.?|aproximativ|chiar|un|over|up|to|of|al|anual)`;
// keyword [qualifiers] [: / –] [NUM% –] NUM % [+] [trailing qualifiers]
const PCT = String.raw`(?:${NUM}\s*%?\s*(?:[-–—]|până la|pana la|to)\s*)?${NUM}\s*%(?:\s*\+)?(?:\s*\/\s*an|\s+(?:pe an|per an|anual|net estimat|net|brut|estimat)(?![\p{L}]))*`;
const KW = String.raw`yield|randament(?:ul|e|ele)?|roi|rentabilitate(?:a)?`;
// keyword [qualifiers] [: / –] PCT  (ex. „Yield 9%+”, „randament estimat de peste 9%”)
const KEYWORD_FIRST = new RegExp(String.raw`\b(${KW})((?:\s+${QUAL})*)\s*[:–-]?\s*${PCT}`, "giu");
// [peste/până la] PCT keyword  (ex. „9%+ yield”, „până la 12% randament”)
const NUMBER_FIRST = new RegExp(
  String.raw`(?:(?:peste|până la|pana la|minim|de|cca\.?|aprox\.?)\s+)*(?:${NUM}\s*%?\s*[-–—]\s*)?${NUM}\s*%(?:\s*\+)?\s+(?:net\s+)?(${KW})\b`,
  "giu",
);
// keyword … (max 6 cuvinte, aceeași propoziție) … PCT  (ex. „Randamentul în regim hotelier este de 12%”)
const KEYWORD_LOOSE = new RegExp(String.raw`\b(${KW})((?:[\s,]+[^\s\d.;!?%|]+){1,6}?)\s+((?:peste|până la|pana la|minim|de)\s+)*${PCT}`, "giu");
const NOT_YIELD = /comision|ocupare|impozit|deducer|tax|cot[aă]|discount|reducer|avans|dobând|dobind/i;

function formatOverride(v: number): string {
  return `${v.toFixed(v % 1 === 0 ? 0 : 1).replace(".", ",")}% net estimat`;
}

const parsePct = (raw: unknown): number => typeof raw === "number" ? raw
  : typeof raw === "string" && raw.trim() ? Number(raw.replace(",", ".").replace("%", "").trim()) : NaN;

/** Parses an explicit admin override; anything else (null, NaN, out of range) means "use the approved range". */
export function yieldOverride(raw: unknown): number | null {
  const n = parsePct(raw);
  return Number.isFinite(n) && n > 0 && n <= 30 ? n : null;
}

export interface YieldProperty { listing_type?: string | null; roi_percentage?: unknown; social_yield_override?: unknown }

/**
 * Yield to show for one post: null = approved range. Only individual sale/investment listings
 * may show their own figure; general service and owner-acquisition posts always get the range.
 */
export function postYieldValue(postType: string | null | undefined, property?: YieldProperty | null): number | null {
  if (postType !== "property" || !property || !LISTING_TYPES.has(String(property.listing_type ?? ""))) return null;
  const explicit = yieldOverride(property.social_yield_override);
  if (explicit != null) return explicit;
  const roi = parsePct(property.roi_percentage);
  return Number.isFinite(roi) && roi > 0 && roi <= MAX_LISTING_YIELD ? roi : null;
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
    .replace(NUMBER_FIRST, (_m, kw: string) => `${label(kw)} ${value}`)
    .replace(KEYWORD_LOOSE, (m, kw: string, mid: string, link?: string) => {
      if (NOT_YIELD.test(mid) || mid.includes(value)) return m;
      return `${kw}${mid} ${/\bde\s*$/i.test(link ?? "") ? "de " : ""}${value}`;
    });
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
