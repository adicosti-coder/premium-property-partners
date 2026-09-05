/**
 * Generates dynamic SEO metadata for individual property listings.
 * Used both by the React app (SEOHead) and the prerender plugin.
 */

const BASE_URL = "https://realtrust.ro";

export interface PropertySEOInput {
  name: string;
  slug: string;
  location: string;
  bedrooms?: number | null;
  size?: number | null;
  floor?: string | null;
  roi_percentage?: string | null;
  capital_necesar?: number | null;
  listing_type?: string | null;
  year_built?: number | null;
  orientation?: string | null;
  base_price_per_night?: number | null;
  capacity?: number | null;
  image_path?: string | null;
  images?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  booking_rating?: number | null;
  booking_review_count?: number | null;
  /** URL-ul motorului real de rezervări (Pynbooking) pentru această unitate. */
  booking_url?: string | null;
}

export interface PropertySEOOutput {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  jsonLd: Record<string, unknown>[];
  imageAlt: string;
}

/**
 * Extracts a clean zone name from a location string.
 */
function extractZone(location: string): string {
  if (!location) return "Timișoara";
  // Remove URLs
  if (location.startsWith("http")) return "Timișoara";
  // Extract the meaningful part
  const cleaned = location
    .replace(/,?\s*(Timișoara|Timisoara|Timiș|Timis)\s*/gi, "")
    .replace(/^Strada\s+/i, "Str. ")
    .trim();
  return cleaned || "Timișoara";
}

/**
 * Determines property type label from listing_type.
 */
function getPropertyType(listingType?: string | null, bedrooms?: number | null): string {
  if (bedrooms === 1) return "Garsonieră";
  if (bedrooms && bedrooms >= 2) return `Apartament ${bedrooms} camere`;
  return "Apartament";
}

/**
 * Generates SEO metadata for a property listing.
 */
export function generatePropertySEO(property: PropertySEOInput): PropertySEOOutput {
  const zone = extractZone(property.location);
  const type = getPropertyType(property.listing_type, property.bedrooms);
  const rooms = property.bedrooms || 1;
  const slug = property.slug || property.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Title: "Apartament [Rooms] camere în [Zone], Timișoara | [Price]€"
  const pricePart = property.capital_necesar
    ? `${property.capital_necesar.toLocaleString("ro-RO")}€`
    : property.base_price_per_night
    ? `${property.base_price_per_night}€/noapte`
    : "";

  const title = pricePart
    ? `${type} în ${zone}, Timișoara | ${pricePart} | RealTrust`
    : `${type} în ${zone}, Timișoara | RealTrust`;

  // Description template
  const descParts: string[] = [];
  descParts.push(`Descoperă acest ${type.toLowerCase()} situat în ${zone}`);
  if (property.floor) descParts[0] += `, etaj ${property.floor}`;
  descParts[0] += ".";
  if (property.roi_percentage) {
    descParts.push(`Ideal pentru investiție cu un randament estimat de ${property.roi_percentage}.`);
  }
  descParts.push("Administrare prin RealTrust inclusă.");
  const description = descParts.join(" ").slice(0, 160);

  // H1
  const h1 = `${type} de vânzare în ${zone}, Timișoara`;

  // Canonical
  const canonical = `${BASE_URL}/proprietate/${slug}`;

  // Image alt
  const imageAlt = `${type} - Apartament de vânzare în zona ${zone}, Timișoara`;

  // Motorul real de rezervări (Pynbooking) — legat în datele structurate.
  // Doar URL-uri http(s) reale; valorile placeholder ("-", "#") sunt ignorate.
  const rawBookingUrl = property.booking_url?.trim() || "";
  const bookingUrl = /^https?:\/\/\S+$/i.test(rawBookingUrl) ? rawBookingUrl : "";
  const reserveAction = bookingUrl

    ? {
        "@type": "ReserveAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": bookingUrl,
          "inLanguage": "ro-RO",
          "actionPlatform": [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
        "result": { "@type": "LodgingReservation", "name": property.name },
      }
    : null;

  // JSON-LD: a single RealEstateListing node (no Product — this is a real
  // estate offer, not a retail product).
  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `${canonical}#listing`,
      "name": property.name,
      "url": canonical,
      "description": description,
      ...(property.capital_necesar && {
        "offers": {
          "@type": "Offer",
          "price": property.capital_necesar,
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "url": canonical,
        },
      }),
      "numberOfRooms": rooms,
      ...(property.size && { "floorSize": { "@type": "QuantitativeValue", "value": property.size, "unitCode": "MTK" } }),
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "addressCountry": "RO",
        ...(zone !== "Timișoara" && { "streetAddress": zone }),
      },
      ...(property.latitude && property.longitude && {
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": property.latitude,
          "longitude": property.longitude,
        },
      }),
      ...(property.year_built && { "yearBuilt": property.year_built }),
      ...(bookingUrl && { "sameAs": bookingUrl }),
      ...(reserveAction && { "potentialAction": reserveAction }),
    },
  ];


  return { title, description, canonical, h1, jsonLd, imageAlt };
}

/**
 * Generates contextual image alt text for a property image.
 */
export function generatePropertyImageAlt(
  propertyName: string,
  zone: string,
  imageIndex: number,
  totalImages: number,
  bedrooms?: number | null
): string {
  const type = getPropertyType(null, bedrooms);
  const cleanZone = extractZone(zone);
  
  if (imageIndex === 0) {
    return `${type} - Apartament de vânzare în zona ${cleanZone}, Timișoara`;
  }
  
  const roomLabels = ["living", "dormitor", "bucătărie", "baie", "balcon", "vedere exterioară"];
  const label = roomLabels[Math.min(imageIndex - 1, roomLabels.length - 1)];
  
  return `${label.charAt(0).toUpperCase() + label.slice(1)} - ${type} în ${cleanZone}, Timișoara (${imageIndex + 1}/${totalImages})`;
}
