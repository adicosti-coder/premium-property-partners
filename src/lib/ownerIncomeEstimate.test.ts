import { describe, expect, it } from "vitest";
import { estimateOwnerIncome, PROPERTY_TYPES } from "./ownerIncomeEstimate";

const base = { type: "2-camere", zone: "city-of-mara", surface: 55, parking: false, finish: "standard" } as const;

describe("estimateOwnerIncome", () => {
  it.each([
    ["casa-vila", 150, 1100, 150],
    ["vila-vacanta", 200, 1400, 180],
    ["pensiune-boutique", 500, 3000, 500],
    ["hotel-motel", 1500, 8000, 1400],
  ] as const)("uses a dedicated whole-property benchmark for %s", (type, surface, classicRent, adr) => {
    const config = PROPERTY_TYPES.find((candidate) => candidate.value === type);
    expect(config).toMatchObject({ refSqm: surface, classicRent, adr });
    const result = estimateOwnerIncome({ ...base, type, surface, zone: "ring-residence" });
    expect(result.classicRent).toBe(classicRent);
    expect(result.nightlyRate).toBe(adr);
    expect(result.occupancy).toBe(0.7);
  });
  it("aplică 20% după comisioanele de canal și utilități", () => {
    const r = estimateOwnerIncome({ ...base, channelFeeRate: .15, utilities: 120 });
    expect(r.occupancy).toBe(.70);
    expect(r.grossHotel).toBe(1475);
    expect(r.netRealTrust).toBe(907);
  });
  it("chirie clasică 2 camere City of Mara 55 mp standard = 598 € (mediană reală 600 €)", () => {
    expect(estimateOwnerIncome(base).classicRent).toBe(598);
  });
  it("locul de parcare adaugă 40 € la chiria clasică", () => {
    expect(estimateOwnerIncome({ ...base, parking: true }).classicRent).toBe(638);
  });
  it("finisajele premium cresc venitul net", () => {
    expect(estimateOwnerIncome({ ...base, finish: "premium" }).netRealTrust).toBeGreaterThan(
      estimateOwnerIncome(base).netRealTrust,
    );
  });
});
