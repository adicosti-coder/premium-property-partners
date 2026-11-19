import { describe, expect, it } from "vitest";
import {
  classifyInspection,
  realIndexingIssues,
} from "../../supabase/functions/_shared/gscIndexingClassification";

describe("GSC indexing alert classification", () => {
  it("ignores 'Alternate page with proper canonical tag' on filter URLs like /anunturi?tranzactie=vanzare", () => {
    expect(
      classifyInspection({
        url: "https://realtrust.ro/anunturi?tranzactie=vanzare",
        verdict: "NEUTRAL",
        coverageState: "Alternate page with proper canonical tag",
      }),
    ).toBe("expected_canonical");
  });

  it("ignores NEUTRAL when the declared canonical points elsewhere and Google accepted it", () => {
    expect(
      classifyInspection({
        url: "https://realtrust.ro/anunturi?tranzactie=inchiriere",
        verdict: "NEUTRAL",
        coverageState: "Excluded",
        userCanonical: "https://realtrust.ro/anunturi",
        googleCanonical: "https://realtrust.ro/anunturi/",
      }),
    ).toBe("expected_canonical");
  });

  it("still alerts when Google picked a different canonical than the declared one", () => {
    expect(
      classifyInspection({
        url: "https://realtrust.ro/anunturi?tranzactie=vanzare",
        verdict: "NEUTRAL",
        coverageState: "Duplicate, Google chose different canonical than user",
        userCanonical: "https://realtrust.ro/anunturi",
        googleCanonical: "https://realtrust.ro/anunturi?tranzactie=vanzare",
      }),
    ).toBe("issue");
  });

  it("still alerts on real problems: no canonical, not indexed, unknown to Google", () => {
    for (const coverageState of [
      "Duplicate without user-selected canonical",
      "Crawled - currently not indexed",
      "URL is unknown to Google",
    ]) {
      expect(classifyInspection({ url: "https://realtrust.ro/x", verdict: "NEUTRAL", coverageState })).toBe("issue");
    }
    expect(classifyInspection({ url: "https://realtrust.ro/x", verdict: "FAIL", coverageState: "Server error (5xx)" })).toBe("issue");
  });

  it("drops canonical alternates from an issue list, so the e-mail and panel count only real problems", () => {
    const items = [
      { url: "https://realtrust.ro/anunturi?tranzactie=vanzare", verdict: "NEUTRAL", coverageState: "Alternate page with proper canonical tag" },
      { url: "https://realtrust.ro/recomanda-proprietar", verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" },
    ];
    expect(realIndexingIssues(items).map((i) => i.url)).toEqual(["https://realtrust.ro/recomanda-proprietar"]);
  });
});
