export type HomepageRating = { ratingValue: string; reviewCount: string };

/** Enriches ApArt Hotel by its stable identity, never by schema array position. */
export function enrichLodgingBusinessSchema(
  schemas: Record<string, unknown>[],
  rating: HomepageRating | null | undefined,
  sameAs: readonly string[],
) {
  const lodging = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#lodgingbusiness");
  if (!lodging) return;

  if (rating) {
    lodging.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.ratingValue,
      reviewCount: rating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }
  lodging.sameAs = [...sameAs];
  lodging.openingHours = "Mo-Su 00:00-24:00";
  lodging.currenciesAccepted = "EUR";
  lodging.priceRange = "€€";
}
