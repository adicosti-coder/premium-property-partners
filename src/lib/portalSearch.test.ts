import { describe, it, expect } from "vitest";
import {
  EMPTY_PORTAL_FILTERS,
  activeFilterCount,
  distanceKm,
  filtersToParams,
  floorInfo,
  matchesPortalFilters,
  paramsToFilters,
  roomsFromText,
  sortPortalListings,
  surfaceFromText,
  type PortalFilters,
  type PortalListing,
} from "./portalSearch";

const l = (over: Partial<PortalListing> = {}): PortalListing => ({
  title: "Apartament 3 camere decomandat Dumbrăvița",
  text: "60 mp, etaj 2/4, balcon, parcare, bloc nou 2021",
  transaction: "vanzare",
  price: 95000,
  surface: 60,
  rooms: 3,
  ...over,
});

const f = (over: Partial<PortalFilters> = {}): PortalFilters => ({ ...EMPTY_PORTAL_FILTERS, ...over });

describe("parsers", () => {
  it("citește etajul din 2/4 și parter", () => {
    expect(floorInfo("etaj 2/4").value).toBe(2);
    expect(floorInfo("parter").isGround).toBe(true);
    expect(floorInfo("etaj 4/4").isLast).toBe(true);
  });
  it("citește suprafața și camerele", () => {
    expect(surfaceFromText("are 72 mp utili")).toBe(72);
    expect(roomsFromText("3 camere decomandat")).toBe(3);
  });
});

describe("matchesPortalFilters", () => {
  it("acceptă potrivirea completă", () => {
    expect(matchesPortalFilters(l(), f({ q: "decomandat", rooms: ["3"], types: ["apartament"] }))).toBe(true);
  });
  it("decomandat nu este acceptat de semidecomandat", () => {
    expect(
      matchesPortalFilters(l({ title: "Apartament semidecomandat", text: "" }), f({ partitions: ["decomandat"] })),
    ).toBe(false);
  });
  it("respectă intervalul de preț și suprafață", () => {
    expect(matchesPortalFilters(l(), f({ maxPrice: "80000" }))).toBe(false);
    expect(matchesPortalFilters(l(), f({ minSurface: "80" }))).toBe(false);
  });
  it("respectă etajul și dotările", () => {
    expect(matchesPortalFilters(l(), f({ floor: "parter" }))).toBe(false);
    expect(matchesPortalFilters(l(), f({ amenities: ["lift"] }))).toBe(false);
    expect(matchesPortalFilters(l(), f({ amenities: ["balcon", "parcare"] }))).toBe(true);
  });
  it("filtrează tranzacția și zona", () => {
    expect(matchesPortalFilters(l(), f({ transaction: "inchiriere" }))).toBe(false);
    expect(matchesPortalFilters(l({ zone: "Dumbrăvița" }), f({ zone: "dumbravita" }))).toBe(true);
  });
  it("păstrează anunțul când datele lipsesc", () => {
    expect(matchesPortalFilters(l({ price: null, surface: null, rooms: null, text: "" }), f({ maxPrice: "1000", rooms: ["2"] }))).toBe(true);
  });
});

describe("sortare și utilitare", () => {
  it("sortează după preț și €/mp", () => {
    const a = l({ price: 50000, surface: 50 });
    const b = l({ price: 90000, surface: 60 });
    expect(sortPortalListings([b, a], "price-asc")[0]).toBe(a);
    expect(sortPortalListings([a, b], "price-desc")[0]).toBe(b);
    expect(sortPortalListings([b, a], "eur-mp-asc")[0]).toBe(a);
  });
  it("numără filtrele active", () => {
    expect(activeFilterCount(f())).toBe(0);
    expect(activeFilterCount(f({ q: "x", rooms: ["2", "3"] }))).toBe(3);
  });
  it("păstrează filtrele în adresa paginii", () => {
    const src = f({ q: "decomandat", rooms: ["3"], transaction: "vanzare", sort: "price-asc" });
    expect(paramsToFilters(filtersToParams(src))).toEqual(src);
  });
  it("calculează distanța în km", () => {
    const d = distanceKm({ lat: 45.754, lng: 21.227 }, { lat: 45.764, lng: 21.227 });
    expect(Math.round(d)).toBe(1);
  });
});
