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
