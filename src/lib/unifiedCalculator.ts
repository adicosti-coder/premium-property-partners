/**
 * Logica comună a calculatorului unificat: toate căile de intrare (manual/ansamblu,
 * link, foto) produc aceleași date, iar rezultatul aplică grila oficială 15–20%.
 */
import { calculateManagedIncome, MANAGEMENT_POLICY } from "./managementPolicy";
import { estimateOwnerIncome, PROPERTY_TYPES, ZONES, type Finish, type PropertyTypeValue, type ZoneValue } from "./ownerIncomeEstimate";
import { refinementFactors, type Refinements } from "./calculatorRefinements";

export const MIN_PROPERTY_SURFACE = 15;
export const MAX_PROPERTY_SURFACE = 5000;
export function isValidPropertySurface(surface: number): boolean {
  return Number.isInteger(surface) && surface >= MIN_PROPERTY_SURFACE && surface <= MAX_PROPERTY_SURFACE;
}

/** Keep categorical property identity separate from apartment room counts. */
export function getPropertyLeadIdentity(type: PropertyTypeValue) {
  const property = PROPERTY_TYPES.find((candidate) => candidate.value === type) ?? PROPERTY_TYPES[1];
  const rooms = type === "garsoniera" ? 1 : type === "2-camere" ? 2 : type === "3-camere" ? 3 : undefined;
  return { property_type: type, property_type_label: property.label, tip_proprietate: property.label, numar_camere: rooms };
}

export type UnifiedZoneValue = Exclude<ZoneValue, "isho"> | "monarch" | "paltim" | "denya-forest" | "ateneo" | "future-residence" | "alenia" | "xcity" | "vivalia";
export type LocationMode = "local" | "regional";

/**
 * Coeficienți proprii pentru ansamblurile fără profil comun (raportați la grila pe tip de proprietate):
 * - XCity Towers: chirie 550 €/lună la 2 camere/54 mp (mediana anunțurilor colectate, 2026); tarif calibrat
 *   după XCity 3 (80 €/noapte) față de NordOne (75 €/noapte) — separat complet de NordOne.
 * - Vivalia (Grand, zona Take Ionescu/Tipografilor): chirie 550 €/lună la 2 camere (VDI.ro, Take Ionescu, oct. 2026);
 *   tarif la nivelul ansamblurilor noi de lângă mall-uri (City of Mara, Fructus), fără unitate administrată încă.
 */
export const OWN_ZONE_RATES: Partial<Record<UnifiedZoneValue, { rent: number; adr: number; occupancy: number }>> = {
  xcity: { rent: 1.22, adr: 1.15, occupancy: 0.72 },
  vivalia: { rent: 1.2, adr: 1.05, occupancy: 0.72 },
};

/** Scoped eligibility list; Monarch uses the explicitly approved NordOne estimates. */
export const UNIFIED_ZONES: Array<{
  value: UnifiedZoneValue;
  label: string;
  rent: number;
  adr: number;
  occupancy: number;
  profile: ZoneValue;
  indicative?: boolean;
}> = [
  ["monarch", "Monarch", "nordone"],
  ["nordone", "NordOne", "nordone"],
  ["xcity", "XCity Towers", "alta-zona"],
  ["city-of-mara", "City of Mara", "city-of-mara"],
  ["vivalia", "Vivalia", "alta-zona"],
  ["paltim", "Paltim", "alta-zona"],
  ["ring-residence", "Ring Residence", "ring-residence"],
  ["denya-forest", "Denya Forest", "alta-zona"],
  ["fructus", "Fructus Plaza", "fructus"],
  ["ateneo", "Ateneo", "alta-zona"],
  ["future-residence", "Future Residence", "alta-zona"],
  ["alenia", "Alenia", "alta-zona"],
  ["central", "Central / Iosefin / Elisabetin", "central"],
  ["torontalului", "Calea Torontalului", "torontalului"],
  ["complex-studentesc", "Complex Studențesc", "complex-studentesc"],
  ["alta-zona", "Altă zonă Timișoara / Giroc / Dumbrăvița", "alta-zona"],
].map(([value, label, profile]) => {
  const reference = ZONES.find((candidate) => candidate.value === profile) ?? ZONES[ZONES.length - 1];
  const own = OWN_ZONE_RATES[value as UnifiedZoneValue];
  return { ...reference, ...own, value: value as UnifiedZoneValue, label, profile: reference.value, indicative: !own && profile === "alta-zona" };
});

export function getLocationLeadIdentity(mode: LocationMode, zone: UnifiedZoneValue, regionalLocation: string) {
  const location = mode === "regional" ? regionalLocation.trim() : UNIFIED_ZONES.find((candidate) => candidate.value === zone)?.label ?? "Altă zonă Timișoara / Giroc / Dumbrăvița";
  const serviceTag = mode === "regional" ? "[Consultanță / Regional]" : "[Administrare Locală]";
  return { location_mode: mode, location, service_tag: serviceTag };
}

export function isValidRegionalLocation(value: string): boolean {
  return value.trim().length >= 2 && value.trim().length <= 120 && !/[\r\n<>]/.test(value);
}

const DAYS_PER_MONTH = 30.4;
const CHANNEL_FEE_RATE = 0.15;
const UTILITIES = 120;

export interface UnifiedInput {
  type: PropertyTypeValue;
  zone: UnifiedZoneValue;
  surface: number;
  parking: boolean;
  finish: Finish;
  locationMode?: LocationMode;
  /** Mod național/manual: valorile introduse de proprietar înlocuiesc coeficienții de zonă. */
  manual?: { classicRent?: number; nightlyRate?: number } | null;
  /** Bifele „Rafinează estimarea”: înlocuiesc `parking` și aplică procentele aprobate pe tarif și ocupare. */
  refinements?: Refinements;
}

export interface UnifiedResult {
  classicRent: number;
  nightlyRate: number;
  occupancy: number;
  grossHotel: number;
  /** Venit net la comision maxim (20%). */
  netMin: number;
  /** Venit net la comision minim (15%). */
  netMax: number;
  netMid: number;
  monthlyDelta: number;
}

export function computeUnified(i: UnifiedInput): UnifiedResult {
  const refine = i.refinements;
  const profile = UNIFIED_ZONES.find((candidate) => candidate.value === i.zone)?.profile ?? "alta-zona";
  const own = OWN_ZONE_RATES[i.zone];
  const parking = refine ? refine.parking : i.parking;
  // Cu bife, parcarea adaugă procentul aprobat pe tarif (mai jos), nu coeficientul vechi de 5%.
  const base = { type: i.type, zone: profile, surface: i.surface, parking, finish: i.finish, ...(refine ? { parkingAdrFactor: 1 } : {}), ...(i.locationMode === "regional" ? { zoneProfile: { rent: 1, adr: 1 } } : own ? { zoneProfile: { rent: own.rent, adr: own.adr } } : {}) };
  const hi = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMax });
  const lo = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMin });
  const f = refinementFactors(refine);
  const refined = f.nightly !== 1 || f.occupancyBonus !== 0;
  if (i.manual || refined) {
    const classicRent = i.manual?.classicRent ?? hi.classicRent;
    // Tariful introdus de proprietar rămâne al lui; bifele ajustează doar estimarea automată.
    const nightlyRate = i.manual?.nightlyRate ?? Math.round(hi.nightlyRate * f.nightly);
    const occupancy = Math.min(MANAGEMENT_POLICY.occupancyMax, MANAGEMENT_POLICY.occupancyDefault + f.occupancyBonus);
    const gross = Math.max(0, nightlyRate) * DAYS_PER_MONTH * occupancy;
    const at = (rate: number) =>
      calculateManagedIncome({ gross, channelFees: gross * CHANNEL_FEE_RATE, utilities: UTILITIES, commissionRate: rate }).ownerIncome;
    const netMin = Math.round(at(MANAGEMENT_POLICY.commissionMax));
    const netMax = Math.round(at(MANAGEMENT_POLICY.commissionMin));
    const netMid = Math.round((netMin + netMax) / 2);
    return {
      classicRent: Math.round(Math.max(0, classicRent)),
      nightlyRate: Math.round(nightlyRate),
      occupancy,
      grossHotel: Math.round(gross),
      netMin, netMax, netMid,
      monthlyDelta: Math.round(netMid - classicRent),
    };
  }
  const netMid = Math.round((hi.netRealTrust + lo.netRealTrust) / 2);
  return {
    classicRent: hi.classicRent,
    nightlyRate: hi.nightlyRate,
    occupancy: hi.occupancy,
    grossHotel: hi.grossHotel,
    netMin: hi.netRealTrust,
    netMax: lo.netRealTrust,
    netMid,
    monthlyDelta: netMid - hi.classicRent,
  };
}

export interface ListingAnalysisLike {
  camere?: number | null;
  suprafata?: number | null;
  zona?: string | null;
  scor?: number | null;
  max_scor?: number | null;
  tip_proprietate?: string | null;
  /** Recomandări din analiza foto/link (text liber, filtrat înainte de afișare). */
  recomandari?: unknown;
}

const ZONE_PATTERNS: Array<[RegExp, UnifiedZoneValue]> = [
  [/isho/i, "alta-zona"],
  [/monarch/i, "monarch"],
  [/x\s*-?\s*city/i, "xcity"],
  [/vivalia/i, "vivalia"],
  [/mara/i, "city-of-mara"],
  [/nord\s*one/i, "nordone"],
  [/ring/i, "ring-residence"],
  [/fructus/i, "fructus"],
  [/paltim/i, "paltim"],
  [/denya/i, "denya-forest"],
  [/ateneo/i, "ateneo"],
  [/future\s*residence/i, "future-residence"],
  [/alenia/i, "alenia"],
  [/torontal/i, "torontalului"],
  [/student/i, "complex-studentesc"],
  [/centr|cetate|iosefin|elisabetin|fabric/i, "central"],
];

/** Recunoaște un ansamblu/cartier eligibil după valoare, etichetă sau alias (ISHO rămâne exclus → „Altă zonă”). */
export function matchUnifiedZone(text: string): UnifiedZoneValue | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;
  const exact = UNIFIED_ZONES.find((zone) => zone.value === value || zone.label.toLowerCase() === value);
  if (exact) return exact.value;
  return ZONE_PATTERNS.find(([re]) => re.test(text))?.[1];
}

/** Transformă rezultatul analizei (link sau foto) în datele calculatorului. */
export function mapAnalysisToInput(a: ListingAnalysisLike): Partial<Pick<UnifiedInput, "type" | "zone" | "surface" | "finish">> {
  const out: Partial<Pick<UnifiedInput, "type" | "zone" | "surface" | "finish">> = {};
  const rooms = Number(a.camere);
  const propertyType = (a.tip_proprietate ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const exactType = PROPERTY_TYPES.find((candidate) => candidate.value === propertyType);
  if (exactType) out.type = exactType.value;
  else if (/hotel|motel/.test(propertyType)) out.type = "hotel-motel";
  else if (/pensiun|boutique|guest\s*house|bed\s*(?:&|and)\s*breakfast/.test(propertyType)) out.type = "pensiune-boutique";
  else if (/(?:vila|villa).*vacan|vacation.*(?:villa|home)|holiday.*(?:villa|home)/.test(propertyType)) out.type = "vila-vacanta";
  else if (/casa|vila|villa|house/.test(propertyType)) out.type = "casa-vila";
  else if (/penthouse/.test(propertyType)) out.type = "penthouse";
  else if (/studio|garsonier/.test(propertyType) || rooms === 1) out.type = "garsoniera";
  else if (rooms === 2) out.type = "2-camere";
  else if (rooms >= 3) out.type = "3-camere";
  const s = Number(a.suprafata);
  if (Number.isFinite(s) && s >= MIN_PROPERTY_SURFACE && s <= MAX_PROPERTY_SURFACE) out.surface = Math.round(s);
  const analysisZone = a.zona;
  if (analysisZone) out.zone = matchUnifiedZone(analysisZone) ?? "alta-zona";
  const score = Number(a.scor);
  const max = Number(a.max_scor) || 100;
  if (Number.isFinite(score) && score > 0) out.finish = score / max >= 0.8 ? "premium" : "standard";
  return out;
}

/** Scenariu ajustat de vizitator: tarif pe noapte și ocupare (limitată la grila 65–75%). */
export const NIGHTLY_SLIDER_MIN_FACTOR = 0.6;
export const NIGHTLY_SLIDER_MAX_FACTOR = 1.5;

export function clampOccupancy(o: number): number {
  if (!Number.isFinite(o)) return MANAGEMENT_POLICY.occupancyDefault;
  return Math.min(MANAGEMENT_POLICY.occupancyMax, Math.max(MANAGEMENT_POLICY.occupancyMin, o));
}

export interface ScenarioBreakdown {
  nightlyRate: number;
  occupancy: number;
  gross: number;
  channelFees: number;
  utilities: number;
  commissionBase: number;
  feeMin: number;
  feeMax: number;
  netMin: number;
  netMax: number;
  netMid: number;
  classicRent: number;
  monthlyDelta: number;
}

/** Recalculează venitul pentru tariful/ocuparea aleasă, pornind de la brutul estimat al rezultatului de bază. */
export function applyScenario(base: UnifiedResult, scenario?: { nightlyRate?: number; occupancy?: number }): ScenarioBreakdown {
  const nightlyRate = Math.round(Math.max(1, scenario?.nightlyRate ?? base.nightlyRate));
  const occupancy = clampOccupancy(scenario?.occupancy ?? base.occupancy);
  const factor = base.nightlyRate > 0 && base.occupancy > 0 ? (nightlyRate * occupancy) / (base.nightlyRate * base.occupancy) : 1;
  const gross = base.grossHotel * factor;
  const hi = calculateManagedIncome({ gross, channelFees: gross * CHANNEL_FEE_RATE, utilities: UTILITIES, commissionRate: MANAGEMENT_POLICY.commissionMax });
  const lo = calculateManagedIncome({ gross, channelFees: gross * CHANNEL_FEE_RATE, utilities: UTILITIES, commissionRate: MANAGEMENT_POLICY.commissionMin });
  // Fără ajustare păstrăm exact cifrele estimării de bază (evită diferențe de rotunjire).
  const unchanged = nightlyRate === base.nightlyRate && occupancy === base.occupancy;
  const netMin = unchanged ? base.netMin : Math.round(hi.ownerIncome);
  const netMax = unchanged ? base.netMax : Math.round(lo.ownerIncome);
  const netMid = unchanged ? base.netMid : Math.round((netMin + netMax) / 2);
  return {
    nightlyRate, occupancy,
    gross: Math.round(gross),
    channelFees: Math.round(hi.channelFees),
    utilities: Math.round(hi.utilities),
    commissionBase: Math.round(hi.commissionBase),
    feeMin: Math.round(lo.managementFee),
    feeMax: Math.round(hi.managementFee),
    netMin, netMax, netMid,
    classicRent: base.classicRent,
    monthlyDelta: netMid - base.classicRent,
  };
}

/** Profil sezonier ilustrativ Timișoara (aceeași formă ca graficul din pagina proprietarilor); media = 1. */
const SEASON_PATTERN = [700, 790, 950, 1080, 1260, 1250, 1100, 1130, 1380, 1270, 960, 1050];
const SEASON_MEAN = SEASON_PATTERN.reduce((a, b) => a + b, 0) / SEASON_PATTERN.length;
export const SEASONALITY = SEASON_PATTERN.map((v) => v / SEASON_MEAN);
export const MONTH_LABELS = { ro: ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };

/** Venit lunar pe 12 luni; totalul anual rămâne egal cu 12 × media. */
export function monthlyProjection(s: ScenarioBreakdown) {
  return SEASONALITY.map((f, i) => ({ month: i, hotel: Math.round(s.netMid * f), classic: s.classicRent }));
}
