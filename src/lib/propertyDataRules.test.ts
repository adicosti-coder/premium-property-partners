import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_PER_NIGHT_EUR,
  MIN_SALE_CAPITAL_EUR,
  cleanPropertyName,
  safeHiddenNightlyPrice,
  validatePropertyPrices,
} from "./propertyDataRules";

describe("cleanPropertyName", () => {
  it("elimină spațiul de la începutul numelui „AP 3 CAM Decomandat…”", () => {
    expect(cleanPropertyName(" AP 3 CAM Decomandat 2 bai")).toBe("AP 3 CAM Decomandat 2 bai");
  });
  it("elimină spațiile invizibile de la capete, dar le păstrează pe cele din interior", () => {
    expect(cleanPropertyName("\u00a0\u200b Apartament  Iosefin \t\n")).toBe("Apartament  Iosefin");
  });
});

describe("plafon preț pe noapte", () => {
  it("plafonul este 1.000 €/noapte", () => {
    expect(MAX_PRICE_PER_NIGHT_EUR).toBe(1000);
  });
  it("blochează 89.900 € introdus ca preț pe noapte la cazare", () => {
    const issues = validatePropertyPrices({ listingType: "cazare", basePricePerNight: 89900 });
    expect(issues.map((i) => i.field)).toEqual(["base_price_per_night"]);
  });
  it("blochează 129.900 € la weekend pe o investiție", () => {
    const issues = validatePropertyPrices({ listingType: "investitie", weekendPricePerNight: 129900, capital: 129900 });
    expect(issues.map((i) => i.field)).toEqual(["weekend_price_per_night"]);
  });
  it("acceptă exact 1.000 €/noapte", () => {
    expect(validatePropertyPrices({ listingType: "cazare", basePricePerNight: 1000 })).toEqual([]);
  });
  it("prețul ascuns de la vânzare peste plafon nu se mai trimite", () => {
    expect(safeHiddenNightlyPrice(129900)).toBeNull();
    expect(safeHiddenNightlyPrice(550)).toBe(550);
  });
});

describe("capital minim la vânzare", () => {
  it("pragul minim este 5.000 €", () => {
    expect(MIN_SALE_CAPITAL_EUR).toBe(5000);
  });
  it("respinge 11 € ca preț de vânzare", () => {
    expect(validatePropertyPrices({ listingType: "vanzare", capital: 11 }).map((i) => i.field)).toEqual(["capital_necesar"]);
  });
  it("acceptă 500 € ca chirie lunară la închiriere", () => {
    expect(validatePropertyPrices({ listingType: "inchiriere", capital: 500 })).toEqual([]);
  });
});
