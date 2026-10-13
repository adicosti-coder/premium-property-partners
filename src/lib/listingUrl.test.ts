import { describe, it, expect } from "vitest";
import { isSearchPageUrl, isRoMobile } from "./listingUrl";
describe("isSearchPageUrl", () => {
  it("flags search pages", () => {
    expect(isSearchPageUrl("https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/timisoara/q-maria/")).toBe(true);
    expect(isSearchPageUrl("https://www.storia.ro/ro/rezultate/inchiriere/apartament/timis/timisoara/fabric")).toBe(true);
    expect(isSearchPageUrl("https://www.imobiliare.ro/vanzare-apartamente/judetul-timis/timisoara/braytim")).toBe(true);
  });
  it("keeps real listings", () => {
    expect(isSearchPageUrl("https://www.olx.ro/d/oferta/apartament-2-camere-IDabc.html")).toBe(false);
    expect(isSearchPageUrl("https://www.storia.ro/ro/oferta/apartament-3-camere-IDx")).toBe(false);
    expect(isSearchPageUrl("https://homezz.ro/apartament-cu-3-camere-giroc-4077154.html")).toBe(false);
  });
  it("mobile phones", () => {
    expect(isRoMobile("+40726596964")).toBe(true);
    expect(isRoMobile("+40202609200")).toBe(false);
  });
});
