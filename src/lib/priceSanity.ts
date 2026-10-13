// Prețuri neverosimile salvate din pagini de categorie/rezultate
// (ex: chirie „2.024.600 €/lună” luată din prețul de vânzare al unui card).
export const RENT_PRICE_MIN = 100;
export const RENT_PRICE_MAX = 10_000;
export const SALE_PRICE_MIN = 15_000;
export const SALE_PRICE_MAX = 3_000_000;

export type PriceCategory = "vanzare" | "inchiriere" | "necunoscut";

/** Tipul tranzacției din câmpurile disponibile (aceeași logică ca frontend). */
export function priceCategoryOf(input: {
  category?: string | null; title?: string | null; description?: string | null; url?: string | null;
}): PriceCategory {
  const t = `${input.category ?? ""} ${input.title ?? ""} ${input.url ?? ""} ${input.description ?? ""}`
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\bnu\s+(?:se\s+)?(?:inchiriez|inchiriaza|vand|vinde)\b/g, "");
  const sale = /vanzare|\bvand\b|\bvinde\b|for-sale/.test(t);
  const rent = /inchiriere|inchiriez|\bchirie\b|(?:de[- ]|se )inchiriat|se inchiriaza|for-rent|regim hotelier/.test(t);
  if (sale && !rent) return "vanzare";
  if (rent && !sale) return "inchiriere";
  return "necunoscut";
}

/** Preț în afara intervalului plauzibil pentru tipul de tranzacție (EUR; RON convertit aproximativ). */
export function isImplausiblePrice(
  price: number | null | undefined,
  cat: PriceCategory,
  currency?: string | null,
): boolean {
  if (price == null || !Number.isFinite(price) || price <= 0) return false; // lipsa prețului se validează separat
  const eur = currency === "RON" ? price / 5 : price;
  if (cat === "inchiriere") return eur < RENT_PRICE_MIN || eur > RENT_PRICE_MAX;
  if (cat === "vanzare") return eur < SALE_PRICE_MIN || eur > SALE_PRICE_MAX;
  return eur < RENT_PRICE_MIN || eur > SALE_PRICE_MAX;
}
