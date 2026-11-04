/**
 * Estimare venit proprietari Timișoara: chirie clasică vs. regim hotelier RealTrust.
 * Coeficienți pe tip, zonă/complex, suprafață, parcare și finisaje.
 * Administrare din net după canale/utilități; ocupare conservatoare 70%.
 */
import { calculateManagedIncome, MANAGEMENT_POLICY } from "./managementPolicy";
export const PROPERTY_TYPES = [
  { value: "garsoniera", label: "Garsonieră", refSqm: 32, classicRent: 340, adr: 52 },
  { value: "2-camere", label: "2 camere", refSqm: 55, classicRent: 460, adr: 66 },
  { value: "3-camere", label: "3 camere", refSqm: 75, classicRent: 600, adr: 85 },
  { value: "penthouse", label: "Penthouse", refSqm: 110, classicRent: 1000, adr: 130 },
  // Orientative whole-property benchmarks, not verified local market medians.
  { value: "casa-vila", label: "Casă / Vilă", refSqm: 150, classicRent: 1100, adr: 150 },
  { value: "vila-vacanta", label: "Vilă de vacanță", refSqm: 200, classicRent: 1400, adr: 180 },
  { value: "pensiune-boutique", label: "Pensiune / Boutique", refSqm: 500, classicRent: 3000, adr: 500 },
  { value: "hotel-motel", label: "Hotel / Motel", refSqm: 1500, classicRent: 8000, adr: 1400 },
] as const;

// rent = chiria mediană reală pe zonă / mediana Timișoara (~460 €, 2 camere),
// din anunțurile de închiriere colectate de RealTrust în ultimele 12 luni (oct. 2026).
// adr/occupancy = cererea pe termen scurt (centrul și ISHO atrag cei mai mulți turiști).
export const ZONES = [
  { value: "isho", label: "ISHO", rent: 1.43, adr: 1.2, occupancy: 0.78 },
  { value: "city-of-mara", label: "City of Mara", rent: 1.3, adr: 1.05, occupancy: 0.72 },
  { value: "nordone", label: "NordOne", rent: 1.41, adr: 1.1, occupancy: 0.74 },
  { value: "ring-residence", label: "Ring Residence", rent: 1.0, adr: 1.0, occupancy: 0.73 },
  { value: "fructus", label: "Fructus Plaza", rent: 1.04, adr: 1.05, occupancy: 0.75 },
  { value: "torontalului", label: "Calea Torontalului", rent: 1.09, adr: 0.95, occupancy: 0.7 },
  { value: "complex-studentesc", label: "Complex Studențesc", rent: 0.76, adr: 0.9, occupancy: 0.74 },
  { value: "central", label: "Central / Iosefin / Elisabetin", rent: 0.93, adr: 1.2, occupancy: 0.8 },
  { value: "alta-zona", label: "Altă zonă", rent: 0.98, adr: 0.95, occupancy: 0.7 },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];
export type ZoneValue = (typeof ZONES)[number]["value"];
export type Finish = "standard" | "premium";

const DAYS_PER_MONTH = 30.4;

export interface EstimateInput {
  type: PropertyTypeValue;
  zone: ZoneValue;
  surface: number;
  parking: boolean;
  finish: Finish;
  channelFeeRate?: number;
  utilities?: number;
  commissionRate?: number;
  /** Explicit neutral regional or approved local profile; existing callers keep their zone. */
  zoneProfile?: { rent: number; adr: number };
}

export interface EstimateResult {
  classicRent: number;
  nightlyRate: number;
  occupancy: number;
  grossHotel: number;
  netRealTrust: number;
  netMin: number;
  netMax: number;
  monthlyDelta: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function estimateOwnerIncome(i: EstimateInput): EstimateResult {
  const t = PROPERTY_TYPES.find((x) => x.value === i.type) ?? PROPERTY_TYPES[1];
  const z = i.zoneProfile ?? ZONES.find((x) => x.value === i.zone) ?? ZONES[ZONES.length - 1];
  const size = clamp((i.surface || t.refSqm) / t.refSqm, 0.8, 1.4);
  const premium = i.finish === "premium";

  const classic = t.classicRent * z.rent * size * (premium ? 1.15 : 1) + (i.parking ? 40 : 0);
  const nightly = t.adr * z.adr * Math.sqrt(size) * (premium ? 1.2 : 1) * (i.parking ? 1.05 : 1);
  const gross = nightly * DAYS_PER_MONTH * MANAGEMENT_POLICY.occupancyDefault;
  // Existing operating assumptions are exposed to the visitor; not commercial prices.
  const net = calculateManagedIncome({ gross, channelFees: gross * (i.channelFeeRate ?? .15), utilities: i.utilities ?? 120, commissionRate: i.commissionRate }).ownerIncome;

  return {
    classicRent: Math.round(classic),
    nightlyRate: Math.round(nightly),
    occupancy: MANAGEMENT_POLICY.occupancyDefault,
    grossHotel: Math.round(gross),
    netRealTrust: Math.round(net),
    netMin: Math.round(net * 0.9),
    netMax: Math.round(net * 1.1),
    monthlyDelta: Math.round(net - classic),
  };
}
