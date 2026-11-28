import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPrompt } from "../../supabase/functions/rewrite-listing-description/prompt";

/**
 * Approved grid (Adrian, 22 nov 2026): guest score 9,7/10 on Booking.com,
 * annual occupancy 65–75% (70% in calculations), estimated net yield 6,5–9,4%/year.
 * Owner testimonials and the real Airbnb 4,9/5 score are deliberately not scanned.
 */
const SOURCES = [
  "src/pages/ZoneLanding.tsx",
  "src/components/PropertyFAQ.tsx",
  "src/pages/NeighborhoodCluster.tsx",
  "src/pages/CatalogInvestitii.tsx",
  "src/data/neighborhoods.ts",
  "src/components/LocalLandmarksStrip.tsx",
  "src/components/owners/OwnerGuideHub.tsx",
  "src/components/DeferredHomeSEO.tsx",
  "src/components/OwnerHowItWorks.tsx",
  "src/components/blog/ArticleFAQ.tsx",
  "src/components/SEOLocalEntitiesBlock.tsx",
  "src/components/admin/SeoGuideGenerator.tsx",
  "src/utils/exportInvestorGuidePdf.ts",
  "src/utils/pdf/sections/whyTimisoaraPage.ts",
  "src/pages/Investitii.tsx",
  "src/pages/CityOfMaraTimisoara.tsx",
  "src/pages/AnalizaROIApartament.tsx",
  "src/lib/prioritySeoContent.ts",
  "src/components/AnalysisZoneGuide.tsx",
  "src/components/DualServicePaths.tsx",
  "src/components/DIYvsProfessional.tsx",
  "src/components/LeadMagnetBanner.tsx",
  "src/pages/ComplexDetail.tsx",
  "src/components/owners/OwnerObjectionsFAQ.tsx",
  "src/pages/ScraperLeads.tsx",
  "src/components/admin/ProspectManager.tsx",
  "supabase/functions/ai-chatbot/prompts.ts",
  "supabase/functions/ai-chatbot-stream/index.ts",
  "supabase/functions/voice-agent-context/index.ts",
  "supabase/functions/rewrite-listing-description/prompt.ts",
];

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf-8");
const firstMatch = (text: string, re: RegExp) => text.match(re)?.[0] ?? null;

describe("approved performance figures across the site and Andrei", () => {
  it.each(SOURCES)("%s has no 4.9/5 rating", (file) => {
    expect(firstMatch(read(file), /4[.,]9\s*\/\s*5/)).toBeNull();
  });

  it.each(SOURCES)("%s states no occupancy above 75 percent", (file) => {
    const re = /(ocupare|occupancy)[^\n"`]{0,25}?\b(7[6-9]|8\d|9\d)\s?%|\b(7[6-9]|8\d|9\d)\s?%\+?\s(ocupare|occupancy)/i;
    expect(firstMatch(read(file), re)).toBeNull();
  });

  it.each(SOURCES)("%s states no net yield above 9,4 percent", (file) => {
    const re = /(randament|roi|yield)[^\n"`]{0,25}?(\b9[.,][5-9]|\b1[0-9]|\b[89]\s?[-–]\s?1[0-9])\s?%/i;
    expect(firstMatch(read(file), re)).toBeNull();
  });

  it.each(SOURCES)("%s makes no +40 or +70 percent income claim vs classic rent", (file) => {
    const re = /\+\s?[3-9]0\s?%\s(vs|față|venit|returns|revenue)|cu (~|aproximativ |circa )?[4-9]0\s?% mai m|[4-9]0(-60)?\s?% more (revenue|than)|up to 40% higher|până la 40% mai mari/i;
    expect(firstMatch(read(file), re)).toBeNull();
  });

  it("listing description generator uses 9,7/10, 65–75% occupancy and 6,5–9,4% yield", () => {
    const prompt = buildPrompt({ title: "Apartament 2 camere", location: "Timișoara" }, "cazare", "premium");
    expect(prompt).toContain("9,7/10 pe Booking.com");
    expect(prompt).toContain("ocupare anuală asumată 65–75% (calcul 70%)");
    expect(prompt).toContain("6,5–9,4% net estimat pe an");
    expect(prompt).not.toMatch(/4\.9\/5|98%|9%\+/);
  });

  it("Andrei's voice playbook uses the 6,5–9,4% net range and 65–75% occupancy", () => {
    const voice = read("supabase/functions/voice-agent-context/index.ts");
    expect(voice).toContain("randament NET estimat de 6,5–9,4% pe an");
    expect(voice).toContain("ocupare anuală 65–75% (calcul 70%)");
    expect(voice).not.toMatch(/70% mai mare|ROI NET de 9\.4%/);
  });

  it("first owner messages keep the approved 30–40% above classic rent", () => {
    expect(read("src/lib/ownerOutreachTemplates.ts")).toMatch(/30[–-]40%/);
  });
});
