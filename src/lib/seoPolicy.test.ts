import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ORGANIZATION_SCHEMA, REAL_ESTATE_AGENT_SCHEMA, LODGING_BUSINESS_SCHEMA } from "./orgIdentity";
describe("approved SEO policy", () => {
  it("uses confirmed legal identity for the agency and separate lodging entity", () => {
    expect(REAL_ESTATE_AGENT_SCHEMA.name).toBe("RealTrust");
    expect(ORGANIZATION_SCHEMA.legalName).toBe("SC Imo Business Centrum SRL");
    expect(ORGANIZATION_SCHEMA.taxID).toBe("RO14380627");
    expect(LODGING_BUSINESS_SCHEMA["@type"]).toBe("LodgingBusiness");
  });
  for (const filename of ["sitemap-static.xml", "sitemap-dynamic.xml"]) {
    it(`${filename} excludes English alternates and language URLs`, () => {
      const xml = readFileSync(`public/${filename}`, "utf8");
      expect(xml).not.toMatch(/hreflang="en(?:-[^"]+)?"/);
      expect(xml).not.toContain("?lang=en");
      expect(xml).not.toContain("https://realtrust.ro/complex/");
    });
  }
});