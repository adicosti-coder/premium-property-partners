import { describe, expect, it } from "vitest";
import { consentDate, consentPhone, consentPhoneVariants, listingSource, matchesConsentSearch, originalListingUrl } from "./autoConsentedListingUtils";

describe("tabelul acordurilor WhatsApp", () => {
  it("normalizează toate formatele românești", () => {
    for (const value of ["0733783540", "+40733783540", "40733783540", "0040733783540", "733783540"]) {
      expect(consentPhone(value)).toBe("+40733783540");
    }
    expect(consentPhoneVariants("0733783540")).toContain("+40733783540");
  });
  it("afișează data completă în ora României", () => {
    expect(consentDate("2026-10-09T05:41:00Z")).toBe("09.10.2026 08:41");
    expect(consentDate(null)).toBe("—");
  });
  it("acceptă doar linkuri web și identifică portalul", () => {
    expect(originalListingUrl("javascript:alert(1)", "https://olx.ro/d/oferta/test.html")).toBe("https://olx.ro/d/oferta/test.html");
    expect(listingSource(null, "https://www.storia.ro/ro/oferta/test")).toBe("Storia");
    expect(listingSource("publi24", null)).toBe("Publi24");
  });
  it("caută nume, telefon și cartier indiferent de diacritice sau format", () => {
    const row = { ownerName: "Andrei Cristian Popescu", phone_normalized: "+40733783540", details: "2 camere · Dumbrăvița" };
    for (const query of ["popescu", "dumbravita", "0733 783 540", "+40733783540", ""]) expect(matchesConsentSearch(row, query)).toBe(true);
    expect(matchesConsentSearch(row, "Iosefin")).toBe(false);
  });
});