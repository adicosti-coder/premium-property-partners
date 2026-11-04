import { describe, expect, it } from "vitest";
import { UNIFIED_ZONES, computeUnified, getPropertyLeadIdentity, isValidPropertySurface, mapAnalysisToInput } from "./unifiedCalculator";

describe("unified complex eligibility", () => {
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
