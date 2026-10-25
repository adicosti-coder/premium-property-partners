import { describe, it, expect } from "vitest";
import { generatePropertySEO } from "../generatePropertySEO";

const base = { name: "Ap", slug: "ap", location: "Iosefin, Timișoara", bedrooms: 2, size: 55, capital_necesar: 89000 };

describe("generatePropertySEO", () => {
  it("title targets 'Imobiliare Timișoara' and stays ≤ 65 chars", () => {
    const r = generatePropertySEO({ ...base, listing_type: "vanzare" });
    expect(r.title).toContain("Imobiliare Timișoara");
    expect(r.title.length).toBeLessThanOrEqual(65);
  });
  it("description is at most 160 chars", () => {
    expect(generatePropertySEO({ ...base, listing_type: "vanzare" }).description.length).toBeLessThanOrEqual(160);
  });
  it("rentals say 'de închiriat' and price per month", () => {
    const r = generatePropertySEO({ ...base, listing_type: "inchiriere", capital_necesar: 450 });
    expect(r.title).toContain("de închiriat");
    expect(r.description).toContain("/lună");
    expect((r.jsonLd[0].offers as any).priceSpecification.unitCode).toBe("MON");
  });
});
