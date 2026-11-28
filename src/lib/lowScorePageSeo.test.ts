import { describe, it, expect } from "vitest";
import { LOW_SCORE_PAGE_SEO } from "./lowScorePageSeo";
import { PUBLIC_ROUTE_SEO } from "./publicRouteSeo";

const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

describe("ghiduri pentru paginile cu scor SEO mic", () => {
  for (const [path, guide] of Object.entries(LOW_SCORE_PAGE_SEO)) {
    describe(path, () => {
      const meta = PUBLIC_ROUTE_SEO[path];
      it("are metadate aprobate cu lungimi calibrate", () => {
        expect(meta).toBeDefined();
        expect(meta.ro.title.length).toBeGreaterThanOrEqual(40);
        expect(meta.ro.title.length).toBeLessThanOrEqual(60);
        expect(meta.ro.description.length).toBeGreaterThanOrEqual(130);
        expect(meta.ro.description.length).toBeLessThanOrEqual(160);
      });
      it("are peste 1.500 de cuvinte, minim 5 H2 și niciun H1 suplimentar", () => {
        expect(words(guide.body)).toBeGreaterThan(1500);
        expect((guide.body.match(/<h2>/g) || []).length).toBeGreaterThanOrEqual(5);
        expect(guide.body).not.toMatch(/<h1/i);
      });
      it("conține semnale locale și de proximitate devreme în text", () => {
        const head = guide.body.replace(/<[^>]+>/g, " ").slice(0, 8000);
        for (const term of ["UVT", "UPT", "Iulius Town", "Aeroport", "la 5 minute pe jos", "în apropiere de"]) expect(head).toContain(term);
      });
      it("nu folosește denumiri interzise", () => {
        expect(guide.body).not.toMatch(/ISHO|\(ROI\)|întâlnire la birou|peste 9%/i);
      });
    });
  }
});
