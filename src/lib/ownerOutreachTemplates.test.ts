import { describe, expect, it } from "vitest";
import { defaultFirstTemplateKey, detectListingTransaction, getTemplate, saleMessageViolations } from "./ownerOutreachTemplates";

describe("outreach template by listing type", () => {
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
});
