import { describe, it, expect } from "vitest";
import { computeProspectGeoMatch, TIMISOARA_LOCAL_ENTITIES } from "@/lib/timisoaraGeo";

describe("computeProspectGeoMatch", () => {
  it("returns a zero score for empty input", () => {
    expect(computeProspectGeoMatch([null, undefined, ""])).toEqual({
      score: 0,
      found: [],
      primary: null,
    });
  });

  it("matches a core Timișoara neighborhood regardless of diacritics", () => {
    const withDiacritics = computeProspectGeoMatch(["Apartament în Dumbrăvița"]);
    const without = computeProspectGeoMatch(["apartament in dumbravita"]);
    expect(withDiacritics.primary).toBe("Dumbrăvița");
    expect(without.primary).toBe("Dumbrăvița");
    expect(withDiacritics.score).toBe(without.score);
  });

  it("gives a base score when only the city is mentioned", () => {
    expect(computeProspectGeoMatch(["Garsonieră Timișoara"]).score).toBe(35);
  });

  it("scores 0 for a listing outside our market", () => {
    expect(computeProspectGeoMatch(["Apartament Pipera, Bucuresti"])).toEqual({
      score: 0,
      found: [],
      primary: null,
    });
  });

  it("rewards multiple distinct local entities", () => {
    const single = computeProspectGeoMatch(["Iosefin"]);
    const multi = computeProspectGeoMatch(["Iosefin, lângă UVT"]);
    expect(multi.found.length).toBeGreaterThan(single.found.length);
    expect(multi.score).toBeGreaterThan(single.score);
  });

  it("caps the score at 100", () => {
    const res = computeProspectGeoMatch([
      "Cetate, Iosefin, Fabric, Dumbrăvița, Aradului, Iulius Town, UVT",
    ]);
    expect(res.score).toBe(100);
  });

  it("picks the highest-weight entity as primary", () => {
    const res = computeProspectGeoMatch(["Apartament în Plopi, aproape de Aeroport Timișoara"]);
    expect(res.primary).toBe("Aeroport");
  });

  it("recognizes known residential complexes", () => {
    expect(computeProspectGeoMatch(["Apartament ISHO"]).found).toContain("ISHO");
  });

  it("keeps the entity list free of Bucharest references", () => {
    const blob = JSON.stringify(TIMISOARA_LOCAL_ENTITIES).toLowerCase();
    for (const banned of ["bucuresti", "bucurești", "pipera", "sector"]) {
      expect(blob).not.toContain(banned);
    }
  });
});
