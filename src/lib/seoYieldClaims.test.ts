import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { getComplexLandingSeo, readComplexLandingNames } from "./complexLandingSeo";
import { PUBLIC_ROUTE_SEO } from "./publicRouteSeo";

/**
 * Texts that Google and AI assistants read first (prerendered pages, search
 * metadata, llms.txt). Approved grid: estimated 6,5–9,4% net per year — never
 * "peste 9%", "9%+", yields above 9,5%, or guaranteed/verified/proven returns.
 */
const SEO_SOURCES = [
  "plugins/vite-prerender-seo.ts",
  "plugins/prerender-extra-routes.ts",
  "src/lib/publicRouteSeo.ts",
  "src/lib/blogCategories.ts",
  "src/data/neighborhoods.ts",
  "src/components/SEOFooterText.tsx",
  "src/pages/CatalogInvestitii.tsx",
  "src/pages/ProcesulNostru.tsx",
  "src/pages/ComplexLanding.tsx",
  "src/pages/Complexe.tsx",
  "src/components/SEOLocalEntitiesBlock.tsx",
  "public/llms.txt",
];

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf-8");

describe("yield claims on search-facing pages", () => {
  it.each(SEO_SOURCES)("%s never promises more than 9%%", (file) => {
    const text = read(file);
    expect(text).not.toMatch(/peste 9\s?%|over 9\s?%|\b9\s?%\+/i);
  });

  it.each(SEO_SOURCES)("%s never states yields of 10–11%%", (file) => {
    expect(read(file)).not.toMatch(/\b[5-9]\s?[-–]\s?1[01]\s?%/);
  });

  it.each(SEO_SOURCES)("%s never calls a yield guaranteed, verified or proven", (file) => {
    const text = read(file);
    expect(text).not.toMatch(/(?<!fără |nu |nu un |nu ofertă de )randament(e|ul)?\s+(net\s+)?(verificat|garantat|dovedit)/i);
    expect(text).not.toMatch(/(?<!not a |no |not )(guaranteed|verified|proven)\s+(\d+[-–]?\d*%\s+)?(returns?|yields?|roi)/i);
  });
});

describe("residential complex search metadata", () => {
  const names = readComplexLandingNames(read("src/pages/ComplexLanding.tsx"));

  it("finds every hand-written complex page", () => {
    expect(names.get("xcity-towers")).toBe("XCity Towers");
    expect(names.get("vivalia")).toBe("Vivalia");
    expect(names.size).toBeGreaterThanOrEqual(11);
  });

  it("keeps every complex title within 60 characters in both languages", () => {
    for (const name of names.values()) {
      expect(getComplexLandingSeo(name, "ro").title.length).toBeLessThanOrEqual(60);
      expect(getComplexLandingSeo(name, "en").title.length).toBeLessThanOrEqual(60);
    }
  });

  it("states only the approved 6,5–9,4% estimated range", () => {
    expect(getComplexLandingSeo("XCity Towers", "ro").description).toContain("randament net estimat 6,5–9,4%");
    expect(getComplexLandingSeo("XCity Towers", "en").description).toContain("estimated net yield 6.5–9.4%");
  });

  it("puts the complex name first so name searches match", () => {
    expect(getComplexLandingSeo("XCity Towers", "ro").title.startsWith("XCity Towers Timișoara")).toBe(true);
  });
});

describe("audited page titles", () => {
  it("targets 'regim hotelier Timișoara' on the accommodation page", () => {
    expect(PUBLIC_ROUTE_SEO["/cazare"].ro.title).toBe("Cazare regim hotelier Timișoara | ApArt Hotel");
  });

  it("keeps every audited title within 60 characters", () => {
    for (const langs of Object.values(PUBLIC_ROUTE_SEO)) {
      expect(langs.ro.title.length).toBeLessThanOrEqual(60);
      expect(langs.en.title.length).toBeLessThanOrEqual(60);
    }
  });
});
