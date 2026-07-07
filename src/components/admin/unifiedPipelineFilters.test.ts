import { describe, it, expect } from "vitest";
import {
  matchesUnifiedFilters,
  normalize,
  zoneCandidates,
  DEFAULT_FILTERS,
  type UnifiedFilters,
} from "./unifiedPipelineFilters";

const item = (over: Partial<Parameters<typeof matchesUnifiedFilters>[0]> = {}) => ({
  title: null,
  source_platform: null,
  zone: null,
  source_url: null,
  location: null,
  ...over,
});

const f = (over: Partial<UnifiedFilters> = {}): UnifiedFilters => ({
  ...DEFAULT_FILTERS,
  ...over,
});

describe("normalize", () => {
  it("elimină diacriticele românești", () => {
    expect(normalize("Șagului")).toBe("sagului");
    expect(normalize("Dumbrăvița")).toBe("dumbravita");
    expect(normalize("Circumvalațiunii")).toBe("circumvalatiunii");
  });
  it("normalizează case + spații", () => {
    expect(normalize("  CALEA  Aradului  ")).toBe("calea aradului");
  });
  it("acceptă null/undefined fără crash", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});

describe("zoneCandidates", () => {
  it("expandează Girocului → Calea Girocului", () => {
    const c = zoneCandidates("girocului");
    expect(c).toContain("calea girocului");
    expect(c).toContain("giroc");
  });
  it("expandează Aradului → Calea Aradului", () => {
    expect(zoneCandidates("aradului")).toContain("calea aradului");
  });
  it("Complex ↔ Complex Studențesc", () => {
    const c = zoneCandidates("complex studentesc");
    expect(c).toContain("complex studentesc");
    expect(c).toContain("complex");
  });
  it("Cetate ↔ Centru", () => {
    expect(zoneCandidates("cetate")).toContain("centru");
    expect(zoneCandidates("centru")).toContain("cetate");
  });
});

describe("matchesUnifiedFilters", () => {
  it("match indiferent de diacritice pe zone", () => {
    expect(
      matchesUnifiedFilters(item({ zone: "Șagului" }), f({ zone: "sagului" })),
    ).toBe(true);
    expect(
      matchesUnifiedFilters(item({ zone: "sagului" }), f({ zone: "Șagului" })),
    ).toBe(true);
  });
  it("match Cetate când user caută Centru", () => {
    expect(
      matchesUnifiedFilters(item({ zone: "Cetate" }), f({ zone: "centru" })),
    ).toBe(true);
  });
  it("match Calea Aradului când filtrul e Aradului", () => {
    expect(
      matchesUnifiedFilters(item({ location: "Calea Aradului nr. 12" }), f({ zone: "aradului" })),
    ).toBe(true);
  });
  it("respinge dacă zona nu match", () => {
    expect(
      matchesUnifiedFilters(item({ zone: "Fabric" }), f({ zone: "iosefin" })),
    ).toBe(false);
  });
  it("q e case+diacritic insensitive și tolerant la spații", () => {
    expect(
      matchesUnifiedFilters(item({ title: "Apartament în DUMBRĂVIȚA" }), f({ q: "  dumbravita " })),
    ).toBe(true);
  });
  it("portal substring, case insensitive", () => {
    expect(
      matchesUnifiedFilters(item({ source_platform: "OLX.ro" }), f({ portal: "olx" })),
    ).toBe(true);
    expect(
      matchesUnifiedFilters(item({ source_platform: "storia" }), f({ portal: "olx" })),
    ).toBe(false);
  });
  it("no filters => match anything", () => {
    expect(matchesUnifiedFilters(item({ title: "x" }), DEFAULT_FILTERS)).toBe(true);
  });
});
