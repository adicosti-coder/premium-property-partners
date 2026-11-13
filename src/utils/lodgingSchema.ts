import { brandAggregateRating } from "@/lib/reviewStructuredData";

/**
 * Enriches ApArt Hotel by its stable identity, never by schema array position.
 * The rating is the brand score visible on the homepage (1–10 scale), never an
 * average of a review sample.
 */
export function enrichLodgingBusinessSchema(
  schemas: Record<string, unknown>[],
  sameAs: readonly string[],
) {
  const lodging = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#lodgingbusiness");
  if (!lodging) return;

  lodging.aggregateRating = brandAggregateRating();
  lodging.sameAs = [...sameAs];
  lodging.openingHours = "Mo-Su 00:00-24:00";
  lodging.currenciesAccepted = "EUR";
  lodging.priceRange = "€€";
}
