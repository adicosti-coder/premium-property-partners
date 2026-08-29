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
  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    addressLocality: "Timișoara",
    addressRegion: "Timiș",
    addressCountry: "RO",
  };
  // Rich Results rejects empty/null property values — only emit real data.
  if (poi.address && poi.address.trim().length > 0) address.streetAddress = poi.address.trim();

  const node: Record<string, unknown> = {
    "@type": schemaType(poi.category),
    "@id": poi.url,
    name: poi.name,
    url: poi.url,
    address,
  };

  if (Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)) {
    node.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
    };
  }

  if (poi.description) node.description = poi.description;
  if (poi.phone) node.telephone = poi.phone;
  if (poi.imageUrl) node.image = poi.imageUrl;
  if (poi.website) node.sameAs = poi.website;

  const rating = Number(poi.ratingValue ?? 0);
  const count = Number(poi.ratingCount ?? 0);
  if (rating >= 1 && rating <= 5 && count > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(rating * 10) / 10,
      reviewCount: Math.round(count),
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
