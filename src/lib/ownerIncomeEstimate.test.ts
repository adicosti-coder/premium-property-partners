import { describe, expect, it } from "vitest";
import { estimateOwnerIncome } from "./ownerIncomeEstimate";

const base = { type: "2-camere", zone: "city-of-mara", surface: 55, parking: false, finish: "standard" } as const;

describe("estimateOwnerIncome", () => {
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
