/**
 * Deduplicare între portaluri pentru anunțurile colectate de scraper
 * (ex. același apartament pe OLX și pe Imobiliare.ro).
 *
 * Două anunțuri sunt același imobil doar dacă nu se contrazic pe niciun semnal
 * cunoscut (tranzacție, zonă/complex, camere, suprafață, preț, telefon) ȘI au
 * suficiente semnale pozitive comune. Gruparea este conservatoare: fiecare
 * variantă trebuie să se potrivească direct cu anunțul principal, deci nu se
 * formează lanțuri A≈B≈C în care A și C sunt imobile diferite.
 *
 * Prețurile neverosimile (aceleași reguli ca `priceSanity`) nu sunt folosite la
 * comparare și nu sunt modificate aici.
 */
import { isImplausiblePrice, priceCategoryOf, type PriceCategory } from "@/lib/priceSanity";
import { norm, roomsFromText, surfaceFromText } from "@/lib/portalSearch";
import { isWhatsappCapable, normalizeRoPhone } from "@/lib/ownerOutreachTemplates";
import { isSearchPageUrl } from "@/lib/listingUrl";
import { isIndividualOwnerListing } from "@/lib/ownerListingRules";

export interface DedupListing {
  id: string;
  source_platform?: string | null;
  source_url?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  zone?: string | null;
  rooms?: number | null;
  size?: number | null;
  price?: number | null;
  currency?: string | null;
  category?: string | null;
  contact_phone?: string | null;
  phone_normalized?: string | null;
  images?: string[] | null;
  is_active?: boolean | null;
  duplicate_of?: string | null;
  last_seen_at?: string | null;
  scraped_at?: string | null;
  created_at?: string | null;
}

/** Toleranțe „mici” pentru suprafață și preț. */
export const SIZE_TOLERANCE_SQM = 2;
export const SIZE_TOLERANCE_RATIO = 0.04;
export const PRICE_TOLERANCE_RATIO = 0.06;
export const TITLE_SIMILARITY_MIN = 0.6;
/** Peste această suprafață, un apartament are aproape sigur o valoare salvată greșit. */
export const APARTMENT_MAX_SQM = 400;

/** Ansamblurile rezidențiale au prioritate față de cartier (sunt mai precise). */
const COMPLEXES: Array<[string, string[]]> = [
  ["City of Mara", ["city of mara", "cityofmara"]],
  ["Monarh", ["monarh", "monarch"]],
  ["NordOne", ["nordone", "nord one"]],
  ["XCity", ["xcity", "x city"]],
  ["Vivalia", ["vivalia"]],
  ["Paltim", ["paltim"]],
  ["ISHO", ["isho"]],
  ["Fructus", ["fructus"]],
  ["Ateneo", ["ateneo"]],
  ["Adora Forest", ["adora forest"]],
  ["Uranus Plaza", ["uranus plaza"]],
  ["Vox", ["vox vertical", "vox"]],
  ["Campeador", ["campeador"]],
  ["Denya", ["denya"]],
  ["Ring", ["ring residence", "ring timisoara"]],
];

/** Zone mari, folosite des ca etichetă generică: cer o dovadă în plus (telefon sau titlu). */
const BROAD_AREAS = new Set(["Cetate"]);

const NEIGHBORHOODS: Array<[string, string[]]> = [
  ["Dorobanților", ["dorobantilor"]],
  ["Elisabetin", ["elisabetin"]],
  ["Iosefin", ["iosefin"]],
  ["Fabric", ["fabric"]],
  ["Calea Aradului", ["calea aradului", "aradului"]],
  ["Cetate", ["cetatii", "cetate", "centru", "ultracentral", "piata unirii", "piata victoriei"]],
  ["Ghiroda", ["ghiroda"]],
  ["Dumbrăvița", ["dumbravita"]],
  ["Take Ionescu", ["take ionescu"]],
  ["Torontalului", ["torontalului"]],
  ["Lipovei", ["lipovei"]],
  ["Circumvalațiunii", ["circumvalatiunii"]],
  ["Iulius Town", ["iulius town", "iulius mall", "openville"]],
  ["Girocului", ["girocului"]],
  ["Giroc", ["giroc"]],
  ["Complex Studențesc", ["complex studentesc", "complexul studentesc"]],
  ["Soarelui", ["soarelui"]],
  ["Șagului", ["sagului"]],
  ["Dâmbovița", ["dambovita"]],
  ["Braytim", ["braytim"]],
  ["Bucovina", ["bucovina"]],
  ["Buziașului", ["buziasului"]],
  ["Freidorf", ["freidorf"]],
  ["Blașcovici", ["blascovici"]],
  ["Mehala", ["mehala"]],
  ["Steaua", ["steaua"]],
  ["Martirilor", ["martirilor"]],
  ["Plopi", ["plopi"]],
  ["Olimpia", ["olimpia", "stadion"]],
  ["Ronaț", ["ronat"]],
  ["Moșnița", ["mosnita"]],
  ["Tipografilor", ["tipografilor"]],
  ["Badea Cârțan", ["badea cartan"]],
];

function findArea(text: string, table: Array<[string, string[]]>): string | null {
  const hay = ` ${norm(text)} `;
  for (const [name, aliases] of table) {
    if (aliases.some((a) => hay.includes(` ${a} `))) return name;
  }
  return null;
}

/** Zona sau complexul normalizat: complex din zonă/titlu/adresă, apoi zona salvată, apoi textul descrierii. */
export function normalizedArea(l: DedupListing): string | null {
  const head = `${l.title ?? ""} ${l.location ?? ""}`;
  const desc = (l.description ?? "").slice(0, 600);
  return findArea(`${l.zone ?? ""} ${head}`, COMPLEXES)
    ?? (l.zone ? findArea(l.zone, NEIGHBORHOODS) ?? (norm(l.zone) || null) : null)
    ?? findArea(head, NEIGHBORHOODS)
    ?? findArea(desc, COMPLEXES)
    ?? findArea(desc, NEIGHBORHOODS);
}

/** Portalul real (din adresă când platforma salvată este generică). */
export function portalKey(l: DedupListing): string {
  let host = "";
  try { host = new URL(l.source_url ?? "").hostname.replace(/^www\./, "").toLowerCase(); } catch { /* fără adresă */ }
  const p = norm(`${l.source_platform ?? ""} ${host}`);
  if (/\bolx\b/.test(p)) return "olx";
  if (/\bimobiliare\b/.test(p) && !/bursa/.test(p)) return "imobiliare";
  if (/\bstoria\b/.test(p)) return "storia";
  if (/\bpubli24\b/.test(p)) return "publi24";
  if (/\banuntul\b/.test(p)) return "anuntul";
  if (/\bhomezz\b/.test(p)) return "homezz";
  if (/bursa/.test(p)) return "bursaimobiliara";
  if (/facebook/.test(p)) return "facebook";
  return host || norm(l.source_platform) || "necunoscut";
}

export function normalizedListingUrl(raw?: string | null): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return raw.trim().toLowerCase().replace(/[#?].*$/, "").replace(/\/+$/, "");
  }
}

/** Telefonul utilizabil (format +40…), sau null dacă trebuie dezvăluit manual pe portal. */
export function listingPhone(l: Pick<DedupListing, "contact_phone" | "phone_normalized">): string | null {
  return normalizeRoPhone(l.phone_normalized) ?? normalizeRoPhone(l.contact_phone);
}

export type PhoneAvailabilityFilter = "all" | "available" | "manual";

export function phoneAvailability(l: Pick<DedupListing, "contact_phone" | "phone_normalized">): "available" | "manual" {
  return listingPhone(l) ? "available" : "manual";
}

export function matchesPhoneFilter(
  l: Pick<DedupListing, "contact_phone" | "phone_normalized">,
  filter: PhoneAvailabilityFilter,
): boolean {
  return filter === "all" || phoneAvailability(l) === filter;
}

/** Poate intra în coada de contactare / WhatsApp doar un anunț activ cu mobil românesc. */
export function outreachBlockReason(l: DedupListing & { do_not_call?: boolean | null }): string | null {
  const phone = listingPhone(l);
  if (!phone) return "Necesită dezvăluire manuală a numărului";
  if (!isWhatsappCapable(phone)) return "Număr fix — nu se trimite pe WhatsApp";
  if (l.is_active === false) return "Anunț inactiv";
  if (l.do_not_call) return "Nu dorește să fie contactat";
  return null;
}

interface Signals {
  portal: string;
  url: string;
  area: string | null;
  rooms: number | null;
  size: number | null;
  priceEur: number | null;
  tx: PriceCategory;
  phone: string | null;
  titleTokens: Set<string>;
  /** Pagină de anunț individual (nu pagină de rezultate / categorie). */
  listingPage: boolean;
}

const TITLE_STOP = new Set([
  "de", "cu", "la", "pe", "in", "din", "si", "sau", "un", "o", "al", "ale", "pentru", "vand", "vanzare",
  "inchiriez", "inchiriere", "apartament", "timisoara", "zona", "proprietar", "direct", "mp", "camere",
  "camera", "cam", "etaj", "bloc", "nou", "noua", "decomandat", "semidecomandat", "urgent", "pf",
]);

function titleTokens(title?: string | null): Set<string> {
  return new Set(norm(title).split(" ").filter((t) => t.length >= 3 && !TITLE_STOP.has(t)));
}

export function titleSimilarity(a?: string | null, b?: string | null): number {
  const ta = titleTokens(a), tb = titleTokens(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => { if (tb.has(t)) common++; });
  return common / (ta.size + tb.size - common);
}

export function signalsOf(l: DedupListing): Signals {
  const text = `${l.title ?? ""} ${(l.description ?? "").slice(0, 600)}`;
  const tx = priceCategoryOf({ category: l.category, title: l.title, description: l.description, url: l.source_url });
  const rawPrice = l.price != null && Number.isFinite(Number(l.price)) && Number(l.price) > 0 ? Number(l.price) : null;
  const priceOk = rawPrice != null && !isImplausiblePrice(rawPrice, tx, l.currency ?? "EUR");
  const garsoniera = /\bgarsonier/.test(norm(l.title));
  // Suprafețe salvate greșit (ex. 1.767 mp la un apartament) nu sunt folosite.
  const maxSize = /\b(apartament|garsonier|camer|studio|penthouse)/.test(norm(l.title)) ? APARTMENT_MAX_SQM : 2000;
  const plausible = (v: number | null) => (v != null && v >= 10 && v <= maxSize ? v : null);
  const size = plausible(l.size != null ? Number(l.size) : null) ?? plausible(surfaceFromText(text));
  return {
    portal: portalKey(l),
    url: normalizedListingUrl(l.source_url),
    area: normalizedArea(l),
    rooms: l.rooms != null && l.rooms > 0 && l.rooms < 10 ? l.rooms : garsoniera ? 1 : roomsFromText(l.title ?? "") ?? roomsFromText(text),
    size,
    priceEur: priceOk ? (l.currency === "RON" ? rawPrice! / 5 : rawPrice) : null,
    tx,
    phone: listingPhone(l),
    titleTokens: titleTokens(l.title),
    listingPage: !isSearchPageUrl(l.source_url, l.title) && isIndividualOwnerListing({ url: l.source_url }),
  };
}

const sizeClose = (a: number, b: number) => Math.abs(a - b) <= Math.max(SIZE_TOLERANCE_SQM, Math.min(a, b) * SIZE_TOLERANCE_RATIO);
const priceClose = (a: number, b: number) => Math.abs(a - b) <= Math.min(a, b) * PRICE_TOLERANCE_RATIO;

export interface MatchResult {
  match: boolean;
  reasons: string[];
}

/** Același imobil pe portaluri diferite? */
export function compareListings(a: DedupListing, b: DedupListing, sa = signalsOf(a), sb = signalsOf(b)): MatchResult {
  const no = (reason: string): MatchResult => ({ match: false, reasons: [reason] });
  if (a.id === b.id) return no("același anunț");
  if (sa.url && sa.url === sb.url) return { match: true, reasons: ["aceeași adresă"] };
  if (!sa.listingPage || !sb.listingPage) return no("pagină de rezultate, nu anunț");
  // Doar între portaluri: pe același portal, un agent cu același telefon are de obicei mai multe imobile.
  if (sa.portal === sb.portal) return no("același portal");
  if (sa.tx !== "necunoscut" && sb.tx !== "necunoscut" && sa.tx !== sb.tx) return no("tranzacții diferite");
  if (sa.area && sb.area && sa.area !== sb.area) return no("zone diferite");
  if (sa.rooms != null && sb.rooms != null && sa.rooms !== sb.rooms) return no("număr diferit de camere");
  if (sa.size != null && sb.size != null && !sizeClose(sa.size, sb.size)) return no("suprafețe diferite");
  if (sa.priceEur != null && sb.priceEur != null && !priceClose(sa.priceEur, sb.priceEur)) return no("prețuri diferite");
  if (sa.phone && sb.phone && sa.phone !== sb.phone) return no("telefoane diferite");

  const reasons: string[] = [];
  const samePhone = !!sa.phone && sa.phone === sb.phone;
  const sameArea = !!sa.area && sa.area === sb.area;
  const sameRooms = sa.rooms != null && sa.rooms === sb.rooms;
  const closeSize = sa.size != null && sb.size != null;
  const closePrice = sa.priceEur != null && sb.priceEur != null;
  const similarTitle = titleSimilarity(a.title, b.title) >= TITLE_SIMILARITY_MIN;
  if (samePhone) reasons.push("același telefon");
  if (sameArea) reasons.push(`aceeași zonă (${sa.area})`);
  if (sameRooms) reasons.push(`${sa.rooms} camere`);
  if (closeSize) reasons.push("suprafață apropiată");
  if (closePrice) reasons.push("preț apropiat");
  if (similarTitle) reasons.push("titlu asemănător");

  const physical = sameRooms && (closeSize || closePrice);
  const located = sameArea || similarTitle;
  const broad = sameArea && BROAD_AREAS.has(sa.area!);
  const match =
    (samePhone && sameRooms && ((closeSize && closePrice) || ((closeSize || closePrice) && located))) ||
    (sameArea && !broad && sameRooms && closeSize && closePrice) ||
    (similarTitle && sameArea && physical);
  return { match, reasons: match ? reasons : ["semnale insuficiente"] };
}

/** Cât de bun este anunțul ca principal: telefon, date complete, actualizare recentă. */
export function primaryRank(l: DedupListing, s = signalsOf(l)): number {
  let score = 0;
  if (s.phone) score += 1000;
  if (s.area) score += 50;
  if (s.rooms != null) score += 50;
  if (s.size != null) score += 50;
  if (s.priceEur != null) score += 50;
  if ((l.images?.length ?? 0) > 0) score += 30;
  if ((l.description ?? "").length >= 200) score += 30;
  if (l.is_active !== false) score += 100;
  return score;
}

const stamp = (l: DedupListing) => {
  const t = Date.parse(l.last_seen_at ?? l.scraped_at ?? l.created_at ?? "");
  return Number.isFinite(t) ? t : 0;
};

export interface DuplicateGroup<T extends DedupListing = DedupListing> {
  key: string;
  primary: T;
  variants: T[];
  /** Motivele potrivirii pentru fiecare variantă. */
  reasons: Record<string, string[]>;
  portals: string[];
}

/** Grupează anunțurile; fiecare variantă se potrivește direct cu principalul grupului. */
export function groupCrossPortalDuplicates<T extends DedupListing>(listings: T[]): DuplicateGroup<T>[] {
  const sig = new Map<string, Signals>();
  for (const l of listings) sig.set(l.id, signalsOf(l));
  const ordered = [...listings].sort((a, b) =>
    primaryRank(b, sig.get(b.id)) - primaryRank(a, sig.get(a.id)) || stamp(b) - stamp(a) || a.id.localeCompare(b.id));

  const groups: Array<{ primary: T; variants: T[]; reasons: Record<string, string[]> }> = [];
  const byBucket = new Map<string, number[]>();
  const groupOfId = new Map<string, number>();
  const bucketsOf = (s: Signals) => {
    const keys: string[] = [];
    if (s.url) keys.push(`u:${s.url}`);
    if (s.phone) keys.push(`p:${s.phone}`);
    if (s.rooms != null) keys.push(`r:${s.area ?? "?"}:${s.rooms}`);
    return keys;
  };

  const explicit = ordered.filter((l) => l.duplicate_of && listings.some((o) => o.id === l.duplicate_of));
  const rest = ordered.filter((l) => !explicit.includes(l));

  for (const l of rest) {
    const s = sig.get(l.id)!;
    const keys = bucketsOf(s);
    const candidates = [...new Set(keys.flatMap((k) => byBucket.get(k) ?? []))].sort((x, y) => x - y);
    let target = -1;
    let reasons: string[] = [];
    for (const gi of candidates) {
      const g = groups[gi];
      // Un singur anunț per portal într-un grup (în afară de aceeași adresă salvată de două ori).
      if ([g.primary, ...g.variants].some((m) => sig.get(m.id)!.portal === s.portal && sig.get(m.id)!.url !== s.url)) continue;
      const r = compareListings(g.primary, l, sig.get(g.primary.id), s);
      if (r.match) { target = gi; reasons = r.reasons; break; }
    }
    if (target === -1) {
      target = groups.push({ primary: l, variants: [], reasons: {} }) - 1;
    } else {
      groups[target].variants.push(l);
      groups[target].reasons[l.id] = reasons;
    }
    groupOfId.set(l.id, target);
    for (const k of keys) byBucket.set(k, [...(byBucket.get(k) ?? []), target]);
  }

  // Duplicatele deja marcate în baza de date rămân lângă anunțul lor original.
  for (const l of explicit) {
    let root = l.duplicate_of!;
    const seen = new Set<string>();
    while (!groupOfId.has(root) && !seen.has(root)) {
      seen.add(root);
      const parent = listings.find((o) => o.id === root)?.duplicate_of;
      if (!parent) break;
      root = parent;
    }
    const gi = groupOfId.get(root);
    if (gi === undefined) { groupOfId.set(l.id, groups.push({ primary: l, variants: [], reasons: {} }) - 1); continue; }
    groups[gi].variants.push(l);
    groups[gi].reasons[l.id] = ["marcat duplicat la colectare"];
    groupOfId.set(l.id, gi);
  }

  return groups.map((g) => {
    const members = [g.primary, ...g.variants].sort((a, b) =>
      primaryRank(b, sig.get(b.id)) - primaryRank(a, sig.get(a.id)) || stamp(b) - stamp(a) || a.id.localeCompare(b.id));
    const primary = members[0];
    const reasons = { ...g.reasons };
    if (primary.id !== g.primary.id) { reasons[g.primary.id] = reasons[primary.id] ?? ["același imobil"]; delete reasons[primary.id]; }
    return {
      key: primary.id,
      primary,
      variants: members.slice(1),
      reasons,
      portals: [...new Set(members.map((m) => sig.get(m.id)!.portal))],
    };
  });
}
