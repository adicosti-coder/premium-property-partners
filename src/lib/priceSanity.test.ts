import { describe, it, expect } from "vitest";
import { isImplausiblePrice, priceCategoryOf } from "./priceSanity";

describe("priceCategoryOf", () => {
  it("detectează închiriere din titlu/categorie", () => {
    expect(priceCategoryOf({ title: "Închiriez apartament cu 2 camere", url: "https://imobiliare.ro/inchiriere-apartamente/x" })).toBe("inchiriere");
    expect(priceCategoryOf({ category: "inchiriere" })).toBe("inchiriere");
  });
  it("detectează vânzare", () => {
    expect(priceCategoryOf({ title: "Apartament de vanzare Direct de la proprietar" })).toBe("vanzare");
    expect(priceCategoryOf({ category: "vanzare" })).toBe("vanzare");
  });
  it("nu păcălește negațiile", () => {
    expect(priceCategoryOf({ title: "Nu se închiriază, se vinde apartamentul" })).toBe("vanzare");
  });
});

describe("isImplausiblePrice", () => {
  it("respinge chirii absurde (ex: preț de vânzare salvat ca lună)", () => {
    expect(isImplausiblePrice(2_024_600, "inchiriere")).toBe(true);
    expect(isImplausiblePrice(365_000, "inchiriere")).toBe(true);
    expect(isImplausiblePrice(150_000, "inchiriere")).toBe(true);
  });
  it("acceptă chirii reale", () => {
    expect(isImplausiblePrice(230, "inchiriere")).toBe(false);
    expect(isImplausiblePrice(450, "inchiriere")).toBe(false);
    expect(isImplausiblePrice(9_900, "inchiriere")).toBe(false);
  });
  it("respinge chirii sub 100 €", () => {
    expect(isImplausiblePrice(50, "inchiriere")).toBe(true);
  });
  it("acceptă prețuri de vânzare reale", () => {
    expect(isImplausiblePrice(49_500, "vanzare")).toBe(false);
    expect(isImplausiblePrice(204_900, "vanzare")).toBe(false);
    expect(isImplausiblePrice(2_000_000, "vanzare")).toBe(false);
  });
  it("respinge vânzări în afara intervalului", () => {
    expect(isImplausiblePrice(5_500, "vanzare")).toBe(true);
    expect(isImplausiblePrice(4_000_000, "vanzare")).toBe(true);
  });
  it("tranzacție necunoscută: doar extreme", () => {
    expect(isImplausiblePrice(204_900, "necunoscut")).toBe(false);
    expect(isImplausiblePrice(4_000_000, "necunoscut")).toBe(true);
  });
  it("fără preț nu e considerat implauzibil", () => {
    expect(isImplausiblePrice(null, "inchiriere")).toBe(false);
  });
});
