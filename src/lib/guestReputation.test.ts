import { describe, expect, it } from "vitest";
import { GUEST_REPUTATION, guestRatingLabel, guestReviewCountLabel } from "./businessFacts";
import { GUEST_REPUTATION as EDGE_GUEST_REPUTATION, guestReputationSentenceRo } from "../../supabase/functions/_shared/guestReputation";

describe("guest reputation single source", () => {
  it("is 9.7 out of 10 from 500 reviews", () => {
    expect(GUEST_REPUTATION).toEqual({ ratingValue: 9.7, bestRating: 10, reviewCount: 500 });
  });

  it("edge-function mirror stays identical to the site value", () => {
    expect(EDGE_GUEST_REPUTATION).toEqual(GUEST_REPUTATION);
  });

  it("formats the score per language and the count as shown on the site", () => {
    expect(guestRatingLabel("ro")).toBe("9,7");
    expect(guestRatingLabel("en")).toBe("9.7");
    expect(guestReviewCountLabel()).toBe("500+");
    expect(guestReputationSentenceRo()).toBe("9,7/10 pe Booking.com din peste 500 de recenzii verificate");
  });
});

describe("no hardcoded guest score in page copy", () => {
  // Other metrics that happen to be 9.7 (cleanliness sub-score, owner-portal demo,
  // admin checklist) are not the brand score and stay literal.
  const ALLOWED = [
    "/src/lib/businessFacts.ts",
    "/src/utils/schemaGenerators.ts",
    "/src/components/hub/GuestsTeaser.tsx",
    "/src/components/owners/OwnerDashboardDemo.tsx",
    "/src/components/admin/",
  ];
  const files = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

  it("writes 9,7/10 only through GUEST_SCORE_RO / GUEST_SCORE_EN", () => {
    const offenders = Object.entries(files)
      .filter(([path]) => !path.includes(".test.") && !ALLOWED.some((a) => path.startsWith(a)))
      .filter(([, text]) => /(?<![0-9.,])9[.,]7 ?\/ ?10/.test(text) || /\b(527|180)\+ (recenzii|reviews)/.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
