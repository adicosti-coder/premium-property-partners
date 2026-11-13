/**
 * Estimarea de vânzare, proiecția la 5 ani, intenția, pre-completarea din link și
 * mesajul WhatsApp ale calculatorului unificat. Funcții pure, testate.
 *
 * Preț €/mp în 3 niveluri: (1) mediana anunțurilor colectate, (2) tabelul de referință
 * `timisoara_market_indices` — ambele prin RPC-ul `get_calculator_sale_benchmark` —
 * și (3) grila de cartiere a evaluării gratuite (`gridSaleBenchmark`).
 */
import { neighborhoods } from "@/data/neighborhoods";
import { MANAGEMENT_POLICY } from "./managementPolicy";
import { PROPERTY_TYPES, type PropertyTypeValue } from "./ownerIncomeEstimate";
import { REFINEMENTS, refinementFactors, type Refinements } from "./calculatorRefinements";
import { isValidPropertySurface, matchUnifiedZone, type UnifiedZoneValue } from "./unifiedCalculator";

export type SaleTier = "listings" | "index" | "grid";
export interface SaleBenchmark { eurSqm: number; tier: SaleTier; sample?: number; source?: string }

/** Ultimul nivel: grila de cartiere folosită și pe /evaluare-gratuita. */
const GRID_NEIGHBORHOODS: Partial<Record<UnifiedZoneValue, string[]>> = {
  central: ["iosefin", "elisabetin"],
  "complex-studentesc": ["complex-studentesc"],
  "city-of-mara": ["circumvalatiunii"],
  nordone: ["zona-aradului"],
  monarch: ["zona-aradului"],
};

export function cityAverageSqm(): number {
  const known = neighborhoods.map((n) => n.avgPricePerSqm).filter((v) => v > 0);
  return known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : 1900;
}

/** €/mp din grila de cartiere pentru un slug de cartier (evaluare gratuită) sau o zonă a calculatorului. */
export function gridSaleBenchmark(zone: UnifiedZoneValue | string): SaleBenchmark {
  const slugs = GRID_NEIGHBORHOODS[zone as UnifiedZoneValue] ?? [zone];
  const values = slugs.map((slug) => neighborhoods.find((n) => n.slug === slug)?.avgPricePerSqm ?? 0).filter((v) => v > 0);
  const eurSqm = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : cityAverageSqm();
  return { eurSqm, tier: "grid" };
}

/** Răspunsul RPC-ului devine nivelul 1/2; orice răspuns invalid cade pe grilă. */
export function resolveSaleBenchmark(rpc: unknown, zone: UnifiedZoneValue): SaleBenchmark {
  const r = rpc as { eur_sqm?: unknown; tier?: unknown; sample?: unknown; source?: unknown } | null;
  const eurSqm = Number(r?.eur_sqm);
  if (r && (r.tier === "listings" || r.tier === "index") && Number.isFinite(eurSqm) && eurSqm >= 300 && eurSqm <= 8000) {
    return { eurSqm: Math.round(eurSqm), tier: r.tier, ...(typeof r.sample === "number" ? { sample: r.sample } : {}), ...(typeof r.source === "string" ? { source: r.source } : {}) };
  }
  return gridSaleBenchmark(zone);
}

/** Factor pe tip, identic cu evaluarea gratuită; pensiunile, hotelurile și vilele de vacanță cer evaluare individuală. */
const SALE_TYPE_FACTOR: Partial<Record<PropertyTypeValue, number>> = {
  garsoniera: 1, "2-camere": 1, "3-camere": 1, penthouse: 1, "casa-vila": 1.1,
};

export function roomsForType(type: PropertyTypeValue): number | null {
  return type === "garsoniera" ? 1 : type === "2-camere" ? 2 : type === "3-camere" ? 3 : null;
}

export interface SaleEstimate { eurSqm: number; mid: number; min: number; max: number; tier: SaleTier }

const round500 = (v: number) => Math.round(v / 500) * 500;

/** Valoare de vânzare: €/mp × suprafață × bife (procente aprobate), interval ±8% ca evaluarea gratuită. */
export function estimateSale(b: SaleBenchmark | null, surface: number, type: PropertyTypeValue, refinements?: Refinements): SaleEstimate | null {
  const typeFactor = SALE_TYPE_FACTOR[type];
  if (!b || !typeFactor || !isValidPropertySurface(surface)) return null;
  const eurSqm = Math.round(b.eurSqm * typeFactor * refinementFactors(refinements).sale);
  const mid = round500(eurSqm * surface);
  return { eurSqm, mid, min: round500(mid * 0.92), max: round500(mid * 1.08), tier: b.tier };
}

/** Randament net anual = venit net lunar × 12 / valoarea de vânzare. */
export function annualNetYieldPct(netMonthly: number, saleValue: number): number | null {
  if (!(saleValue > 0) || !(netMonthly > 0)) return null;
  return Math.round(((netMonthly * 12) / saleValue) * 1000) / 10;
}

export const YIELD_RANGE = { min: 6.5, max: 9.4 } as const;
/** Fără afirmații peste intervalul aprobat: peste 9,4% afișăm intervalul și evaluarea individuală. */
export function yieldDisplay(pct: number | null): { kind: "exact"; value: number } | { kind: "range" } {
  return pct !== null && pct <= YIELD_RANGE.max ? { kind: "exact", value: pct } : { kind: "range" };
}

export interface FiveYearProjection { years: number; saleToday: number; hotelTotal: number; classicTotal: number }
/** Fără creșteri de preț sau indexări presupuse: sumele de azi × 12 × ani. */
export function fiveYearProjection(input: { saleValue: number | null; hotelNetMonthly: number; classicRentMonthly: number; years?: number }): FiveYearProjection {
  const years = input.years ?? 5;
  return {
    years,
    saleToday: Math.max(0, Math.round(input.saleValue ?? 0)),
    hotelTotal: Math.max(0, Math.round(input.hotelNetMonthly * 12 * years)),
    classicTotal: Math.max(0, Math.round(input.classicRentMonthly * 12 * years)),
  };
}

export const INTENTS = [
  { value: "vanzare", ro: "Vreau să vând", en: "I want to sell" },
  { value: "hotelier", ro: "Administrare regim hotelier", en: "Short-term rental management" },
  { value: "chirie", ro: "Chirie clasică", en: "Long-term rent" },
  { value: "toate", ro: "Analizez toate variantele", en: "Comparing all options" },
] as const;
export type Intent = (typeof INTENTS)[number]["value"];

export type LeadCalculatorEvent = "lead_calculator_vanzare" | "lead_calculator_hotelier" | "lead_calculator_chirie";
/** Un singur eveniment per cerere; „toate” se raportează ca hotelier (serviciul principal). */
export function leadEventForIntent(intent: Intent, v: { saleValue: number | null; hotelNetMonthly: number; classicRentMonthly: number }): { event: LeadCalculatorEvent; value: number } {
  if (intent === "vanzare") return { event: "lead_calculator_vanzare", value: Math.round(v.saleValue ?? 0) };
  if (intent === "chirie") return { event: "lead_calculator_chirie", value: Math.round(v.classicRentMonthly * 12) };
  return { event: "lead_calculator_hotelier", value: Math.round(v.hotelNetMonthly * 12) };
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export interface CalculatorPrefill { zone?: UnifiedZoneValue; type?: PropertyTypeValue; surface?: number; name?: string; intent?: Intent }
/** Pre-completare din link outbound: ?zona=&camere=&mp=&nume=&intentie= (valori invalide ignorate). */
export function parseCalculatorPrefill(search: string): CalculatorPrefill {
  const q = new URLSearchParams(search);
  const out: CalculatorPrefill = {};
  const zona = q.get("zona");
  if (zona && zona.length <= 60) {
    const z = matchUnifiedZone(zona.replace(/[-_]+/g, " ")) ?? matchUnifiedZone(zona);
    if (z) out.zone = z;
  }
  const camere = fold(q.get("camere") ?? "");
  if (camere) {
    const exact = PROPERTY_TYPES.find((t) => t.value === camere);
    if (exact) out.type = exact.value;
    else if (/^(1|garsonier.*|studio)$/.test(camere)) out.type = "garsoniera";
    else if (camere === "2") out.type = "2-camere";
    else if (/^([3-9]|3\+|4\+)$/.test(camere)) out.type = "3-camere";
  }
  const mp = Number(q.get("mp"));
  if (isValidPropertySurface(mp)) out.surface = mp;
  const nume = (q.get("nume") ?? "").trim().replace(/\s+/g, " ");
  if (nume.length >= 2 && nume.length <= 40 && /^[\p{L}][\p{L} .'-]*$/u.test(nume)) out.name = nume;
  const intentie = fold(q.get("intentie") ?? "");
  const intentAlias: Record<string, Intent> = { vanzare: "vanzare", vand: "vanzare", vinde: "vanzare", hotelier: "hotelier", administrare: "hotelier", "regim-hotelier": "hotelier", chirie: "chirie", inchiriere: "chirie", toate: "toate" };
  if (intentAlias[intentie]) out.intent = intentAlias[intentie];
  return out;
}

const REFINEMENT_TIPS: Record<keyof Refinements, { ro: string; en: string }> = {
  parking: { ro: "Un loc de parcare inclus în ofertă: +5% la prețul de vânzare, +3% la tariful pe noapte.", en: "Include a parking space: +5% sale price, +3% nightly rate." },
  newBuild: { ro: "Pune în valoare anul construcției în anunț, dacă blocul e după 2018: +7% la vânzare, +5% la tarif.", en: "Highlight the build year if after 2018: +7% sale, +5% nightly rate." },
  heatingAc: { ro: "Centrală proprie și aer condiționat: +2% la vânzare, +4% la tariful pe noapte.", en: "Own boiler and air conditioning: +2% sale, +4% nightly rate." },
  furnished: { ro: "Mobilare completă și electrocasnice moderne: +3% la vânzare, +8% la tarif și ocupare mai bună.", en: "Full modern furnishing: +3% sale, +8% nightly rate and better occupancy." },
};

/** 2–3 recomandări: întâi cele din analiza foto AI, apoi bifele încă nebifate, după impactul pe tarif. */
export function buildOptimizationTips(refinements: Refinements, aiRecommendations: unknown, language: "ro" | "en" = "ro"): string[] {
  const ai = Array.isArray(aiRecommendations)
    ? aiRecommendations.filter((t): t is string => typeof t === "string").map((t) => t.replace(/\s+/g, " ").trim()).filter((t) => t.length >= 8 && t.length <= 220).slice(0, 2)
    : [];
  const missing = [...REFINEMENTS].filter((r) => !refinements[r.key]).sort((a, b) => b.nightly - a.nightly).map((r) => REFINEMENT_TIPS[r.key][language]);
  return [...ai, ...missing].slice(0, 3);
}

export interface WhatsappSummary {
  name?: string;
  locationSummary: string;
  surface: number;
  intentLabel: string;
  sale: SaleEstimate | null;
  classicRent: number;
  netMin: number;
  netMax: number;
  nightlyRate: number;
  occupancy: number;
  refinements: string[];
  photoScore?: number | null;
}

const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;

export function buildCalculatorWhatsappMessage(s: WhatsappSummary): string {
  return [
    s.name ? `Salut, sunt ${s.name}. Am folosit calculatorul RealTrust:` : "Salut! Am folosit calculatorul RealTrust:",
    "",
    s.locationSummary,
    `🏠 Suprafață: ${s.surface} mp`,
    `🎯 Intenție: ${s.intentLabel}`,
    s.refinements.length ? `• Dotări: ${s.refinements.join(", ")}` : null,
    s.photoScore != null ? `• Scor foto AI: ${s.photoScore}/100` : null,
    "",
    "📊 Estimări:",
    s.sale ? `• Valoare de vânzare: ${eur(s.sale.min)} – ${eur(s.sale.max)} (~${s.sale.eurSqm.toLocaleString("ro-RO")} €/mp)` : "• Valoare de vânzare: evaluare individuală",
    `• Chirie clasică: ~${eur(s.classicRent)}/lună`,
    `• Venit net regim hotelier: ${eur(s.netMin)} – ${eur(s.netMax)}/lună (după administrare ${Math.round(MANAGEMENT_POLICY.commissionMin * 100)}–${Math.round(MANAGEMENT_POLICY.commissionMax * 100)}% din venitul net)`,
    `• Scenariu: ~${s.nightlyRate} €/noapte, ocupare ${Math.round(s.occupancy * 100)}%`,
    "",
    "Aș vrea o discuție scurtă ca să rafinăm cifrele.",
  ].filter((l) => l !== null).join("\n");
}
