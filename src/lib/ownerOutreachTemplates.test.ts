import { describe, expect, it } from "vitest";
import { defaultFirstTemplateKey, detectListingTransaction, getTemplate, saleMessageViolations, SALE_PUBLISH_TEXT } from "./ownerOutreachTemplates";

describe("outreach template by listing type", () => {
  it(" predefined sale text offers free publishing and asks DA or NU", () => {
    expect(SALE_PUBLISH_TEXT).toContain("publicarea gratuită");
    expect(SALE_PUBLISH_TEXT).toContain("DA sau NU");
    expect(saleMessageViolations(SALE_PUBLISH_TEXT)).toEqual([]);
  });
  it("maps sale and rent listings", () => {
    const sale = detectListingTransaction({ source_url: "https://www.olx.ro/d/oferta/apartament-2-camere-vanzare-IDx.html" });
    const rent = detectListingTransaction({ title: "Apartament de închiriat, chirie 450 €", source_url: "https://www.storia.ro/ro/oferta/inchiriere-ap" });
    expect(defaultFirstTemplateKey(sale)).toBe("first_sale");
    expect(defaultFirstTemplateKey(rent)).toBe("first_management");
    expect(defaultFirstTemplateKey("necunoscut")).toBe("first_management");
  });
  it("sale message never proposes rent or 12-month management", () => {
    const msg = getTemplate("first_sale").build({ zone: "Iosefin", rooms: 2, durationMonths: 12 });
    expect(saleMessageViolations(msg)).toEqual([]);
    expect(saleMessageViolations(getTemplate("first_management").build({}))).not.toEqual([]);
  });
  it("keeps sale reminders free of rental offers", () => {
    for (const key of ["reminder_sale_24h", "reminder_sale_72h"]) {
      expect(saleMessageViolations(getTemplate(key).build({ zone: "Iosefin", offerPrice: 550, durationMonths: 12 }))).toEqual([]);
    }
  });
  it("recognizes rental titles and negated rental intent", () => {
    expect(detectListingTransaction({ title: "Apartament de închiriat" })).toBe("inchiriere");
    expect(detectListingTransaction({ title: "Vând apartament, nu închiriez" })).toBe("vanzare");
    expect(detectListingTransaction({ title: "Se închiriază apartament" })).toBe("inchiriere");
  });
  it("uses current listing category before old URL wording", () => {
    expect(detectListingTransaction({ category: "Vânzare", source_url: "https://example.com/inchiriere-apartament" })).toBe("vanzare");
  });
  it("uses only the approved management commission", () => {
    const message = getTemplate("first_management").build({});
    expect(message).toContain("15% și 20%");
    expect(message).not.toContain("25%");
  });
});
