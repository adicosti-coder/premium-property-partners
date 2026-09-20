/**
 * Tipologia de căutare folosită de marile portaluri imobiliare (OLX, Storia,
 * imobiliare.ro, Publi24) — taxonomie + potrivire, într-un singur loc, ca să
 * fie identică pe site-ul public și în Admin.
 */

export const TRANSACTION_OPTIONS = [
  { value: "vanzare", label: "De vânzare" },
  { value: "inchiriere", label: "De închiriat" },
  { value: "cazare", label: "Regim hotelier" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { value: "apartament", label: "Apartament", words: ["apartament", "apt"] },
  { value: "garsoniera", label: "Garsonieră", words: ["garsoniera", "garsonieră", "studio"] },
  { value: "casa", label: "Casă / vilă", words: ["casa", "casă", "vila", "vilă", "duplex"] },
  { value: "penthouse", label: "Penthouse", words: ["penthouse"] },
  { value: "teren", label: "Teren", words: ["teren", "parcela"] },
  { value: "comercial", label: "Spațiu comercial", words: ["spatiu comercial", "spațiu comercial", "birou", "hala"] },
] as const;

/** Compartimentare, exact cum apare scrisă pe portaluri. */
export const PARTITION_OPTIONS = [
  { value: "decomandat", label: "Decomandat", words: ["decomandat"] },
  { value: "semidecomandat", label: "Semidecomandat", words: ["semidecomandat", "semi decomandat"] },
  { value: "nedecomandat", label: "Nedecomandat", words: ["nedecomandat"] },
  { value: "circular", label: "Circular", words: ["circular"] },
  { value: "vagon", label: "Vagon", words: ["vagon"] },
  { value: "open space", label: "Open space", words: ["open space", "openspace"] },
] as const;

export const FLOOR_OPTIONS = [
  { value: "parter", label: "Parter" },
  { value: "not-ground", label: "Fără parter" },
  { value: "1-3", label: "Etaj 1–3" },
  { value: "4-7", label: "Etaj 4–7" },
  { value: "8plus", label: "Etaj 8 sau mai sus" },
  { value: "last", label: "Ultimul etaj" },
  { value: "not-last", label: "Fără ultimul etaj" },
  { value: "mansarda", label: "Mansardă / demisol" },
] as const;

export const ROOM_OPTIONS = [
  { value: "1", label: "1 cameră" },
  { value: "2", label: "2 camere" },
  { value: "3", label: "3 camere" },
  { value: "4", label: "4+ camere" },
] as const;

/** Dotări căutate în titlu, descriere și lista de facilități. */
export const AMENITY_OPTIONS = [
  { value: "balcon", label: "Balcon / terasă", words: ["balcon", "terasa", "terasă"] },
  { value: "parcare", label: "Parcare / garaj", words: ["parcare", "garaj", "loc de parcare"] },
  { value: "lift", label: "Lift", words: ["lift", "ascensor"] },
  { value: "bloc nou", label: "Bloc nou", words: ["bloc nou", "constructie noua", "construcție nouă", "imobil nou"] },
  { value: "mobilat", label: "Mobilat", words: ["mobilat", "mobilată", "complet mobilat"] },
  { value: "centrala", label: "Centrală proprie", words: ["centrala proprie", "centrală proprie", "centrala termica"] },
  { value: "aer", label: "Aer condiționat", words: ["aer conditionat", "aer condiționat", "clima"] },
  { value: "animale", label: "Acceptă animale", words: ["accept animale", "pet friendly", "animale permise"] },
] as const;

export const YEAR_OPTIONS = [
  { value: "2020plus", label: "Construit din 2020", min: 2020, max: null },
  { value: "2010-2019", label: "2010 – 2019", min: 2010, max: 2019 },
  { value: "2000-2009", label: "2000 – 2009", min: 2000, max: 2009 },
  { value: "pre2000", label: "Înainte de 2000", min: null, max: 1999 },
] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevanță" },
  { value: "newest", label: "Cele mai noi" },
  { value: "price-asc", label: "Preț crescător" },
  { value: "price-desc", label: "Preț descrescător" },
  { value: "surface-desc", label: "Suprafață mare" },
  { value: "eur-mp-asc", label: "€/mp crescător" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** Raza de căutare în jurul unui punct pe hartă, ca la „caută pe hartă”. */
export const RADIUS_OPTIONS = [1, 2, 3, 5, 10] as const;

/** Text fără diacritice, majuscule sau semne — pentru potriviri tolerante. */
export function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuvinte de legătură și zgomot care nu trebuie să blocheze căutarea dacă lipsesc. */
export const SEARCH_STOPWORDS = new Set([
  "de", "cu", "la", "pe", "in", "din", "si", "sau", "un", "o", "al", "ale", "pentru", "prin",
  "camere", "camera", "cam", "apartament", "apartamente", "garsoniera", "garsoniere", "casa", "case", "vila", "vile",
  "proprietar", "proprietari", "persoana", "fizica", "pf", "direct", "comision", "urgent", "vand", "inchiriez",
  "timisoara", "zona", "etaj", "bloc", "pret", "oferta", "anunt", "vanzare", "inchiriere"
]);

/** Cuvintele scrise de utilizator, ca termeni obligatorii. */
export function tokenize(q: string): string[] {
  return norm(q)
    .split(" ")
    .filter((t) => !SEARCH_STOPWORDS.has(t))
    .filter((t) => t.length >= 3 || /^\d+$/.test(t));
}

export function matchesAllTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = ` ${norm(text)} `;
  return tokens.every((t) => hay.includes(` ${t} `));
}

/** Etajul dedus din text: „etaj 3”, „3/4”, „parter”, „ultimul etaj”. */
export function floorInfo(text: string) {
  const t = norm(text);
  const isGround = /\bparter\b/.test(t);
  const isAttic = /\b(mansarda|demisol|subsol)\b/.test(t);
  let value: number | null = null;
  let total: number | null = null;
  
  // etaj 3, et. 3, etaj3
  const m = /\betaj(?:ul)?\s*(\d{1,2})\b/.exec(t) || /\bet\s*\.?\s*(\d{1,2})\b/.exec(t);
  if (m) value = Number(m[1]);
  
  // 3/4, 3 / 4
  const frac = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/.exec(t);
  if (frac && Number(frac[2]) <= 30) {
    if (value === null) value = Number(frac[1]);
    total = Number(frac[2]);
  }
  
  const isLast = /\bultimul etaj\b/.test(t) || (value !== null && total !== null && value === total);
  return { value, isGround, isAttic, isLast, known: value !== null || isGround || isAttic || isLast };
}

export function matchesFloor(floorFilter: string, text: string): boolean {
  const f = floorInfo(text);
  if (!f.known) return true; // etaj necunoscut → nu excludem oferta
  const v = f.value;
  switch (floorFilter) {
    case "parter": return f.isGround;
    case "not-ground": return !f.isGround;
    case "1-3": return v !== null && v >= 1 && v <= 3;
    case "4-7": return v !== null && v >= 4 && v <= 7;
    case "8plus": return v !== null && v >= 8;
    case "last": return f.isLast;
    case "not-last": return !f.isLast;
    case "mansarda": return f.isAttic;
    default: return true;
  }
}

/** Suprafața utilă în mp, dedusă din text. */
export function surfaceFromText(text: string): number | null {
  const t = norm(text);
  const m = /\b(\d{2,4})(?:[.,]\d{1,2})?\s*(?:mp|m2|metri patrati)\b/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 10 && n <= 2000 ? n : null;
}

/** Numărul de camere dedus din text: „3 camere”, „3 cam.”, „2-camere”. */
export function roomsFromText(text: string): number | null {
  const t = norm(text);
  const m = /\b(\d)\s*(?:camere?|cam)\b/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 9 ? n : null;
}

export function matchesRooms(wanted: number, value: number | null): boolean {
  if (value === null) return true;
  return wanted >= 4 ? value >= 4 : value === wanted;
}

/** Cel puțin una dintre variantele bifate apare în text (cuvânt întreg). */
export function matchesAnyOption(
  selected: string[],
  options: readonly { value: string; words: readonly string[] }[],
  text: string,
): boolean {
  if (selected.length === 0) return true;
  const hay = ` ${norm(text)} `;
  return selected.some((sel) => {
    const words = options.find((o) => o.value === sel)?.words ?? [sel];
    return words.some((w) => {
      const nw = norm(w);
      // „decomandat” nu trebuie acceptat de „semidecomandat”
      return nw === "decomandat" ? hay.includes(" decomandat ") : hay.includes(nw);
    });
  });
}

/** Toate dotările bifate trebuie să apară. */
export function matchesAllOptions(
  selected: string[],
  options: readonly { value: string; words: readonly string[] }[],
  text: string,
): boolean {
  if (selected.length === 0) return true;
  const hay = ` ${norm(text)} `;
  return selected.every((sel) => {
    const words = options.find((o) => o.value === sel)?.words ?? [sel];
    return words.some((w) => hay.includes(norm(w)));
  });
}

export function matchesYear(yearFilter: string, year: number | null, text: string): boolean {
  const opt = YEAR_OPTIONS.find((o) => o.value === yearFilter);
  if (!opt) return true;
  let value = year;
  if (value === null) {
    const m = /\b(19[5-9]\d|20[0-4]\d)\b/.exec(norm(text));
    if (m) value = Number(m[1]);
  }
  if (value === null) return true; // an necunoscut → păstrat
  if (opt.min !== null && value < opt.min) return false;
  if (opt.max !== null && value > opt.max) return false;
  return true;
}

/** Distanța în km între două puncte (Haversine) — pentru căutarea pe hartă. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pricePerSqm(price: number | null, surface: number | null): number | null {
  if (!price || !surface || surface <= 0) return null;
  return Math.round(price / surface);
}

/** Valoare numerică dintr-un preț de tip „55.000 €”. */
export function priceValue(p: number | string | null | undefined): number | null {
  if (p === null || p === undefined) return null;
  if (typeof p === "number") return Number.isFinite(p) ? p : null;
  const digits = String(p).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Starea completă a filtrelor, ca pe portaluri. */
export interface PortalFilters {
  q: string;
  transaction: string; // "" = toate
  types: string[];
  rooms: string[];
  partitions: string[];
  amenities: string[];
  floor: string;
  year: string;
  minPrice: string;
  maxPrice: string;
  minSurface: string;
  maxSurface: string;
  zone: string;
  sort: SortValue;
}

export const EMPTY_PORTAL_FILTERS: PortalFilters = {
  q: "",
  transaction: "",
  types: [],
  rooms: [],
  partitions: [],
  amenities: [],
  floor: "",
  year: "",
  minPrice: "",
  maxPrice: "",
  minSurface: "",
  maxSurface: "",
  zone: "",
  sort: "relevance",
};

/** Formă minimă comună a unui anunț, indiferent de sursă. */
export interface PortalListing {
  title: string;
  text: string;
  transaction?: string | null;
  price?: number | null;
  surface?: number | null;
  rooms?: number | null;
  year?: number | null;
  zone?: string | null;
  createdAt?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const toInt = (s: string) => {
  const n = Number(String(s).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function matchesPortalFilters(l: PortalListing, f: PortalFilters): boolean {
  const text = `${l.title} ${l.text} ${l.zone ?? ""}`;
  if (!matchesAllTokens(text, tokenize(f.q))) return false;
  if (f.transaction && l.transaction && norm(l.transaction) !== norm(f.transaction)) return false;
  if (f.zone && !norm(`${l.zone ?? ""} ${text}`).includes(norm(f.zone))) return false;
  if (!matchesAnyOption(f.types, PROPERTY_TYPE_OPTIONS, text)) return false;
  if (!matchesAnyOption(f.partitions, PARTITION_OPTIONS, text)) return false;
  if (!matchesAllOptions(f.amenities, AMENITY_OPTIONS, text)) return false;
  if (f.floor && !matchesFloor(f.floor, text)) return false;
  if (f.year && !matchesYear(f.year, l.year ?? null, text)) return false;
  if (f.rooms.length > 0) {
    const value = l.rooms ?? roomsFromText(text);
    if (value !== null && !f.rooms.some((r) => matchesRooms(Number(r), value))) return false;
  }
  const surface = l.surface ?? surfaceFromText(text);
  const minMp = toInt(f.minSurface);
  const maxMp = toInt(f.maxSurface);
  if (surface !== null) {
    if (minMp !== null && surface < minMp) return false;
    if (maxMp !== null && surface > maxMp) return false;
  }
  const price = l.price ?? null;
  const minP = toInt(f.minPrice);
  const maxP = toInt(f.maxPrice);
  if (price !== null) {
    if (minP !== null && price < minP) return false;
    if (maxP !== null && price > maxP) return false;
  }
  return true;
}

export function sortPortalListings<T extends PortalListing>(list: T[], sort: SortValue): T[] {
  const arr = [...list];
  const mp = (l: PortalListing) => pricePerSqm(l.price ?? null, l.surface ?? null);
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "price-desc":
      return arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case "surface-desc":
      return arr.sort((a, b) => (b.surface ?? 0) - (a.surface ?? 0));
    case "eur-mp-asc":
      return arr.sort((a, b) => (mp(a) ?? Infinity) - (mp(b) ?? Infinity));
    case "newest":
      return arr.sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    default:
      return arr;
  }
}

/** Numărul de filtre active — pentru badge-ul „Filtre (3)”. */
export function activeFilterCount(f: PortalFilters): number {
  let n = 0;
  if (f.q.trim()) n++;
  if (f.transaction) n++;
  if (f.zone) n++;
  if (f.floor) n++;
  if (f.year) n++;
  if (f.minPrice || f.maxPrice) n++;
  if (f.minSurface || f.maxSurface) n++;
  n += f.types.length + f.rooms.length + f.partitions.length + f.amenities.length;
  return n;
}

/** Filtrele în/din adresa paginii, ca pe portaluri (link partajabil). */
export function filtersToParams(f: PortalFilters): URLSearchParams {
  const p = new URLSearchParams();
  const put = (k: string, v: string) => { if (v) p.set(k, v); };
  put("q", f.q.trim());
  put("tranzactie", f.transaction);
  put("zona", f.zone);
  put("etaj", f.floor);
  put("an", f.year);
  put("pmin", f.minPrice);
  put("pmax", f.maxPrice);
  put("smin", f.minSurface);
  put("smax", f.maxSurface);
  if (f.types.length) p.set("tip", f.types.join(","));
  if (f.rooms.length) p.set("camere", f.rooms.join(","));
  if (f.comp.length) p.set("comp", f.partitions.join(","));
  if (f.dotari.length) p.set("dotari", f.amenities.join(","));
  if (f.sort !== "relevance") p.set("sort", f.sort);
  return p;
}

export function paramsToFilters(p: URLSearchParams): PortalFilters {
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  const sort = (p.get("sort") ?? "relevance") as SortValue;
  return {
    q: p.get("q") ?? "",
    transaction: p.get("tranzactie") ?? "",
    types: list("tip"),
    rooms: list("camere"),
    partitions: list("comp"),
    amenities: list("dotari"),
    floor: p.get("etaj") ?? "",
    year: p.get("an") ?? "",
    minPrice: p.get("pmin") ?? "",
    maxPrice: p.get("pmax") ?? "",
    minSurface: p.get("smin") ?? "",
    maxSurface: p.get("smax") ?? "",
    zone: p.get("zona") ?? "",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : "relevance",
  };
}
