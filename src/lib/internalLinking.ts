/**
 * ETAPA 5 — Internal linking / topical authority map.
 *
 * Single source of truth for the contextual internal links rendered by
 * <ContextualLinks />. Nothing here changes layout or copy of existing
 * sections — it only decides WHICH page should link to WHICH page, with
 * descriptive (non exact-match) anchor text.
 *
 * Clusters:
 *   property-management  /pentru-proprietari  → preturi, calculator-roi, evaluare-gratuita, investitii
 *   investitii           /investitii          → catalog, calculator, zone, ansambluri, proprietati
 *   servicii             /servicii-imobiliare → proprietati, evaluare, contact
 *   local                /cartiere            → cartiere, ansambluri, proprietati
 *   cazare               /cazare              → apartamente, hostscan-ai, zone turistice
 */

import { neighborhoods } from "@/data/neighborhoods";

export interface ContextualLink {
  href: string;
  /** Descriptive, natural anchor text. */
  label: string;
  /** Optional one-line reason the user would follow this link. */
  description?: string;
}

/* ------------------------------------------------------------------ */
/* Anchor text pools — rotated deterministically so the same phrase is */
/* never reused site-wide for the same target.                         */
/* ------------------------------------------------------------------ */

const ANCHORS = {
  pentruProprietari: [
    "administrarea apartamentului în regim hotelier",
    "cum administrăm apartamentele proprietarilor",
    "serviciul complet de property management",
  ],
  preturi: [
    "comisioanele și pachetele de administrare",
    "cât costă administrarea în regim hotelier",
    "structura de costuri, transparent",
  ],
  calculatorRoi: [
    "analiza de randament pentru apartamentul tău",
    "calculul veniturilor lunare estimate",
    "simulare de randament net",
  ],
  evaluare: [
    "evaluare gratuită a proprietății",
    "cere o estimare de preț pentru apartament",
    "analiză gratuită a potențialului proprietății",
  ],
  investitii: [
    "investiții imobiliare în Timișoara",
    "oportunități de investiție cu randament",
    "ghidul investițiilor în apartamente",
  ],
  catalog: [
    "catalogul de investiții disponibile",
    "apartamente cu randament calculat",
    "portofoliul de oportunități de investiție",
  ],
  servicii: [
    "servicii imobiliare complete în Timișoara",
    "vânzări, închirieri și consultanță imobiliară",
    "cum te ajutăm la vânzare sau achiziție",
  ],
  cartiere: [
    "ghidul cartierelor din Timișoara",
    "prețuri și randamente pe zone",
    "harta zonelor de interes",
  ],
  ansambluri: [
    "ansamblurile rezidențiale din Timișoara",
    "complexuri noi cu potențial de închiriere",
    "proiectele rezidențiale monitorizate de noi",
  ],
  cazare: [
    "apartamentele noastre de cazare",
    "cazare în regim hotelier în Timișoara",
    "unitățile ApArt Hotel disponibile",
  ],
  hostscan: [
    "analiza AI a potențialului de cazare",
    "scanează gratuit potențialul apartamentului",
    "diagnostic automat pentru gazde",
  ],
  contact: [
    "vorbește cu un consultant RealTrust",
    "datele de contact ale echipei",
    "programează o discuție",
  ],
  proprietati: [
    "proprietățile disponibile acum",
    "anunțurile active din portofoliu",
    "apartamente verificate de echipa noastră",
  ],
} as const;

type AnchorKey = keyof typeof ANCHORS;

/** Stable, non-random anchor pick so prerender output is deterministic. */
const pick = (key: AnchorKey, seed: string): string => {
  const pool = ANCHORS[key];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return pool[h % pool.length];
};

const link = (key: AnchorKey, href: string, seed: string, description?: string): ContextualLink => ({
  href,
  label: pick(key, seed),
  description,
});

/* ------------------------------------------------------------------ */
/* Residential complexes registry                                      */
/* ------------------------------------------------------------------ */

export interface ComplexEntry {
  slug: string;
  name: string;
  /** Canonical route for the complex page. */
  href: string;
  /** Neighborhood slug (/imobiliare-timisoara/:zona) — only when certain. */
  zoneSlug?: string;
  /** Keywords matched against a property location/name. */
  matchers: string[];
}

export const COMPLEXES: ComplexEntry[] = [
  { slug: "isho", name: "ISHO", href: "/complexe/isho", zoneSlug: "isho", matchers: ["isho"] },
  { slug: "ateneo", name: "Ateneo", href: "/complexe/ateneo", zoneSlug: "elisabetin", matchers: ["ateneo", "trevi"] },
  { slug: "green-forest", name: "Green Forest", href: "/complexe/green-forest", matchers: ["green forest", "padurea verde", "pădurea verde"] },
  { slug: "helios", name: "Helios", href: "/complexe/helios", zoneSlug: "isho", matchers: ["helios"] },
  { slug: "fructus-plaza", name: "Fructus Plaza", href: "/complexe/fructus-plaza", zoneSlug: "iosefin", matchers: ["fructus"] },
  { slug: "city-of-mara", name: "City of Mara", href: "/complexe/city-of-mara", zoneSlug: "circumvalatiunii", matchers: ["city of mara", "mara", "avenue of mara"] },
  { slug: "vivalia", name: "Vivalia", href: "/complexe/vivalia", zoneSlug: "isho", matchers: ["vivalia"] },
  { slug: "nord-one", name: "NordOne", href: "/complexe/nord-one", zoneSlug: "zona-aradului", matchers: ["nord one", "nordone"] },
  { slug: "xcity-towers", name: "XCity Towers", href: "/complexe/xcity-towers", matchers: ["xcity", "x city", "x-city"] },
  { slug: "denya-forest", name: "Denya Forest", href: "/complexe/denya-forest", zoneSlug: "dumbravita", matchers: ["denya"] },
  { slug: "ring", name: "Ring Residence", href: "/complex/ring", matchers: ["ring"] },
  { slug: "iris", name: "Iris", href: "/complex/iris", matchers: ["iris"] },
  { slug: "monarch", name: "Monarch", href: "/complex/monarch", matchers: ["monarch"] },
  // Paltim has a richer landing page; ComplexDetail canonicalizes there too.
  { slug: "paltim", name: "Paltim", href: "/complexe/paltim", matchers: ["paltim"] },
  { slug: "campeador", name: "Campeador", href: "/complex/campeador", matchers: ["campeador"] },
];

const strip = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Finds the residential complex a property belongs to, from free text. */
export const findComplexForText = (...parts: (string | null | undefined)[]): ComplexEntry | undefined => {
  const hay = strip(parts.filter(Boolean).join(" "));
  if (!hay.trim()) return undefined;
  return COMPLEXES.find((c) => c.matchers.some((m) => hay.includes(strip(m))));
};

/** All complexes mapped to a given neighborhood slug. */
export const complexesInZone = (zoneSlug: string): ComplexEntry[] =>
  COMPLEXES.filter((c) => c.zoneSlug === zoneSlug);

/** Neighborhood (zone) page for a free-text location, when we can be sure. */
const ZONE_MATCHERS: { slug: string; keywords: string[] }[] = [
  { slug: "isho", keywords: ["isho", "fabric", "take ionescu", "traian", "vivalia", "helios"] },
  { slug: "circumvalatiunii", keywords: ["circumvalatiunii", "city of mara", "mara", "unirii", "ultracentral", "ultra-central"] },
  { slug: "zona-girocului", keywords: ["girocului", "soarelui", "martirilor"] },
  { slug: "zona-aradului", keywords: ["aradului", "iulius", "torontalului", "openville", "nord one", "nordone"] },
  { slug: "sagului", keywords: ["sagului", "steaua", "europa"] },
  { slug: "calea-lipovei", keywords: ["lipovei", "ionescu de la brad"] },
  { slug: "complex-studentesc", keywords: ["complex studentesc", "studentesc", "uvt", "politehnica", "dambovita"] },
  { slug: "iosefin", keywords: ["iosefin", "fructus"] },
  { slug: "elisabetin", keywords: ["elisabetin", "cetate", "centru", "paltim", "ateneo"] },
  { slug: "dumbravita", keywords: ["dumbravita", "denya"] },
  { slug: "giroc", keywords: ["giroc", "chisoda"] },
];

export const findZoneForText = (...parts: (string | null | undefined)[]) => {
  const hay = strip(parts.filter(Boolean).join(" "));
  if (!hay.trim()) return undefined;
  const hit = ZONE_MATCHERS.find((z) => z.keywords.some((k) => hay.includes(strip(k))));
  if (!hit) return undefined;
  const data = neighborhoods.find((n) => n.slug === hit.slug);
  return data ? { slug: data.slug, name: data.fullName, href: `/imobiliare-timisoara/${data.slug}` } : undefined;
};

/* ------------------------------------------------------------------ */
/* Cluster builders                                                    */
/* ------------------------------------------------------------------ */

export interface PropertyLinkInput {
  slug?: string | null;
  name?: string | null;
  location?: string | null;
  listingType?: string | null;
  roiPercentage?: string | number | null;
}

/**
 * Property page → zone, complex, services, investment, valuation.
 * Only links that make sense for the concrete property are returned.
 */
export const buildPropertyLinks = (p: PropertyLinkInput): ContextualLink[] => {
  const seed = p.slug || p.name || "property";
  const out: ContextualLink[] = [];

  const zone = findZoneForText(p.location, p.name);
  if (zone) {
    out.push({
      href: zone.href,
      label: `apartamente disponibile în ${zone.name}`,
      description: `Prețuri medii, randamente și anunțuri active în ${zone.name}, Timișoara.`,
    });
  }

  const complex = findComplexForText(p.location, p.name);
  if (complex) {
    out.push({
      href: complex.href,
      label: `proprietățile disponibile în ansamblul ${complex.name}`,
      description: `Detalii despre ansamblul ${complex.name} și unitățile administrate acolo.`,
    });
  }

  const type = (p.listingType || "").toLowerCase();
  const roi = typeof p.roiPercentage === "string" ? parseFloat(p.roiPercentage) : p.roiPercentage ?? 0;
  const isInvestment = type === "investitie" || type === "vanzare" || (roi ?? 0) > 0;

  if (type === "vanzare" || type === "inchiriere") {
    out.push(link("servicii", "/servicii-imobiliare", seed, "Vânzări, închirieri și consultanță pentru cumpărători."));
  }
  if (isInvestment) {
    out.push(link("investitii", "/investitii", seed, "Cum calculăm randamentul net și ce presupune regimul hotelier."));
  }
  if (type === "cazare" || type === "investitie" || !type) {
    out.push(link("pentruProprietari", "/pentru-proprietari", seed, "Ce include administrarea completă a unui apartament."));
  }
  out.push(link("evaluare", "/evaluare-gratuita", seed, "Primești o estimare de preț și de venit lunar, fără costuri."));

  return dedupe(out).slice(0, 5);
};

/** Neighborhood page → complexes, properties, investment, services, guide. */
export const buildNeighborhoodLinks = (zoneSlug: string, zoneName: string): ContextualLink[] => {
  const out: ContextualLink[] = [
    link("investitii", "/investitii", zoneSlug, `De ce ${zoneName} intră în calculele investitorilor noștri.`),
    link("servicii", "/servicii-imobiliare", zoneSlug, "Asistență la vânzare, achiziție și închiriere."),
    link("catalog", "/catalog-investitii", zoneSlug, "Oportunități cu randament estimat, actualizate periodic."),
    link("cartiere", "/cartiere", zoneSlug, "Compară zonele Timișoarei după preț și randament."),
  ];

  const zoneComplexes = complexesInZone(zoneSlug);
  zoneComplexes.slice(0, 3).forEach((c) => {
    out.unshift({
      href: c.href,
      label: `ansamblul ${c.name} din ${zoneName}`,
      description: `Randament, ocupare și unități administrate în ${c.name}.`,
    });
  });

  return dedupe(out).slice(0, 6);
};

/** Complex page → zone, other complexes, investment, services, properties. */
export const buildComplexLinks = (slug: string, name: string): ContextualLink[] => {
  const entry = COMPLEXES.find((c) => c.slug === slug);
  const out: ContextualLink[] = [];

  if (entry?.zoneSlug) {
    const zone = neighborhoods.find((n) => n.slug === entry.zoneSlug);
    if (zone) {
      out.push({
        href: `/imobiliare-timisoara/${zone.slug}`,
        label: `piața imobiliară din ${zone.fullName}`,
        description: `Prețuri, cerere și anunțuri active în zona în care se află ${name}.`,
      });
    }
  }

  out.push(link("investitii", "/investitii", slug, `Cum evaluăm o investiție într-un apartament din ${name}.`));
  out.push(link("servicii", "/servicii-imobiliare", slug, "Consultanță la achiziție, vânzare și închiriere."));
  out.push(link("pentruProprietari", "/pentru-proprietari", slug, "Administrare completă pentru apartamentele din ansamblu."));
  out.push(link("ansambluri", "/ansambluri-rezidentiale", slug, "Vezi celelalte ansambluri monitorizate de RealTrust."));

  return dedupe(out).slice(0, 5);
};

/** Hub cluster blocks used on the pillar pages. */
export const CLUSTER_LINKS: Record<string, ContextualLink[]> = {
  "pentru-proprietari": [
    { href: "/preturi", label: "comisioanele și pachetele de administrare", description: "Ce reținem din venit și ce servicii sunt incluse." },
    { href: "/calculator-roi", label: "analiza de randament pentru apartamentul tău", description: "Estimare de venit lunar cu ipoteze transparente." },
    { href: "/evaluare-gratuita", label: "evaluare gratuită a proprietății", description: "Primești o estimare de preț și de potențial de închiriere." },
    { href: "/investitii", label: "investiții imobiliare în Timișoara", description: "Cum arată randamentele reale din portofoliul administrat." },
    { href: "/hostscan-ai", label: "analiza AI a potențialului de cazare", description: "Scanare automată a apartamentului, în câteva minute." },
    { href: "/blog/categorie/sfaturi-proprietari", label: "ghiduri pentru proprietari și gazde", description: "Regim hotelier, Booking, Airbnb și administrare practică." },
  ],
  investitii: [
    { href: "/catalog-investitii", label: "catalogul de investiții disponibile", description: "Apartamente cu capital necesar și randament estimat." },
    { href: "/zone-investitii-timisoara", label: "cele mai bune zone pentru investiții în Timișoara", description: "Preț, chirie, cerere, lichiditate și risc, zonă cu zonă." },
    { href: "/calculator-roi", label: "simulare de randament net", description: "Compară regimul hotelier cu chiria clasică." },
    { href: "/cartiere", label: "prețuri și randamente pe zone", description: "Care cartiere din Timișoara susțin cel mai bine investiția." },
    { href: "/ansambluri-rezidentiale", label: "ansamblurile rezidențiale din Timișoara", description: "Proiecte noi cu cerere constantă de cazare." },
    { href: "/pentru-proprietari", label: "administrarea apartamentului în regim hotelier", description: "Ce se întâmplă după achiziție, operațional." },
    { href: "/blog/categorie/investitii-imobiliare", label: "analize despre piața imobiliară locală", description: "Studii de caz și evoluția prețurilor." },
  ],
  "servicii-imobiliare": [
    { href: "/imobiliare", label: "proprietățile disponibile acum", description: "Apartamente de vânzare și de închiriat, verificate." },
    { href: "/evaluare-gratuita", label: "cere o estimare de preț pentru apartament", description: "Evaluare gratuită, fără obligații." },
    { href: "/cartiere", label: "ghidul cartierelor din Timișoara", description: "Prețul mediu pe metru pătrat, zonă cu zonă." },
    { href: "/investitii", label: "oportunități de investiție cu randament", description: "Pentru cumpărătorii care caută venit pasiv." },
    { href: "/contact", label: "vorbește cu un consultant RealTrust", description: "Program, telefon și adresă." },
  ],
  cartiere: [
    { href: "/ansambluri-rezidentiale", label: "ansamblurile rezidențiale din fiecare zonă", description: "Proiectele noi și unitățile administrate acolo." },
    { href: "/investitii", label: "investiții imobiliare în Timișoara", description: "Cum alegem zonele cu cel mai bun randament." },
    { href: "/servicii-imobiliare", label: "servicii imobiliare complete în Timișoara", description: "Vânzare, achiziție și închiriere cu asistență completă." },
    { href: "/imobiliare", label: "anunțurile active din portofoliu", description: "Proprietăți disponibile în toate zonele." },
    { href: "/piata-imobiliara-timisoara", label: "evoluția pieței imobiliare locale", description: "Date de piață actualizate pentru Timișoara." },
  ],
  cazare: [
    { href: "/oaspeti", label: "toate apartamentele disponibile pentru cazare", description: "Unitățile ApArt Hotel din Timișoara." },
    { href: "/rezerva-direct", label: "avantajele rezervării directe", description: "Fără comisioane suplimentare de platformă." },
    { href: "/zona/centru", label: "cazare în centrul Timișoarei", description: "Apartamente la pas de Piața Unirii și Victoriei." },
    { href: "/zona/iulius-town", label: "cazare lângă Iulius Town", description: "Ideal pentru călătorii de business și shopping." },
    { href: "/zona/fabric", label: "cazare în cartierul Fabric", description: "Zona ISHO și malul Begăi." },
    { href: "/hostscan-ai", label: "ești proprietar? scanează potențialul apartamentului", description: "Analiză AI gratuită pentru gazde." },
  ],
};

function dedupe(links: ContextualLink[]): ContextualLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = l.href.replace(/\/+$/, "") || "/";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
