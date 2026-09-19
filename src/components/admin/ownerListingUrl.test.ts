import { describe, expect, it } from "vitest";
import { normalizeAdUrl } from "./OwnerListingSearch";

describe("normalizeAdUrl", () => {
  it("elimină parametrii de urmărire", () => {
    expect(normalizeAdUrl("https://www.olx.ro/d/oferta/apartament-IDabc12.html?reason=extended_search&utm_source=x"))
      .toBe("https://olx.ro/d/oferta/apartament-IDabc12.html");
  });

  it("tratează același anunț cu și fără slash final ca fiind unul singur", () => {
    expect(normalizeAdUrl("https://storia.ro/ro/oferta/test-123456/"))
      .toBe(normalizeAdUrl("https://www.storia.ro/ro/oferta/test-123456"));
  });

  it("păstrează filtrele reale din link", () => {
    expect(normalizeAdUrl("https://imobiliare.ro/anunt/x-987654?pagina=2")).toContain("pagina=2");
  });

  it("întoarce text gol pentru linkuri lipsă", () => {
    expect(normalizeAdUrl(null)).toBe("");
  });
});
