// Extragere preț din HTML-ul unui anunț imobiliar (EUR, cu conversie aproximativă din RON).
export const PRICE_MIN = 3_000;
export const PRICE_MAX = 3_000_000;

export function extractPrice(html: string): number | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const candidates: number[] = [];

  const push = (raw: string, ron: boolean) => {
    const n = Number(raw.replace(/[.\s]/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    const eurVal = ron ? Math.round(n / 4.97) : n;
    if (eurVal >= PRICE_MIN && eurVal <= PRICE_MAX) candidates.push(eurVal);
  };

  for (const m of text.matchAll(/([\d.\s]{4,12})\s*(?:€|EUR\b|euro\b)/gi)) push(m[1], false);
  for (const m of text.matchAll(/(?:€|EUR)\s*([\d.\s]{4,12})/gi)) push(m[1], false);
  for (const m of text.matchAll(/([\d.\s]{5,12})\s*(?:lei\b|RON\b)/gi)) push(m[1], true);

  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  return candidates[0];
}

/** Chirie lunară: valori mici (sub 3.000) sunt plauzibile, deci prag separat. */
export function extractRent(html: string): number | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const found: number[] = [];
  for (const m of text.matchAll(/([\d.\s]{3,7})\s*(?:€|EUR\b|euro\b)\s*(?:\/\s*(?:luna|lună|month))?/gi)) {
    const n = Number(String(m[1]).replace(/[.\s]/g, ""));
    if (Number.isFinite(n) && n >= 100 && n <= 10_000) found.push(n);
  }
  if (!found.length) return null;
  found.sort((a, b) => a - b);
  return found[0];
}
