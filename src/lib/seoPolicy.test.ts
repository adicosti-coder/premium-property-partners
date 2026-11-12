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
  it("sitemap-static.xml lists no English URLs or alternates", () => {
    expect(staticSitemap).not.toMatch(/hreflang="en(?:-[^"]+)?"/);
    expect(staticSitemap).not.toContain("?lang=en");
  });
  for (const [filename, xml] of [["sitemap-static.xml", staticSitemap], ["sitemap-dynamic.xml", dynamicSitemap]]) {
    it(`${filename} uses plural complex addresses and plain ro hreflang`, () => {
      expect(xml).not.toContain("https://realtrust.ro/complex/");
      expect(xml).not.toContain('hreflang="ro-RO"');
    });
  }
  it("sitemap-dynamic.xml lists ?lang=en only for translated articles, in reciprocal pairs", () => {
    const blocks = dynamicSitemap.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    const locs = new Set(blocks.map((b) => b.match(/<loc>([^<]+)<\/loc>/)?.[1]));
    for (const block of blocks) {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
      const en = block.match(/hreflang="en" href="([^"]+)"/)?.[1];
      if (loc.endsWith("?lang=en")) {
        expect(loc).toMatch(/^https:\/\/realtrust\.ro\/blog\/[^/?]+\?lang=en$/);
        expect(en).toBe(loc);
        expect(locs.has(loc.replace("?lang=en", ""))).toBe(true);
      } else {
        expect(loc).not.toContain("?");
        if (en) {
          expect(en).toBe(`${loc}?lang=en`);
          expect(locs.has(en)).toBe(true);
        }
      }
    }
  });
});
  }
});