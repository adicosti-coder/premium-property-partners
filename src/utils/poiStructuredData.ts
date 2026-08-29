/**
 * Schema.org structured data for the interactive restaurant guide.
 *
 * Emits an ItemList of Restaurant / CafeOrCoffeeShop (both LocalBusiness
 * subtypes) so Google can surface rich snippets with the guest rating,
 * address and GPS coordinates for each venue.
 */

export interface PoiStructuredInput {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  /** Aggregated guest rating (1-5) and number of approved reviews. */
  ratingValue?: number | null;
  ratingCount?: number;
  url: string;
}

const schemaType = (category: string) =>
  category === "cafe" ? "CafeOrCoffeeShop" : "Restaurant";

export function buildPoiSchema(poi: PoiStructuredInput): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": schemaType(poi.category),
    "@id": poi.url,
    name: poi.name,
    url: poi.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: poi.address ?? undefined,
      addressLocality: "Timișoara",
      addressRegion: "Timiș",
      addressCountry: "RO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: poi.latitude,
      longitude: poi.longitude,
    },
  };

  if (poi.description) node.description = poi.description;
  if (poi.phone) node.telephone = poi.phone;
  if (poi.imageUrl) node.image = poi.imageUrl;
  if (poi.website) node.sameAs = poi.website;
  if (poi.ratingValue && poi.ratingCount && poi.ratingCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: poi.ratingValue,
      reviewCount: poi.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return node;
}

export function buildPoiItemListSchema(
  pois: PoiStructuredInput[],
  listName = "Restaurante și cafenele recomandate în Timișoara",
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: pois.length,
    itemListElement: pois.map((poi, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: buildPoiSchema(poi),
    })),
  };
}
