import { describe, expect, it } from "vitest";
import { generateLocalBusinessSchema } from "../utils/schemaGenerators";
import staticSitemap from "../../public/sitemap-static.xml?raw";
import dynamicSitemap from "../../public/sitemap-dynamic.xml?raw";
import { ORGANIZATION_SCHEMA, REAL_ESTATE_AGENT_SCHEMA } from "./orgIdentity";
describe("approved SEO policy", () => {
  it("uses confirmed legal identity for the agency and separate lodging entity", () => {
    expect(REAL_ESTATE_AGENT_SCHEMA.name).toBe("RealTrust");
    expect(ORGANIZATION_SCHEMA.legalName).toBe("SC Imo Business Centrum SRL");
    expect(ORGANIZATION_SCHEMA.taxID).toBe("RO14380627");
    expect(generateLocalBusinessSchema()["@type"]).toBe("LodgingBusiness");
  });
  for (const [filename, xml] of [["sitemap-static.xml", staticSitemap], ["sitemap-dynamic.xml", dynamicSitemap]]) {
    it(`${filename} excludes English alternates and language URLs`, () => {
      expect(xml).not.toMatch(/hreflang="en(?:-[^"]+)?"/);
      expect(xml).not.toContain("?lang=en");
      expect(xml).not.toContain("https://realtrust.ro/complex/");
    });
  }
});