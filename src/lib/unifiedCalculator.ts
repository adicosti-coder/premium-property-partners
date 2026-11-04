/**
 * Logica comună a calculatorului unificat: toate căile de intrare (manual/ansamblu,
 * link, foto) produc aceleași date, iar rezultatul aplică grila oficială 15–20%.
 */
import { calculateManagedIncome, MANAGEMENT_POLICY } from "./managementPolicy";
import { estimateOwnerIncome, ZONES, type Finish, type PropertyTypeValue, type ZoneValue } from "./ownerIncomeEstimate";

export type UnifiedZoneValue = Exclude<ZoneValue, "isho"> | "monarch";

/** Scoped eligibility list; Monarch uses the explicitly approved NordOne estimates. */
export const UNIFIED_ZONES = ZONES.flatMap<{
  value: UnifiedZoneValue;
  label: string;
  rent: number;
  adr: number;
  occupancy: number;
}>((zone) => {
  if (zone.value === "isho") {
    const nordone = ZONES.find((candidate) => candidate.value === "nordone");
    return nordone ? [{ ...nordone, value: "monarch" as const, label: "Monarch" }] : [];
  }
  return [zone];
});

const DAYS_PER_MONTH = 30.4;
const CHANNEL_FEE_RATE = 0.15;
const UTILITIES = 120;

export interface UnifiedInput {
  type: PropertyTypeValue;
  zone: UnifiedZoneValue;
  surface: number;
  parking: boolean;
  finish: Finish;
  /** Mod național/manual: valorile introduse de proprietar înlocuiesc coeficienții de zonă. */
  manual?: { classicRent: number; nightlyRate: number } | null;
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
  if (i.manual) {
    const gross = Math.max(0, i.manual.nightlyRate) * DAYS_PER_MONTH * MANAGEMENT_POLICY.occupancyDefault;
    const at = (rate: number) =>
      calculateManagedIncome({ gross, channelFees: gross * CHANNEL_FEE_RATE, utilities: UTILITIES, commissionRate: rate }).ownerIncome;
    const netMin = Math.round(at(MANAGEMENT_POLICY.commissionMax));
    const netMax = Math.round(at(MANAGEMENT_POLICY.commissionMin));
    const netMid = Math.round((netMin + netMax) / 2);
    return {
      classicRent: Math.round(Math.max(0, i.manual.classicRent)),
      nightlyRate: Math.round(i.manual.nightlyRate),
      occupancy: MANAGEMENT_POLICY.occupancyDefault,
      grossHotel: Math.round(gross),
      netMin, netMax, netMid,
      monthlyDelta: Math.round(netMid - i.manual.classicRent),
    };
  }
  const zone: ZoneValue = i.zone === "monarch" ? "nordone" : i.zone;
  const base = { type: i.type, zone, surface: i.surface, parking: i.parking, finish: i.finish };
  const hi = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMax });
  const lo = estimateOwnerIncome({ ...base, commissionRate: MANAGEMENT_POLICY.commissionMin });
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
  [/torontal/i, "torontalului"],
  [/student/i, "complex-studentesc"],
  [/centr|cetate|iosefin|elisabetin|fabric/i, "central"],
];

/** Transformă rezultatul analizei (link sau foto) în datele calculatorului. */
export function mapAnalysisToInput(a: ListingAnalysisLike): Partial<Pick<UnifiedInput, "type" | "zone" | "surface" | "finish">> {
  const out: Partial<Pick<UnifiedInput, "type" | "zone" | "surface" | "finish">> = {};
  const rooms = Number(a.camere);
  if (/studio|garsonier/i.test(a.tip_proprietate ?? "") || rooms === 1) out.type = "garsoniera";
  else if (rooms === 2) out.type = "2-camere";
  else if (rooms >= 3) out.type = "3-camere";
  const s = Number(a.suprafata);
  if (Number.isFinite(s) && s >= 15 && s <= 400) out.surface = Math.round(s);
  const analysisZone = a.zona;
  if (analysisZone) out.zone = ZONE_PATTERNS.find(([re]) => re.test(analysisZone))?.[1] ?? "alta-zona";
  const score = Number(a.scor);
  const max = Number(a.max_scor) || 100;
  if (Number.isFinite(score) && score > 0) out.finish = score / max >= 0.8 ? "premium" : "standard";
  return out;
}
