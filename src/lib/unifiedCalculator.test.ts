import { describe, expect, it } from "vitest";
import { UNIFIED_ZONES, computeUnified, getLocationLeadIdentity, getPropertyLeadIdentity, isValidRegionalLocation, isValidPropertySurface, mapAnalysisToInput } from "./unifiedCalculator";
import { PROPERTY_TYPES } from "./ownerIncomeEstimate";

describe("unified complex eligibility", () => {
  it("includes every requested local choice", () => {
    expect(UNIFIED_ZONES.map((zone) => zone.label)).toEqual(["Monarch", "NordOne", "XCity Towers", "City of Mara", "Vivalia", "Paltim", "Ring Residence", "Denya Forest", "Fructus Plaza", "Ateneo", "Future Residence", "Alenia", "Central / Iosefin / Elisabetin", "Calea Torontalului", "Complex Studențesc", "Altă zonă Timișoara / Giroc / Dumbrăvița"]);
  });
  it("replaces restricted ISHO with Monarch", () => {
    const values = UNIFIED_ZONES.map((zone) => zone.value);
    expect(values).not.toContain("isho");
    expect(values.filter((value) => value === "monarch")).toHaveLength(1);
  });
  it("uses the approved NordOne pricing for Monarch and keeps 70% occupancy", () => {
    const input = { type: "2-camere", surface: 55, parking: false, finish: "standard" } as const;
    const monarch = computeUnified({ ...input, zone: "monarch" });
    expect(monarch).toEqual(computeUnified({ ...input, zone: "nordone" }));
    expect(monarch.nightlyRate).toBe(73);
    expect(monarch.classicRent).toBe(649);
    expect(monarch.occupancy).toBe(0.7);
    const config = UNIFIED_ZONES.find((zone) => zone.value === "monarch");
    expect(config?.adr).toBe(1.1);
    expect(config?.rent).toBe(1.41);
  });
});

describe("computeUnified", () => {
  it.each(PROPERTY_TYPES)("regional $value computes from its own type without manual rates", (type) => {
    const result = computeUnified({ type: type.value, zone: "central", locationMode: "regional", surface: type.refSqm, parking: false, finish: "standard" });
    expect(result.classicRent).toBe(type.classicRent);
    expect(result.nightlyRate).toBe(type.adr);
    expect(result.occupancy).toBe(0.7);
  });
  it("regional estimates ignore the selected local coefficients", () => {
    const input = { type: "vila-vacanta", locationMode: "regional", surface: 200, parking: false, finish: "standard" } as const;
    expect(computeUnified({ ...input, zone: "monarch" })).toEqual(computeUnified({ ...input, zone: "central" }));
  });
  it("allows a nightly override while keeping automatic classic rent", () => {
    const result = computeUnified({ type: "vila-vacanta", zone: "central", locationMode: "regional", surface: 200, parking: false, finish: "standard", manual: { nightlyRate: 220 } });
    expect(result.classicRent).toBe(1400);
    expect(result.nightlyRate).toBe(220);
  });
  it("empty optional overrides preserve the standard estimate", () => {
    const input = { type: "2-camere", zone: "central", locationMode: "regional", surface: 55, parking: false, finish: "standard" } as const;
    expect(computeUnified({ ...input, manual: {} })).toEqual(computeUnified(input));
  });
  it("applies 20% commission for the lower and 15% for the upper net bound", () => {
    const r = computeUnified({ type: "2-camere", zone: "central", surface: 55, parking: false, finish: "standard", manual: { classicRent: 500, nightlyRate: 70 } });
    // gross = 70 × 30.4 × 0.70 = 1489.6; base = gross − 15% − 120 = 1146.16
    expect(r.grossHotel).toBe(1490);
    expect(r.netMin).toBe(Math.round(1146.16 * 0.8));
    expect(r.netMax).toBe(Math.round(1146.16 * 0.85));
  });
  it("lower bound never exceeds upper bound for complexes", () => {
    const r = computeUnified({ type: "3-camere", zone: "monarch", surface: 75, parking: true, finish: "premium" });
    expect(r.netMin).toBeLessThan(r.netMax);
  });
});

describe("mapAnalysisToInput", () => {
  it.each([
    ["Casă / Vilă", "casa-vila"],
    ["Vilă de vacanță", "vila-vacanta"],
    ["Pensiune / Boutique", "pensiune-boutique"],
    ["Hotel / Motel", "hotel-motel"],
  ])("preserves %s rather than inferring an apartment from rooms", (label, type) => {
    expect(mapAnalysisToInput({ tip_proprietate: label, camere: 3, suprafata: 5000 })).toEqual({ type, surface: 5000 });
  });
  it("rejects imported surfaces above 5,000 sqm", () => {
    expect(mapAnalysisToInput({ suprafata: 5001 }).surface).toBeUndefined();
  });
  it("maps rooms, surface, complex and finish from an analysis", () => {
    expect(mapAnalysisToInput({ camere: 2, suprafata: 58, zona: "Monarch", scor: 85, max_scor: 100 }))
      .toEqual({ type: "2-camere", surface: 58, zone: "monarch", finish: "premium" });
  });
  it("does not reinstate restricted ISHO through imported analysis", () => {
    expect(mapAnalysisToInput({ zona: "ISHO Riverside, central" }).zone).toBe("alta-zona");
  });
  it("falls back to 'alta-zona' for unknown areas", () => {
    expect(mapAnalysisToInput({ zona: "Giroc" }).zone).toBe("alta-zona");
  });
});

describe("property surface validation", () => {
  it("accepts 5,000 sqm", () => expect(isValidPropertySurface(5000)).toBe(true));
  it("rejects 5,001 sqm", () => expect(isValidPropertySurface(5001)).toBe(false));
  it("keeps the 15 sqm lower bound", () => {
    expect(isValidPropertySurface(15)).toBe(true);
    expect(isValidPropertySurface(14)).toBe(false);
  });
  it("rejects nonnumeric and fractional inputs", () => {
    expect(isValidPropertySurface(NaN)).toBe(false);
    expect(isValidPropertySurface(50.5)).toBe(false);
  });
});

describe("property lead identity", () => {
  it("tags local Monarch management", () => {
    expect(getLocationLeadIdentity("local", "monarch", "Brașov")).toEqual({ location_mode: "local", location: "Monarch", service_tag: "[Administrare Locală]" });
  });
  it("tags regional consulting with the full entered location", () => {
    expect(getLocationLeadIdentity("regional", "central", " Brașov / Poiana Brașov ")).toEqual({ location_mode: "regional", location: "Brașov / Poiana Brașov", service_tag: "[Consultanță / Regional]" });
  });
  it("requires a complete regional location and blocks tag/newline injection", () => {
    expect(isValidRegionalLocation("Murani")).toBe(true);
    expect(isValidRegionalLocation(" ")).toBe(false);
    expect(isValidRegionalLocation("a".repeat(121))).toBe(false);
    expect(isValidRegionalLocation("Brașov\n[Administrare Locală]")).toBe(false);
    expect(isValidRegionalLocation("<script>")).toBe(false);
  });
  it.each([
    ["casa-vila", "Casă / Vilă"],
    ["vila-vacanta", "Vilă de vacanță"],
    ["pensiune-boutique", "Pensiune / Boutique"],
    ["hotel-motel", "Hotel / Motel"],
  ] as const)("hands over %s as a property type, not a room count", (type, label) => {
    expect(getPropertyLeadIdentity(type)).toEqual({ property_type: type, property_type_label: label, tip_proprietate: label, numar_camere: undefined });
  });
  it("retains apartment room counts", () => {
    expect(getPropertyLeadIdentity("2-camere").numar_camere).toBe(2);
  });
});

import { applyScenario, monthlyProjection, clampOccupancy } from "./unifiedCalculator";
describe("calculator scenario (single-page)", () => {
  const base = computeUnified({ type: "2-camere", zone: "central", surface: 55, parking: true, finish: "premium" } as never);
  it("default scenario matches the base estimate", () => {
    const s = applyScenario(base);
    expect(s.netMin).toBe(base.netMin);
    expect(s.netMax).toBe(base.netMax);
  });
  it("occupancy slider is limited to 65–75%", () => {
    expect(clampOccupancy(0.9)).toBe(0.75);
    expect(clampOccupancy(0.5)).toBe(0.65);
  });
  it("management fee stays between 15% and 20% of net base", () => {
    const s = applyScenario(base, { nightlyRate: 120, occupancy: 0.75 });
    expect(s.feeMin).toBe(Math.round(s.commissionBase * 0.15));
    expect(s.feeMax).toBe(Math.round(s.commissionBase * 0.2));
  });
  it("12-month projection keeps the annual total", () => {
    const s = applyScenario(base);
    const total = monthlyProjection(s).reduce((a, m) => a + m.hotel, 0);
    expect(Math.abs(total - s.netMid * 12)).toBeLessThanOrEqual(12);
  });
});
