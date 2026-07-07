/**
 * Shared, testable helpers for Unified Pipeline filtering.
 * Extras aici din UnifiedPipelinePanel.tsx pentru a putea fi acoperit cu teste.
 */

export interface UnifiedFilters {
  q: string;
  portal: string;
  zone: string;
}

export const DEFAULT_FILTERS: UnifiedFilters = { q: "", portal: "all", zone: "all" };

/** Normalize string for case + diacritic insensitive matching. */
export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/[ăâ]/gi, "a")
    .replace(/[îí]/gi, "i")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sinonime pentru micro-zone Timișoara.
 * Cheile sunt formele NORMALIZATE (fara diacritice, lowercase).
 * Valorile sunt variații scrise cum apar în anunțuri (raw, se normalizează la use-time).
 */
export const ZONE_SYNONYMS: Record<string, string[]> = {
  cetate: ["cetate", "centru", "central", "centrul vechi", "piata unirii", "piața unirii", "piata victoriei", "piața victoriei"],
  centru: ["centru", "cetate", "central", "centrul vechi"],
  iosefin: ["iosefin", "iosefini"],
  fabric: ["fabric", "fabrica"],
  elisabetin: ["elisabetin", "elisabeta"],
  "take ionescu": ["take ionescu", "take-ionescu"],
  dumbravita: ["dumbravita", "dumbrăvița", "dumbrãvița"],
  aradului: ["aradului", "calea aradului", "arad", "cal. aradului"],
  lipovei: ["lipovei", "calea lipovei", "cal. lipovei"],
  torontalului: ["torontalului", "calea torontalului"],
  mehala: ["mehala"],
  ronat: ["ronat", "ronaț"],
  bucovina: ["bucovina"],
  circumvalatiunii: ["circumvalatiunii", "circumvalațiunii", "circumvalatiune"],
  girocului: ["girocului", "calea girocului", "cal. girocului", "giroc"],
  sagului: ["sagului", "șagului", "calea sagului", "calea șagului", "cal. sagului"],
  soarelui: ["soarelui"],
  "complex studentesc": ["complex studentesc", "complex studențesc", "complex", "complexul studentesc", "complexul studențesc"],
  olimpia: ["olimpia", "stadion", "olimpia stadion"],
  plopi: ["plopi"],
  blascovici: ["blascovici", "blașcovici"],
  freidorf: ["freidorf"],
  dambovita: ["dambovita", "dâmbovița"],
  ghiroda: ["ghiroda"],
  mosnita: ["mosnita", "moșnița", "mosnita noua", "moșnița nouă"],
  isho: ["isho"],
  paltim: ["paltim"],
  fructus: ["fructus", "fructus plaza"],
  "city of mara": ["city of mara", "city-of-mara", "cityofmara"],
  vivalia: ["vivalia"],
  ateneo: ["ateneo"],
  iris: ["iris"],
  "adora forest": ["adora forest", "adora"],
  "nord one": ["nord one", "nord-one"],
  monarch: ["monarch"],
  "vox vertical village": ["vox vertical", "vox vertical village", "vox"],
  "uranus plaza": ["uranus", "uranus plaza"],
};

/** Termeni ilike safe (elimină caracterele care sparg PostgREST `.or`). */
export function sanitizeIlikeTerm(s: string): string {
  return s.replace(/[,%()]/g, " ").trim();
}

/** Escape valoare pentru includere într-o clauză `.or(...)` PostgREST. */
export function escapeIlikeForOr(s: string): string {
  return s.replace(/[,()]/g, " ").trim();
}

/** Toate variațiile normalizate pentru o zonă dată. */
export function zoneCandidates(value: string): string[] {
  const key = normalize(value);
  const list = ZONE_SYNONYMS[key];
  return list ? list.map(normalize).filter(Boolean) : key ? [key] : [];
}

/** Construiește o clauză `.or()` care unește toate sinonimele unei zone. */
export function buildZoneOr(
  zoneValue: string,
  column: "zone" | "location" | "title",
): string | null {
  const cands = ZONE_SYNONYMS[normalize(zoneValue)] ?? [zoneValue];
  const parts = cands
    .map((c) => escapeIlikeForOr(c))
    .filter((c) => c.length > 0)
    .map((c) => `${column}.ilike.%${c}%`);
  return parts.length ? parts.join(",") : null;
}

/**
 * Client-side filter matcher — case + diacritic insensitive, tolerant la spații.
 */
export function matchesUnifiedFilters<
  T extends {
    title?: string | null;
    source_platform?: string | null;
    zone?: string | null;
    source_url?: string | null;
    location?: string | null;
  },
>(item: T, f: UnifiedFilters): boolean {
  if (f.portal && f.portal !== "all") {
    const p = normalize(item.source_platform);
    if (!p.includes(normalize(f.portal))) return false;
  }
  if (f.zone && f.zone !== "all") {
    const hay = `${normalize(item.zone)} ${normalize(item.location)} ${normalize(item.title)}`;
    const cands = zoneCandidates(f.zone);
    if (!cands.some((c) => c && hay.includes(c))) return false;
  }
  const q = normalize(f.q);
  if (q.length > 0) {
    const hay = [item.title, item.source_url, item.zone, item.location]
      .map(normalize)
      .join(" ");
    if (!hay.includes(q)) return false;
  }
  return true;
}
