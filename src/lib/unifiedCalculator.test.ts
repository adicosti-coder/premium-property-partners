import { describe, expect, it } from "vitest";
import { computeUnified, mapAnalysisToInput } from "./unifiedCalculator";

describe("computeUnified", () => {
  it("applies 20% commission for the lower and 15% for the upper net bound", () => {
    const r = computeUnified({ type: "2-camere", zone: "central", surface: 55, parking: false, finish: "standard", manual: { classicRent: 500, nightlyRate: 70 } });
    // gross = 70 × 30.4 × 0.70 = 1489.6; base = gross − 15% − 120 = 1146.16
    expect(r.grossHotel).toBe(1490);
    expect(r.netMin).toBe(Math.round(1146.16 * 0.8));
    expect(r.netMax).toBe(Math.round(1146.16 * 0.85));
  });
  it("lower bound never exceeds upper bound for complexes", () => {
    const r = computeUnified({ type: "3-camere", zone: "isho", surface: 75, parking: true, finish: "premium" });
    expect(r.netMin).toBeLessThan(r.netMax);
  });
});

describe("mapAnalysisToInput", () => {
  it("maps rooms, surface, complex and finish from an analysis", () => {
    expect(mapAnalysisToInput({ camere: 2, suprafata: 58, zona: "ISHO Riverside", scor: 85, max_scor: 100 }))
      .toEqual({ type: "2-camere", surface: 58, zone: "isho", finish: "premium" });
  });
  it("falls back to 'alta-zona' for unknown areas", () => {
    expect(mapAnalysisToInput({ zona: "Giroc" }).zone).toBe("alta-zona");
  });
});
