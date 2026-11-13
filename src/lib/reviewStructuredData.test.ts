import { describe, expect, it } from "vitest";
import { buildAggregateRating, buildGuestReviews, lodgingReviewFields, toSchemaDate } from "./reviewStructuredData";

const item = { id: "https://realtrust.ro/proprietate/avenue-of-mara-apart-hotel#lodgingbusiness", name: "AVENUE of MARA ApArt Hotel" };
const now = new Date("2026-11-13T00:00:00Z");

describe("review structured data", () => {
  it("keeps the on-page 1–10 scale for the aggregate rating", () => {
    expect(buildAggregateRating(9.4, 102)).toEqual({
      "@type": "AggregateRating", ratingValue: 9.4, reviewCount: 102, bestRating: 10, worstRating: 1,
    });
  });

  it("omits the aggregate rating when value or count is missing or out of range", () => {
    expect(buildAggregateRating(null, 102)).toBeNull();
    expect(buildAggregateRating(9.4, 0)).toBeNull();
    expect(buildAggregateRating(11, 5)).toBeNull();
  });

  it("emits complete reviews tied to the LodgingBusiness", () => {
    const [review] = buildGuestReviews([{ guest_name: "Ana", rating: 9, content: "Curat", review_date: "2023-09-03" }], item, 5, now);
    expect(review).toEqual({
      "@type": "Review",
      itemReviewed: { "@type": "LodgingBusiness", "@id": item.id, name: item.name },
      author: { "@type": "Person", name: "Ana" },
      datePublished: "2023-09-03",
      reviewBody: "Curat",
      reviewRating: { "@type": "Rating", ratingValue: 9, bestRating: 10, worstRating: 1 },
    });
  });

  it("drops reviews without author, valid rating or valid date", () => {
    const reviews = buildGuestReviews([
      { guest_name: " ", rating: 9, review_date: "2023-09-03" },
      { guest_name: "Ion", rating: 0, review_date: "2023-09-03" },
      { guest_name: "Ion", rating: 8, review_date: "2023-02-30" },
      { guest_name: "Ion", rating: 8, review_date: "2027-01-01" },
    ], item, 5, now);
    expect(reviews).toEqual([]);
  });

  it("never declares fewer reviews in the aggregate than are marked up", () => {
    const fields = lodgingReviewFields({
      item, ratingValue: 9, reviewCount: 1, now,
      reviews: [
        { guest_name: "A", rating: 9, created_at: "2024-01-01T10:00:00Z" },
        { guest_name: "B", rating: 10, created_at: "2024-01-02T10:00:00Z" },
      ],
    });
    expect((fields.aggregateRating as { reviewCount: number }).reviewCount).toBe(2);
    expect(toSchemaDate("2024-01-02T10:00:00Z", now)).toBe("2024-01-02");
  });
});
