/**
 * Logica comună a calculatorului unificat: toate căile de intrare (manual/ansamblu,
 * link, foto) produc aceleași date, iar rezultatul aplică grila oficială 15–20%.
 */
import { calculateManagedIncome, MANAGEMENT_POLICY } from "./managementPolicy";
import { estimateOwnerIncome, PROPERTY_TYPES, ZONES, type Finish, type PropertyTypeValue, type ZoneValue } from "./ownerIncomeEstimate";

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

export type UnifiedZoneValue = Exclude<ZoneValue, "isho"> | "monarch" | "paltim" | "denya-forest" | "ateneo" | "future-residence" | "alenia";
export type LocationMode = "local" | "regional";

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
  ["city-of-mara", "City of Mara", "city-of-mara"],
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
  return { ...reference, value: value as UnifiedZoneValue, label, profile: reference.value, indicative: profile === "alta-zona" };
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
  const profile = UNIFIED_ZONES.find((candidate) => candidate.value === i.zone)?.profile ?? "alta-zona";
  const base = { type: i.type, zone: profile, surface: i.surface, parking: i.parking, finish: i.finish, ...(i.locationMode === "regional" ? { zoneProfile: { rent: 1, adr: 1 } } : {}) };
  const hi = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMax });
  const lo = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMin });
  if (i.manual) {
    const classicRent = i.manual.classicRent ?? hi.classicRent;
    const nightlyRate = i.manual.nightlyRate ?? hi.nightlyRate;
    const gross = Math.max(0, nightlyRate) * DAYS_PER_MONTH * MANAGEMENT_POLICY.occupancyDefault;
    const at = (rate: number) =>
      calculateManagedIncome({ gross, channelFees: gross * CHANNEL_FEE_RATE, utilities: UTILITIES, commissionRate: rate }).ownerIncome;
    const netMin = Math.round(at(MANAGEMENT_POLICY.commissionMax));
    const netMax = Math.round(at(MANAGEMENT_POLICY.commissionMin));
    const netMid = Math.round((netMin + netMax) / 2);
    return {
      classicRent: Math.round(Math.max(0, classicRent)),
      nightlyRate: Math.round(nightlyRate),
      occupancy: MANAGEMENT_POLICY.occupancyDefault,
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
}

const ZONE_PATTERNS: Array<[RegExp, UnifiedZoneValue]> = [
  [/isho/i, "alta-zona"],
  [/monarch/i, "monarch"],
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
  if (analysisZone) out.zone = ZONE_PATTERNS.find(([re]) => re.test(analysisZone))?.[1] ?? "alta-zona";
  const score = Number(a.scor);
  const max = Number(a.max_scor) || 100;
  if (Number.isFinite(score) && score > 0) out.finish = score / max >= 0.8 ? "premium" : "standard";
  return out;
}
