/**
 * Zonele Timișoarei exact cum sunt definite de portalurile de anunțuri
 * (imobiliare.ro, olx.ro, publi24.ro / storia.ro), nu cartierele administrative.
 *
 * Fiecare zonă are o denumire canonică (cea afișată în Admin) + toate variantele
 * în care apare pe portaluri: cu/fără diacritice, prefixate cu „Zona”/„Calea”,
 * forme de slug din URL (`zona-aradului`, `complex-studentesc`) sau sinonime
 * folosite de portaluri diferite (Cetate ↔ Centru, Sever Bocu ↔ Lipovei II).
 */

export interface PortalZone {
  /** Denumirea canonică, afișată în filtre. */
  label: string;
  /** Grupare pentru UI. */
  group: "Centru" | "Nord" | "Sud" | "Est / Vest" | "Limitrof";
  /** Toate variantele de scriere întâlnite pe portaluri. */
  aliases: string[];
}

/** Normalizează pentru potrivire: fără diacritice, fără punctuație, lowercase. */
export function normZone(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const PORTAL_ZONES: PortalZone[] = [
  // ── Centru ────────────────────────────────────────────────────────────────
  { label: "Ultracentral", group: "Centru", aliases: ["ultracentral", "ultra central", "zona ultracentrala", "piata unirii", "piata victoriei", "centrul vechi"] },
  { label: "Central", group: "Centru", aliases: ["central", "centru", "zona centrala", "cetate"] },
  { label: "Semicentral", group: "Centru", aliases: ["semicentral", "semi central", "zona semicentrala"] },
  { label: "Cetate", group: "Centru", aliases: ["cetate", "centru", "central", "zona cetate"] },
  { label: "Iosefin", group: "Centru", aliases: ["iosefin", "zona iosefin", "iosefini", "piata iosefin"] },
  { label: "Elisabetin", group: "Centru", aliases: ["elisabetin", "zona elisabetin", "piata balcescu", "balcescu"] },
  { label: "Fabric", group: "Centru", aliases: ["fabric", "zona fabric", "piata traian"] },
  { label: "Traian", group: "Centru", aliases: ["traian", "piata traian", "zona traian"] },
  { label: "Complex Studențesc", group: "Centru", aliases: ["complex studentesc", "complexul studentesc", "complex-studentesc", "zona complex studentesc", "complex"] },
  { label: "Mehala", group: "Centru", aliases: ["mehala", "zona mehala"] },

  // ── Nord ──────────────────────────────────────────────────────────────────
  { label: "Aradului", group: "Nord", aliases: ["aradului", "calea aradului", "zona aradului", "zona-aradului", "cal aradului"] },
  { label: "Bucovina", group: "Nord", aliases: ["bucovina", "zona bucovina"] },
  { label: "Lipovei", group: "Nord", aliases: ["lipovei", "calea lipovei", "zona lipovei", "zona-lipovei", "cal lipovei"] },
  { label: "Circumvalațiunii", group: "Nord", aliases: ["circumvalatiunii", "circumvalatiune", "zona circumvalatiunii", "zona-circumvalatiunii", "calea circumvalatiunii"] },
  { label: "Torontalului", group: "Nord", aliases: ["torontalului", "calea torontalului", "zona torontalului", "zona-torontalului"] },
  { label: "Ronaț", group: "Nord", aliases: ["ronat", "zona ronat"] },
  { label: "Take Ionescu", group: "Nord", aliases: ["take ionescu", "take-ionescu", "zona take ionescu"] },
  { label: "Dacia", group: "Nord", aliases: ["dacia", "zona dacia"] },
  { label: "Gheorghe Lazăr", group: "Nord", aliases: ["gheorghe lazar", "gh lazar", "zona gheorghe lazar"] },
  { label: "Sever Bocu (Lipovei II)", group: "Nord", aliases: ["sever bocu", "lipovei ii", "lipovei 2", "zona sever bocu"] },
  { label: "Iulius Town", group: "Nord", aliases: ["iulius town", "iulius mall", "zona iulius", "iulius"] },

  // ── Sud ───────────────────────────────────────────────────────────────────
  { label: "Girocului", group: "Sud", aliases: ["girocului", "calea girocului", "zona girocului", "zona-girocului", "cal girocului"] },
  { label: "Soarelui", group: "Sud", aliases: ["soarelui", "zona soarelui"] },
  { label: "Braytim", group: "Sud", aliases: ["braytim", "zona braytim"] },
  { label: "Buziașului", group: "Sud", aliases: ["buziasului", "calea buziasului", "zona buziasului"] },
  { label: "Lunei", group: "Sud", aliases: ["lunei", "zona lunei"] },
  { label: "Șagului", group: "Sud", aliases: ["sagului", "calea sagului", "zona sagului", "zona-sagului", "cal sagului"] },
  { label: "Steaua", group: "Sud", aliases: ["steaua", "zona steaua", "steaua fratelia"] },
  { label: "Dâmbovița", group: "Sud", aliases: ["dambovita", "zona dambovita"] },
  { label: "Blașcovici", group: "Sud", aliases: ["blascovici", "zona blascovici"] },
  { label: "Olimpia-Stadion", group: "Sud", aliases: ["olimpia", "stadion", "olimpia stadion", "zona olimpia", "zona stadion"] },
  { label: "Zona Medicină", group: "Sud", aliases: ["medicina", "zona medicina", "umf", "zona umf"] },
  { label: "Fratelia", group: "Sud", aliases: ["fratelia", "zona fratelia"] },

  // ── Est / Vest / periferice ───────────────────────────────────────────────
  { label: "Plopi", group: "Est / Vest", aliases: ["plopi", "zona plopi"] },
  { label: "Ciarda Roșie", group: "Est / Vest", aliases: ["ciarda rosie", "zona ciarda rosie", "ciarda"] },
  { label: "Freidorf", group: "Est / Vest", aliases: ["freidorf", "zona freidorf"] },
  { label: "Kuncz", group: "Est / Vest", aliases: ["kuncz", "zona kuncz"] },
  { label: "Modern", group: "Est / Vest", aliases: ["modern", "zona modern", "piata dacia modern"] },
  { label: "Tipografilor", group: "Est / Vest", aliases: ["tipografilor", "zona tipografilor"] },
  { label: "UMT", group: "Est / Vest", aliases: ["umt", "zona umt"] },
  { label: "Zona Gării", group: "Est / Vest", aliases: ["zona garii", "gara de nord", "gara", "zona gara"] },
  { label: "Zona Industrială", group: "Est / Vest", aliases: ["zona industriala", "industrial", "calea buziasului industrial"] },
  { label: "Calea Martirilor", group: "Est / Vest", aliases: ["calea martirilor", "martirilor", "zona martirilor", "zona-martirilor"] },
  { label: "Lidia", group: "Sud", aliases: ["lidia", "zona lidia", "strada lidia"] },
  { label: "Odobescu", group: "Centru", aliases: ["odobescu", "zona odobescu"] },
  { label: "Telegrafului", group: "Sud", aliases: ["telegrafului", "zona telegrafului", "calea telegrafului"] },
  { label: "Bogdăneștilor", group: "Est / Vest", aliases: ["bogdanestilor", "zona bogdanestilor", "bogdanesti"] },
  { label: "Dorobanților", group: "Centru", aliases: ["dorobantilor", "zona dorobantilor"] },
  { label: "Simion Bărnuțiu", group: "Est / Vest", aliases: ["simion barnutiu", "barnutiu", "zona simion barnutiu"] },
  { label: "Mircea cel Bătrân", group: "Nord", aliases: ["mircea cel batran", "zona mircea cel batran"] },
  { label: "Crișan", group: "Nord", aliases: ["crisan", "zona crisan"] },
  { label: "Bălcescu", group: "Centru", aliases: ["balcescu", "zona balcescu", "piata nicolae balcescu"] },
  { label: "Weiss / Mehala Nord", group: "Nord", aliases: ["weiss", "zona weiss", "mehala nord"] },
  { label: "Solventul", group: "Est / Vest", aliases: ["solventul", "zona solventul"] },
  { label: "Șoarecului / Lipovei Nord", group: "Nord", aliases: ["soarecului", "lipovei nord", "zona soarecului"] },

  // ── Localități limitrofe (zone separate pe portaluri) ─────────────────────
  { label: "Dumbrăvița", group: "Limitrof", aliases: ["dumbravita", "zona dumbravita", "comuna dumbravita"] },
  { label: "Giroc", group: "Limitrof", aliases: ["giroc", "comuna giroc"] },
  { label: "Chișoda", group: "Limitrof", aliases: ["chisoda"] },
  { label: "Ghiroda", group: "Limitrof", aliases: ["ghiroda"] },
  { label: "Moșnița Nouă", group: "Limitrof", aliases: ["mosnita noua", "mosnita", "mosnita veche"] },
  { label: "Sânmihaiu Român", group: "Limitrof", aliases: ["sanmihaiu roman", "sanmihaiu", "sinmihaiu roman"] },
  { label: "Săcălaz", group: "Limitrof", aliases: ["sacalaz"] },
  { label: "Șag", group: "Limitrof", aliases: ["sag", "comuna sag"] },
  { label: "Remetea Mare", group: "Limitrof", aliases: ["remetea mare", "remetea"] },
  { label: "Sânandrei", group: "Limitrof", aliases: ["sanandrei", "sin andrei", "comuna sanandrei"] },
  { label: "Dudeștii Noi", group: "Limitrof", aliases: ["dudestii noi", "dudesti noi"] },
  { label: "Utvin", group: "Limitrof", aliases: ["utvin"] },
  { label: "Sânmihaiu Nou", group: "Limitrof", aliases: ["sanmihaiu nou", "sinmihaiu nou"] },
  { label: "Pișchia", group: "Limitrof", aliases: ["pischia"] },
  { label: "Covaci", group: "Limitrof", aliases: ["covaci"] },
  { label: "Recaș", group: "Limitrof", aliases: ["recas", "oras recas"] },
];

/** Etichetele canonice, în ordinea din listă. */
export const PORTAL_ZONE_LABELS = PORTAL_ZONES.map((z) => z.label);

const BY_LABEL = new Map(PORTAL_ZONES.map((z) => [normZone(z.label), z]));

/** Toate variantele normalizate ale unei zone (inclusiv eticheta canonică). */
export function zoneAliases(label: string): string[] {
  const z = BY_LABEL.get(normZone(label));
  const base = [label, ...(z?.aliases ?? [])].map(normZone).filter(Boolean);
  return Array.from(new Set(base));
}

/** Textul (zonă + titlu + descriere) conține zona căutată, în orice variantă de portal? */
export function zoneMatchesText(text: string | null | undefined, label: string): boolean {
  const hay = normZone(text);
  if (!hay) return false;
  return zoneAliases(label).some((a) => a.length >= 3 && hay.includes(a));
}

/** Transformă zona brută dintr-un anunț în eticheta canonică (sau null). */
export function canonicalZone(raw: string | null | undefined): string | null {
  const n = normZone(raw);
  if (!n) return null;
  let best: { label: string; len: number } | null = null;
  for (const z of PORTAL_ZONES) {
    for (const a of zoneAliases(z.label)) {
      if (a.length >= 3 && (n === a || n.includes(a)) && (!best || a.length > best.len)) {
        best = { label: z.label, len: a.length };
      }
    }
  }
  return best?.label ?? null;
}

/** Termenul de căutare potrivit pentru un portal (portalurile preferă „Calea X”/„Zona X”). */
export function zoneSearchTerm(label: string): string {
  const z = BY_LABEL.get(normZone(label));
  const prefixed = z?.aliases.find((a) => /^(calea|zona) /i.test(a));
  return prefixed ? `${label} ${prefixed}` : label;
}
