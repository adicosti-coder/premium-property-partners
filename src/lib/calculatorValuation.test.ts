import { describe, expect, it } from "vitest";
import { REFINEMENTS, NO_REFINEMENTS, refinementFactors } from "./calculatorRefinements";
import { annualNetYieldPct, buildCalculatorWhatsappMessage, buildOptimizationTips, estimateSale, fiveYearProjection, gridSaleBenchmark, leadEventForIntent, parseCalculatorPrefill, resolveSaleBenchmark, yieldDisplay } from "./calculatorValuation";
import { computeUnified } from "./unifiedCalculator";
import { matchPortfolioProperties } from "./portfolioProof";
import { buildLeadCalculatorPayload } from "./calculatorAnalytics";

const ALL = { parking: true, newBuild: true, heatingAc: true, furnished: true };

describe("approved refinement percentages", () => {
  it("keeps the exact approved sale / nightly values", () => {
    const byKey = Object.fromEntries(REFINEMENTS.map((r) => [r.key, [r.sale, r.nightly, r.occupancy]]));
    expect(byKey).toEqual({ parking: [0.05, 0.03, 0], newBuild: [0.07, 0.05, 0], heatingAc: [0.02, 0.04, 0], furnished: [0.03, 0.08, 0.02] });
  });
  it("adds the percentages instead of compounding them", () => {
    expect(refinementFactors(ALL)).toEqual({ sale: 1.17, nightly: 1.2, occupancyBonus: 0.02 });
    expect(refinementFactors(NO_REFINEMENTS)).toEqual({ sale: 1, nightly: 1, occupancyBonus: 0 });
  });
  it("raises nightly rate and occupancy (max 75%) in the hotel estimate", () => {
    const input = { type: "2-camere", zone: "central", surface: 55, parking: false, finish: "standard" } as const;
    const base = computeUnified(input);
    const furnished = computeUnified({ ...input, refinements: { ...NO_REFINEMENTS, furnished: true } });
    expect(furnished.nightlyRate).toBe(Math.round(base.nightlyRate * 1.08));
    expect(furnished.occupancy).toBe(0.72);
    expect(furnished.occupancy).toBeLessThanOrEqual(0.75);
    expect(furnished.netMid).toBeGreaterThan(base.netMid);
  });
  it("uses the approved +3% for parking instead of the old 5%", () => {
    const input = { type: "2-camere", zone: "central", surface: 55, parking: false, finish: "standard" } as const;
    const base = computeUnified(input);
    expect(computeUnified({ ...input, refinements: { ...NO_REFINEMENTS, parking: true } }).nightlyRate).toBe(Math.round(base.nightlyRate * 1.03));
  });
  it("without ticks returns exactly the previous estimate", () => {
    const input = { type: "3-camere", zone: "nordone", surface: 75, parking: false, finish: "premium" } as const;
    expect(computeUnified({ ...input, refinements: NO_REFINEMENTS })).toEqual(computeUnified(input));
  });
});

describe("sale estimate", () => {
  it("multiplies €/mp by surface with a ±8% range rounded to 500 €", () => {
    expect(estimateSale({ eurSqm: 2000, tier: "listings" }, 55, "2-camere")).toEqual({ eurSqm: 2000, mid: 110000, min: 101000, max: 119000, tier: "listings" });
  });
  it("applies all ticks to the sale price (+17%)", () => {
    expect(estimateSale({ eurSqm: 2000, tier: "index" }, 55, "2-camere", ALL)).toMatchObject({ eurSqm: 2340, mid: 128500 });
  });
  it("needs an individual valuation for guesthouses and hotels", () => {
    expect(estimateSale({ eurSqm: 2000, tier: "grid" }, 500, "pensiune-boutique")).toBeNull();
    expect(estimateSale({ eurSqm: 2000, tier: "grid" }, 1500, "hotel-motel")).toBeNull();
  });
  it("falls back from listings to the reference index to the free-valuation grid", () => {
    expect(resolveSaleBenchmark({ eur_sqm: 1969, tier: "listings", sample: 11 }, "central")).toEqual({ eurSqm: 1969, tier: "listings", sample: 11 });
    expect(resolveSaleBenchmark({ eur_sqm: 2100, tier: "index", source: "Imobiliare.ro" }, "fructus")).toEqual({ eurSqm: 2100, tier: "index", source: "Imobiliare.ro" });
    expect(resolveSaleBenchmark(null, "central")).toEqual(gridSaleBenchmark("central"));
    expect(resolveSaleBenchmark({ eur_sqm: 12, tier: "listings" }, "central").tier).toBe("grid");
  });
  it("grid for Central averages Iosefin and Elisabetin", () => {
    expect(gridSaleBenchmark("central")).toEqual({ eurSqm: Math.round((1850 + 1820) / 2), tier: "grid" });
  });
});

describe("yield and 5-year projection", () => {
  it("computes the annual net yield from the sale value", () => {
    expect(annualNetYieldPct(700, 110000)).toBe(7.6);
    expect(annualNetYieldPct(700, 0)).toBeNull();
  });
  it("never displays a yield above 9.4%", () => {
    expect(yieldDisplay(7.6)).toEqual({ kind: "exact", value: 7.6 });
    expect(yieldDisplay(11.8)).toEqual({ kind: "range" });
  });
  it("compares sale today with 5 years of hotel and classic rent income, without growth", () => {
    expect(fiveYearProjection({ saleValue: 110000, hotelNetMonthly: 1000, classicRentMonthly: 450 })).toEqual({ years: 5, saleToday: 110000, hotelTotal: 60000, classicTotal: 27000 });
  });
});

describe("URL prefill", () => {
  it("reads zona, camere, mp, nume and intentie", () => {
    expect(parseCalculatorPrefill("?zona=city-of-mara&camere=2&mp=58&nume=Ion%20Popescu&intentie=vanzare")).toEqual({ zone: "city-of-mara", type: "2-camere", surface: 58, name: "Ion Popescu", intent: "vanzare" });
  });
  it("accepts labels and aliases", () => {
    expect(parseCalculatorPrefill("?zona=Fructus%20Plaza&camere=garsoniera&intentie=administrare")).toEqual({ zone: "fructus", type: "garsoniera", intent: "hotelier" });
  });
  it("ignores invalid or unsafe values", () => {
    expect(parseCalculatorPrefill("?zona=isho&camere=x&mp=9999&nume=<script>&intentie=altceva")).toEqual({ zone: "alta-zona" });
  });
});

describe("lead events", () => {
  it("sends a distinct event per intent with the estimated value", () => {
    const v = { saleValue: 110000, hotelNetMonthly: 1000, classicRentMonthly: 450 };
    expect(leadEventForIntent("vanzare", v)).toEqual({ event: "lead_calculator_vanzare", value: 110000 });
    expect(leadEventForIntent("hotelier", v)).toEqual({ event: "lead_calculator_hotelier", value: 12000 });
    expect(leadEventForIntent("chirie", v)).toEqual({ event: "lead_calculator_chirie", value: 5400 });
    expect(leadEventForIntent("toate", v).event).toBe("lead_calculator_hotelier");
  });
  it("carries no personal data", () => {
    const payload = buildLeadCalculatorPayload({ location_mode: "local", property_type: "2-camere", location_name: "Ion 0722123456", surface_sqm: 55, intent: "vanzare", value: 110000 });
    expect(payload).toEqual({ location_mode: "local", property_type: "2-camere", surface_sqm: 55, location_name: "other", currency: "EUR", value: 110000, intent: "vanzare" });
  });
});

describe("tips, social proof and WhatsApp message", () => {
  it("shows AI recommendations first and at most 3 tips", () => {
    const tips = buildOptimizationTips(NO_REFINEMENTS, ["Adaugă perdele blackout în dormitor", "Fotografii profesionale la lumină naturală", "x"]);
    expect(tips).toHaveLength(3);
    expect(tips.slice(0, 2)).toEqual(["Adaugă perdele blackout în dormitor", "Fotografii profesionale la lumină naturală"]);
    expect(tips[2]).toContain("+8%");
  });
  it("matches only real, well-rated managed properties in the zone", () => {
    const list = [
      { name: "AVENUE of MARA ApArt Hotel", slug: "a", location: "Calea Circumvalațiunii 1, Timișoara", booking_rating: 9.4, booking_review_count: 129 },
      { name: "Sunset Da-Ra", slug: "b", location: "Calea Circumvalațiunii 1, Timișoara", booking_rating: 9.7, booking_review_count: 57 },
      { name: "RING Family Residence", slug: "c", location: "Strada Vasile Loichiță 1-3", booking_rating: 2.9, booking_review_count: 5 },
      { name: "Fructus Plaza ULTRACENTRAL", slug: "d", location: "Str. Gheorghe Lazăr 24", booking_rating: 9.7, booking_review_count: 77 },
    ];
    expect(matchPortfolioProperties("city-of-mara", list).map((p) => p.slug)).toEqual(["a", "b"]);
    expect(matchPortfolioProperties("ring-residence", list)).toEqual([]);
    expect(matchPortfolioProperties("alta-zona", list)).toEqual([]);
  });
  it("pre-fills WhatsApp with zone, area, intent, sale and hotel net figures", () => {
    const msg = buildCalculatorWhatsappMessage({ locationSummary: "[Administrare Locală] Locație: City of Mara | Tip: 2 camere", surface: 55, intentLabel: "Vreau să vând", sale: { eurSqm: 2000, mid: 110000, min: 101000, max: 119000, tier: "listings" }, classicRent: 560, netMin: 1000, netMax: 1070, nightlyRate: 72, occupancy: 0.7, refinements: [] });
    for (const part of ["City of Mara", "2 camere", "55 mp", "Vreau să vând", "101.000 € – 119.000 €", "1.000 € – 1.070 €"]) expect(msg).toContain(part);
  });
});
