import { describe, expect, it } from "vitest";
import { normalizeAdUrl } from "./OwnerListingSearch";
import {
  hasAgencyEvidence,
  isActiveOwnerListing,
  isIndividualOwnerListing,
  isResidentialRealEstate,
  ownerVerification,
} from "@/lib/ownerListingRules";

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

describe("regulile anunțurilor de proprietari", () => {
  it("acceptă un anunț OLX individual și respinge pagina de căutare", () => {
    expect(isIndividualOwnerListing({ url: "https://www.olx.ro/d/oferta/apartament-3-camere-IDabc12.html" })).toBe(true);
    expect(isIndividualOwnerListing({ url: "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/q-proprietar/" })).toBe(false);
  });

  it("nu prezintă agenția ca proprietar", () => {
    const listing = { title: "Apartament 3 camere", description: "Agenție imobiliară, comision cumpărător" };
    expect(hasAgencyEvidence(listing)).toBe(true);
    expect(ownerVerification(listing)).toBe("agency");
  });

  it("separă proprietarul confirmat de rezultatul neverificat", () => {
    expect(ownerVerification({ title: "Direct proprietar, apartament decomandat" })).toBe("confirmed");
    expect(ownerVerification({ title: "Apartament 3 camere decomandat" })).toBe("review");
  });

  it("respinge anunțurile expirate și conținutul neimobiliar", () => {
    expect(isActiveOwnerListing({ is_active: false, lifecycle_status: "to_review" })).toBe(false);
    expect(isActiveOwnerListing({ lifecycle_status: "expired" })).toBe(false);
    expect(isResidentialRealEstate({ title: "Licență taxi de vânzare" })).toBe(false);
    expect(isResidentialRealEstate({ title: "Apartament 3 camere, etaj 2" })).toBe(true);
  });
});
