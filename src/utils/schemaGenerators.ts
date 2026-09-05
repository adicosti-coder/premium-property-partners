/**
 * Schema.org JSON-LD Generators for SEO
 * Centralized utilities for generating structured data.
 *
 * Brand identity (name, phone, email, logo, address, sameAs) lives in
 * src/lib/orgIdentity.ts — the single source of truth that this module
 * (and every other JSON-LD emitter) imports. Do NOT inline organization
 * fields here; reference ORGANIZATION_REF / REAL_ESTATE_AGENT_REF by @id
 * so Google merges all per-page schemas into one Knowledge Graph entity.
 */

import {
  BRAND,
  ORG_ID,
  ORGANIZATION_REF,
  REAL_ESTATE_AGENT_ID,
  REAL_ESTATE_AGENT_SCHEMA,
  ORGANIZATION_SCHEMA,
  LODGING_BUSINESS_ID,
  SITE_ORIGIN,
  GOOGLE_BUSINESS_PROFILE_URL,
  HOTEL_BRAND_NAME,
} from "@/lib/orgIdentity";

const BASE_URL = SITE_ORIGIN;
// Internal alias kept for back-compat with the rest of this file. New code
// should import ORGANIZATION_REF directly from "@/lib/orgIdentity".
const ORGANIZATION = ORGANIZATION_REF;


// LodgingBusiness Schema for the ApArt Hotel accommodation brand.
// This is the brand node — the legal entity lives in ORGANIZATION_SCHEMA.
export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": LODGING_BUSINESS_ID,
  "name": HOTEL_BRAND_NAME,
  "alternateName": ["ApArt Hotel", "ApArt Hotel by RealTrust"],
  "description": "Apartamente regim hotelier, închirieri pe termen scurt și investiții imobiliare în Timișoara, aproape de Aeroport Timișoara, Iulius Town, Openville, Gara de Nord și Spitalul Județean.",
  "url": `${SITE_ORIGIN}/cazare`,
  "telephone": BRAND.telephone,
  "email": BRAND.email,
  "image": BRAND.image,
  "logo": BRAND.logo,
  "foundingDate": BRAND.foundingDate,
  "parentOrganization": { "@id": ORG_ID },


  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "postalCode": "300125",
    "addressCountry": "RO",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 45.7489,
    "longitude": 21.2087,
  },
  // Enhanced PriceRange for AI matching with user budgets
  "priceRange": "€50-€150 per night",
  // GeoCircle — defines exact service radius for AI/local search
  "areaServed": [
    {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": 45.7489,
        "longitude": 21.2087,
      },
      "geoRadius": "25000",
    },
    {
      "@type": "City",
      "name": "Timișoara",
      "sameAs": "https://en.wikipedia.org/wiki/Timi%C8%99oara",
      "containedInPlace": {
        "@type": "AdministrativeArea",
        "name": "Timiș County",
        "containedInPlace": {
          "@type": "Country",
          "name": "Romania",
        },
      },
    },
  ],
  // E-E-A-T: knowsAbout signals for GEO/LLM discoverability
  "knowsAbout": [
    "property management Timișoara",
    "short-term rental management Romania",
    "Airbnb management Timișoara",
    "Booking.com management",
    "regim hotelier Timișoara",
    "investiții imobiliare Timișoara",
    "ROI apartamente Timișoara",
    "administrare apartamente",
    "real estate investment Romania",
    "vacation rental management",
    "apartamente de inchiriat Timișoara Aeroport",
    "cazare Timișoara Spitalul Județean",
    "apartamente de vanzare Timișoara Openville",
    "regim hotelier Timișoara Gara de Nord",
    "apartamente Timișoara Piața Unirii",
    "apartamente de lux Timișoara Centru",
    "inchirieri apartamente Timișoara termen scurt",
    "agentie imobiliara Timișoara pareri",
  ],
  // Keywords for AI citation
  "keywords": "apartamente regim hotelier Timișoara, Aeroport Timișoara, apartamente de inchiriat Timișoara Aeroport, cazare Timișoara Spitalul Județean, apartamente de vanzare Timișoara Openville, regim hotelier Timișoara Gara de Nord, apartamente Timișoara Piața Unirii, apartamente de lux Timișoara Centru, inchirieri apartamente Timișoara termen scurt, agentie imobiliara Timișoara pareri",
  "slogan": "Tu încasezi, noi ne ocupăm de tot.",
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "00:00",
    "closes": "23:59",
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Self Check-in", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Parking", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Smart Lock Access", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "24/7 Guest Support", "value": true },
  ],
  // Service offerings for AI understanding
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Short-Term Rental Management Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Property Management",
          "description": "Complete hands-off property management with 9.2-9.4% net ROI",
        },
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "20",
          "priceCurrency": "EUR",
          "unitText": "% commission on revenue",
        },
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Short-Term Rental Accommodation",
          "description": "Premium furnished apartments in Timișoara for business and leisure travelers",
        },
        "priceSpecification": {
          "@type": "PriceSpecification",
          "minPrice": "50",
          "maxPrice": "150",
          "priceCurrency": "EUR",
          "unitText": "per night",
        },
      },
    ],
  },
  // Payment methods accepted
  "paymentAccepted": "Cash, Credit Card, Bank Transfer",
});

// Apartment/Property Schema
export interface PropertySchemaData {
  name: string;
  slug: string;
  description: string;
  image: string;
  images?: string[];
  location: string;
  pricePerNight: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  latitude?: number;
  longitude?: number;
  // Extended fields for premium schemas
  floor?: string | null;
  usableArea?: number | null;
  yearBuilt?: number | null;
  hasElevator?: boolean | null;
  hasAc?: boolean | null;
  parking?: string | null;
  orientation?: string | null;
  energyClass?: string | null;
  furnished?: string | null;
  balconies?: number | null;
  listingType?: string | null;
  createdAt?: string | null;
  basePricePerNight?: number | null;
  weekendPricePerNight?: number | null;
  neighborhood?: string | null;
  // Investment fields for GEO/AI optimization
  roiPercentage?: string | null;
  capitalNecesar?: number | null;
  estimatedRevenue?: string | null;
  // Nearby POIs for structured data
  nearbyPois?: Array<{
    name: string;
    nameEn: string;
    distanceMinutes: number;
    mode: "walk" | "drive";
    category: string;
  }>;
}

export const generateApartmentSchema = (property: PropertySchemaData) => ({
  "@context": "https://schema.org",
  "@type": "Apartment",
  "@id": `${BASE_URL}/proprietate/${property.slug}`,
  "name": property.name,
  "description": property.description,
  "url": `${BASE_URL}/proprietate/${property.slug}`,
  "image": property.images && property.images.length > 0 ? property.images : property.image,
  "numberOfRooms": property.bedrooms,
  "numberOfBathroomsTotal": property.bathrooms,
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": property.size,
    "unitCode": "MTK",
  },
  "occupancy": {
    "@type": "QuantitativeValue",
    "value": property.capacity,
    "unitText": "guests",
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "addressCountry": "RO",
    "streetAddress": property.location,
  },
  ...(property.latitude && property.longitude && {
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude,
    },
  }),
  "amenityFeature": property.amenities.map((amenity) => ({
    "@type": "LocationFeatureSpecification",
    "name": amenity,
    "value": true,
  })),
  "containedInPlace": {
    "@type": "LodgingBusiness",
    "name": "ApArt Hotel Timișoara",
    "url": BASE_URL,
  },
});

// Hotel Room Offer Schema (for booking)
export const generateHotelRoomOfferSchema = (property: PropertySchemaData) => ({
  "@context": "https://schema.org",
  "@type": "HotelRoom",
  "name": property.name,
  "description": property.description,
  "image": property.image,
  "url": `${BASE_URL}/proprietate/${property.slug}`,
  "bed": {
    "@type": "BedDetails",
    "numberOfBeds": property.bedrooms,
  },
  "occupancy": {
    "@type": "QuantitativeValue",
    "value": property.capacity,
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "EUR",
    "price": property.pricePerNight,
    "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    "availability": "https://schema.org/InStock",
    "url": `${BASE_URL}/proprietate/${property.slug}`,
    "seller": ORGANIZATION,
  },
});

// Aggregate Rating Schema
export interface AggregateRatingData {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

// NOTE: standalone Product-based rating/review generators were removed.
// Ratings and reviews must live on the entity they describe (LodgingBusiness,
// RealEstateAgent) and only when the reviews are visible on the page.

// Blog Article Schema
export interface ArticleSchemaData {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
  category?: string;
  tags?: string[];
  wordCount?: number;
  isAccessibleForFree?: boolean;
}

export const generateArticleSchema = (article: ArticleSchemaData) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": article.url,
  "headline": article.headline,
  "description": article.description,
  "image": article.image || `${BASE_URL}/og-image.jpg`,
  "datePublished": article.datePublished,
  "dateModified": article.dateModified || article.datePublished,
  "author": {
    "@type": "Person",
    "name": article.author,
    "url": BASE_URL,
  },
  "publisher": ORGANIZATION,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": article.url,
  },
  "isPartOf": {
    "@type": "Blog",
    "@id": `${BASE_URL}/blog`,
    "name": "RealTrust Blog",
    "publisher": ORGANIZATION,
  },
  "isAccessibleForFree": article.isAccessibleForFree !== false,
  "inLanguage": "ro-RO",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".article-tldr", "h1", ".prose h2"],
  },
  "about": {
    "@type": "Thing",
    "name": article.category || "Property Management",
  },
  ...(article.category && { "articleSection": article.category }),
  ...(article.tags && article.tags.length > 0 && { "keywords": article.tags.join(", ") }),
  ...(article.wordCount && { "wordCount": article.wordCount }),
});

// FAQ Schema
export interface FAQItem {
  question: string;
  answer: string;
}

export const generateFAQSchema = (faqItems: FAQItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map((item) => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer,
    },
  })),
});

// Breadcrumb Schema
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url,
  })),
});

// WebSite Schema with SearchAction
export const generateWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "RealTrust",
  "url": BASE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/oaspeti?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

// RealEstateAgent Schema — derived from the canonical brand identity,
// extended here with hasOfferCatalog + openingHoursSpecification specific
// to the imobiliare service line. Stable @id (#realestateagent) ensures
// Google merges this with every other RealEstateAgent reference on the site.
export const generateRealEstateAgentSchema = (rating?: AggregateRatingData) => {
  const baseSchema: Record<string, unknown> = {
    ...REAL_ESTATE_AGENT_SCHEMA,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicii Imobiliare",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Vânzare Proprietăți", description: "Servicii complete de vânzare imobiliară cu evaluare, marketing și negociere" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Achiziție Proprietăți", description: "Asistență în identificarea și achiziționarea proprietății ideale" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Închiriere & Administrare", description: "Servicii de închiriere pe termen lung și scurt cu administrare completă" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Consultanță Imobiliară", description: "Analiză de piață, evaluare proprietăți și consiliere investiții" } },
      ],
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "10:00", closes: "18:00" },
    ],
  };

  if (rating && rating.reviewCount > 0 && rating.ratingValue >= 1) {
    baseSchema["aggregateRating"] = {
      "@type": "AggregateRating",
      ratingValue: Math.max(1, Math.min(5, rating.ratingValue)).toFixed(1),
      reviewCount: String(rating.reviewCount),
      bestRating: "5",
      worstRating: "1",
    };
  }

  return baseSchema;
};

/** Re-export the canonical identity so consumers can import from one place. */
export { ORGANIZATION_SCHEMA, REAL_ESTATE_AGENT_SCHEMA, ORG_ID, REAL_ESTATE_AGENT_ID } from "@/lib/orgIdentity";


// Generate reviews schema from database reviews
export interface DatabaseReview {
  id: string;
  guest_name: string;
  rating: number;
  content: string | null;
  title: string | null;
  created_at: string;
  property_name?: string;
}

// Clamp a rating value to the valid 1-5 range for schema.org
const clampRating = (value: number): number => Math.max(1, Math.min(5, value));

export const generateReviewsFromDatabase = (
  reviews: DatabaseReview[],
  _itemName: string,
  _itemUrl: string
): Record<string, unknown> | null => {
  // Filter out reviews with invalid ratings (0 or negative)
  const validReviews = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  if (validReviews.length === 0) return null;

  const avgRating = clampRating(
    validReviews.reduce((sum, r) => sum + r.rating, 0) / validReviews.length
  );

  // Return only the review + aggregateRating data to be merged into LodgingBusiness
  return {
    "review": validReviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.guest_name,
      },
      "datePublished": review.created_at.split("T")[0],
      "reviewBody": review.content || review.title || "Experiență excelentă!",
      "name": review.title || undefined,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": String(clampRating(review.rating)),
        "bestRating": "5",
        "worstRating": "1",
      },
      ...(review.property_name && {
        "itemReviewed": {
          "@type": "Apartment",
          "name": review.property_name,
        },
      }),
    })),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": String(validReviews.length),
      "bestRating": "5",
      "worstRating": "1",
    },
  };
};

// RealEstateListing Schema — price, currency, availability, publication date
export const generateRealEstateListingSchema = (property: PropertySchemaData) => {
  const url = `${BASE_URL}/proprietate/${property.slug}`;
  const price = property.basePricePerNight || property.pricePerNight;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.name,
    "url": url,
    "description": property.description,
    "image": property.images && property.images.length > 0 ? property.images[0] : property.image,
    "datePosted": property.createdAt || new Date().toISOString().split("T")[0],
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EUR",
      "price": price,
      "priceValidUntil": new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
      "availability": "https://schema.org/InStock",
      "url": url,
      "seller": ORGANIZATION,
      ...(property.weekendPricePerNight && property.weekendPricePerNight !== price && {
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": property.weekendPricePerNight,
          "priceCurrency": "EUR",
          "unitText": "weekend per night",
        },
      }),
    },
  };
};

// Accommodation Schema — floorSize, rooms, floor, premium amenities
export const generateAccommodationSchema = (property: PropertySchemaData) => {
  const amenityFeatures: Array<Record<string, unknown>> = property.amenities.map((a) => ({
    "@type": "LocationFeatureSpecification",
    "name": a,
    "value": true,
  }));
  // Add structured premium amenities
  if (property.hasAc) amenityFeatures.push({ "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true });
  if (property.hasElevator) amenityFeatures.push({ "@type": "LocationFeatureSpecification", "name": "Elevator", "value": true });
  if (property.parking) amenityFeatures.push({ "@type": "LocationFeatureSpecification", "name": `Parking: ${property.parking}`, "value": true });

  // Add nearby POIs as LocationFeatureSpecification with distance
  if (property.nearbyPois?.length) {
    for (const poi of property.nearbyPois) {
      const modeText = poi.mode === "walk" ? "walking" : "driving";
      amenityFeatures.push({
        "@type": "LocationFeatureSpecification",
        "name": poi.nameEn || poi.name,
        "value": `${poi.distanceMinutes} min ${modeText}`,
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "name": property.name,
    "url": `${BASE_URL}/proprietate/${property.slug}`,
    "description": property.description,
    "numberOfRooms": property.bedrooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "occupancy": {
      "@type": "QuantitativeValue",
      "value": property.capacity,
      "unitText": "guests",
    },
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": property.usableArea || property.size,
      "unitCode": "MTK",
    },
    ...(property.floor && {
      "floorLevel": property.floor,
    }),
    ...(property.yearBuilt && {
      "yearBuilt": property.yearBuilt,
    }),
    ...(property.furnished && {
      "permittedUsage": `Furnished: ${property.furnished}`,
    }),
    ...(property.energyClass && {
      "additionalProperty": [{
        "@type": "PropertyValue",
        "name": "Energy Class",
        "value": property.energyClass,
      }],
    }),
    "amenityFeature": amenityFeatures,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "addressCountry": "RO",
      "streetAddress": property.location,
    },
    ...(property.latitude && property.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": property.latitude,
        "longitude": property.longitude,
      },
    }),
    ...(property.pricePerNight > 0 && {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "price": property.basePricePerNight || property.pricePerNight,
        "availability": "https://schema.org/InStock",
        "url": `${BASE_URL}/proprietate/${property.slug}`,
        ...(property.weekendPricePerNight && {
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": property.weekendPricePerNight,
            "priceCurrency": "EUR",
            "unitText": "weekend night",
          },
        }),
      },
    }),
    "containedInPlace": {
      "@type": "LodgingBusiness",
      "name": "ApArt Hotel Timișoara",
      "url": BASE_URL,
    },
  };
};

// Place & PostalAddress Schema — geographic entities linking
export const generatePlaceSchema = (property: PropertySchemaData) => {
  // Extract neighborhood from location string (e.g. "Zona Iulius Town" → "Iulius Town")
  const neighborhood = property.neighborhood || property.location;
  
  const placeSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": `${property.name} — ${neighborhood}, Timișoara`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "postalCode": "300125",
      "addressCountry": "RO",
      "streetAddress": property.location,
    },
  };

  if (property.latitude && property.longitude) {
    placeSchema["geo"] = {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude,
    };
    placeSchema["hasMap"] = `https://www.google.com/maps?q=${property.latitude},${property.longitude}`;
  }

  // Link to known nearby landmarks as containedInPlace
  const locationLower = (property.location || "").toLowerCase();
  const nearbyLandmarks: Record<string, unknown>[] = [];
  
  if (locationLower.includes("iulius") || locationLower.includes("dâmbovița")) {
    nearbyLandmarks.push({ "@type": "LocalBusiness", "name": "Iulius Town Timișoara" });
  }
  if (locationLower.includes("isho") || locationLower.includes("iosefin")) {
    nearbyLandmarks.push({ "@type": "Landmark", "name": "ISHO Timișoara" });
  }
  if (locationLower.includes("centru") || locationLower.includes("unirii")) {
    nearbyLandmarks.push({ "@type": "Landmark", "name": "Piața Unirii Timișoara" });
  }

  if (nearbyLandmarks.length > 0) {
    placeSchema["containedInPlace"] = nearbyLandmarks.length === 1
      ? nearbyLandmarks[0]
      : nearbyLandmarks;
  }

  return placeSchema;
};

// Property BreadcrumbList Schema — Acasă > Apartamente > Timișoara > [Cartier]
export const generatePropertyBreadcrumbSchema = (property: PropertySchemaData) => {
  const neighborhood = property.neighborhood || property.location;
  const isStay = (property.listingType || "cazare") === "cazare";
  const hubName = isStay ? "Cazare Timișoara" : "Proprietăți Timișoara";
  const hubUrl = isStay ? `${BASE_URL}/cazare` : `${BASE_URL}/imobiliare`;
  const items: BreadcrumbItem[] = [
    { name: "Acasă", url: BASE_URL },
    { name: hubName, url: hubUrl },
  ];
  if (neighborhood) {
    items.push({ name: neighborhood, url: `${hubUrl}?zona=${encodeURIComponent(neighborhood)}` });
  }
  items.push({ name: property.name, url: `${BASE_URL}/proprietate/${property.slug}` });

  return generateBreadcrumbSchema(items);
};

// ImageObject Schema — metadata for each gallery image
export const generateImageObjectSchemas = (property: PropertySchemaData) => {
  const images = property.images && property.images.length > 0 ? property.images : [property.image];
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "name": `${property.name} — Galerie foto`,
    "url": `${BASE_URL}/proprietate/${property.slug}`,
    "image": images.map((img, index) => ({
      "@type": "ImageObject",
      "url": img,
      "name": `${property.name} — ${index === 0 ? "Imagine principală" : `Fotografie ${index + 1}`}`,
      "description": `${property.name}, ${property.location}, Timișoara — ${property.bedrooms} camere, ${property.size || property.usableArea || ""} mp`,
      "representativeOfPage": index === 0,
      "contentUrl": img,
      ...(index === 0 && { "thumbnail": img }),
    })),
    "numberOfItems": images.length,
  };
};

// Investment Opportunity Schema — AI/GEO optimized for LLM extraction
export const generateInvestmentOpportunitySchema = (property: PropertySchemaData) => {
  const roi = property.roiPercentage ? parseFloat(property.roiPercentage.replace(/[^0-9.]/g, "")) : null;
  const capital = property.capitalNecesar;
  const revenue = property.estimatedRevenue ? parseFloat(property.estimatedRevenue.replace(/[^0-9.]/g, "")) : null;

  if (!roi && !capital) return null;

  return {
    "@context": "https://schema.org",
    "@type": "InvestmentOrFinancialProduct",
    "name": `${property.name} — Investiție Imobiliară Timișoara`,
    "description": `Oportunitate de investiție imobiliară în ${property.location}, Timișoara. ${roi ? `Randament net estimat: ${roi}% ROI.` : ""} ${capital ? `Capital necesar: €${capital.toLocaleString("ro-RO")}.` : ""} Administrare profesională regim hotelier.`,
    "url": `${BASE_URL}/proprietate/${property.slug}`,
    "image": property.image,
    "category": "Real Estate Investment",
    "provider": ORGANIZATION,
    ...(roi && {
      "annualPercentageRate": roi,
    }),
    "additionalProperty": [
      ...(roi ? [{
        "@type": "PropertyValue",
        "name": "yield",
        "value": `${roi}%`,
        "description": "Net annual yield (ROI) after management fees and taxes",
      }] : []),
      ...(roi ? [{
        "@type": "PropertyValue",
        "name": "roi",
        "value": `${roi}%`,
        "description": "Return on Investment — net annual percentage",
      }] : []),
      {
        "@type": "PropertyValue",
        "name": "investmentOpportunity",
        "value": true,
        "description": "Active investment opportunity in Timișoara real estate market",
      },
      ...(capital ? [{
        "@type": "PropertyValue",
        "name": "capitalRequired",
        "value": `€${capital.toLocaleString("ro-RO")}`,
        "description": "Total capital required for this investment property",
      }] : []),
      ...(revenue ? [{
        "@type": "PropertyValue",
        "name": "estimatedMonthlyRevenue",
        "value": `€${revenue.toLocaleString("ro-RO")}`,
        "description": "Estimated gross monthly revenue from short-term rental",
      }] : []),
      {
        "@type": "PropertyValue",
        "name": "managementType",
        "value": "Professional short-term rental management",
      },
      {
        "@type": "PropertyValue",
        "name": "location",
        "value": `${property.location}, Timișoara, Romania`,
      },
    ],
    "areaServed": {
      "@type": "City",
      "name": "Timișoara",
      "containedInPlace": { "@type": "Country", "name": "Romania" },
    },
  };
};

/**
 * Combined schema for property pages — intentionally minimal and typed by the
 * real nature of the listing:
 *  - cazare (accommodation unit): the page emits LodgingBusiness + HotelRoom
 *    (built in PropertyDetail / prerender), so here we only add the breadcrumb.
 *  - vânzare / investiție / închiriere: a single RealEstateListing-oriented
 *    graph (Accommodation for the physical unit) + optional investment node.
 * No Product, no duplicated Apartment/Accommodation/Place/ImageGallery nodes.
 */
export const generatePropertyPageSchemas = (
  property: PropertySchemaData,
  _reviews?: unknown[]
) => {
  const isStay = (property.listingType || "cazare") === "cazare";
  const schemas: Record<string, unknown>[] = [
    generatePropertyBreadcrumbSchema(property),
  ];

  if (isStay) {
    return schemas;
  }

  // Non-stay listings: the RealEstateListing node comes from
  // generatePropertySEO (correct price/offer per listing type).
  const investmentSchema = generateInvestmentOpportunitySchema(property);
  if (investmentSchema) {
    schemas.push(investmentSchema);
  }

  return schemas;
};


// Canonical Organization node (single source of truth: orgIdentity.ts).
// Kept as a function for back-compat with existing call sites.
export const generateOrganizationSchema = () => ({ ...ORGANIZATION_SCHEMA });

// Homepage combined schema with reviews from database
export const generateHomepageSchemas = (reviews?: DatabaseReview[]) => {
  const lodgingBusiness = generateLocalBusinessSchema();

  // Merge reviews directly into LodgingBusiness to avoid a separate Product schema
  if (reviews && reviews.length > 0) {
    const reviewData = generateReviewsFromDatabase(
      reviews,
      HOTEL_BRAND_NAME,
      BASE_URL
    );
    if (reviewData) {
      // Override aggregateRating with real data and add individual reviews
      Object.assign(lodgingBusiness, reviewData);
    }
  }

  const schemas: Record<string, unknown>[] = [
    lodgingBusiness,
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generatePropertyManagementServiceSchema(),
    generateHomepageRealEstateAgentSchema(),
  ];

  return schemas;
}

// Homepage RealEstateAgent schema — same canonical @id, so Google merges it
// with the site-wide RealEstateAgent node instead of creating a duplicate.
export const generateHomepageRealEstateAgentSchema = () => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": REAL_ESTATE_AGENT_ID,
  "name": "RealTrust / Trust Estate",
  "alternateName": ["RealTrust Imobiliare Timișoara", "Agenție imobiliară Timișoara RealTrust", "RealTrust Real Estate"],
  "description": "Firmă de property management și investiții imobiliare în Timișoara. Operăm ApArt Hotel și oferim consultanță pentru ansambluri rezidențiale premium. Servicii complete de vânzări, închirieri, administrare regim hotelier și evaluare proprietăți în Timișoara.",
  "url": BASE_URL,

  "telephone": "+40799069256",
  "email": "info@realtrust.ro",
  "image": `${BASE_URL}/images/hero-optimized-1920w.webp`,
  "logo": `${BASE_URL}/images/hero-optimized-800w.webp`,
  "priceRange": "€€",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "postalCode": "300125",
    "addressCountry": "RO",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 45.7489,
    "longitude": 21.2087,
  },
  "areaServed": [
    { "@type": "City", "name": "Timișoara" },
    { "@type": "AdministrativeArea", "name": "Timiș County" },
  ],
  "knowsAbout": [
    "agenție imobiliară Timișoara",
    "proprietăți de vânzare Timișoara",
    "servicii imobiliare Timișoara",
    "apartamente de vânzare Timișoara Centru",
    "apartamente de vânzare Timișoara Centru Vechi",
    "apartamente de închiriat Timișoara studenți",
    "închirieri apartamente Timișoara Complex Studențesc",
    "investiții imobiliare randament Timișoara",
    "imobiliare Timișoara ISHO",
    "apartamente noi Timișoara ISHO",
    "apartamente noi Timișoara de vânzare",
    "proprietăți de vânzare Timișoara Calea Girocului",
    "cazare Timișoara lângă Spitalul Județean",
    "administrare apartamente Timișoara",
    "cazare temporară Timișoara",
    "regim hotelier Complex Studențesc",
  ],
  "keywords": "agenție imobiliară Timișoara, servicii imobiliare Timișoara, investiții imobiliare randament Timișoara, apartamente noi Timișoara de vânzare, apartamente noi Timișoara ISHO, apartamente de închiriat Timișoara studenți, închirieri apartamente Timișoara Complex Studențesc, proprietăți de vânzare Timișoara Calea Girocului, cazare Timișoara lângă Spitalul Județean",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Servicii Imobiliare Timișoara",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Vânzări apartamente Timișoara", "areaServed": "Timișoara" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Agenție imobiliară Timișoara", "areaServed": "Timișoara" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Închirieri apartamente Timișoara", "areaServed": "Timișoara" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Apartamente noi Timișoara de vânzare", "areaServed": "Timișoara" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Investiții imobiliare randament Timișoara", "areaServed": "Timișoara" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Administrare apartamente Timișoara", "areaServed": "Timișoara" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Regim hotelier Timișoara", "areaServed": "Timișoara" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Evaluare gratuită proprietate Timișoara", "areaServed": "Timișoara" } },
    ],
  },
  "sameAs": [
    "https://www.facebook.com/realtrust.ro",
    "https://www.instagram.com/realtrust_timisoara",
    "https://www.booking.com",
    GOOGLE_BUSINESS_PROFILE_URL,
  ],
});

// Blog Collection Page Schema for blog listing
export interface BlogListingArticle {
  title: string;
  slug: string;
  excerpt: string;
  cover_image?: string | null;
  published_at?: string | null;
  created_at: string;
}

export const generateBlogCollectionSchema = (articles: BlogListingArticle[]) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${BASE_URL}/blog`,
  "name": "Blog RealTrust",
  "description": "Articole, ghiduri și sfaturi pentru proprietari și oaspeți. Regim hotelier, investiții, administrare proprietăți în Timișoara.",
  "url": `${BASE_URL}/blog`,
  "isPartOf": {
    "@type": "WebSite",
    "name": "RealTrust",
    "url": BASE_URL,
  },
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": articles.length,
    "itemListElement": articles.slice(0, 10).map((article, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${BASE_URL}/blog/${article.slug}`,
      "name": article.title,
      "description": article.excerpt,
      ...(article.cover_image && { "image": article.cover_image }),
    })),
  },
});

// HowTo Schema for guide/how-to articles
export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export const generateHowToSchema = (
  name: string,
  description: string,
  steps: HowToStep[],
  totalTime?: string, // ISO 8601 duration, e.g. "PT30M"
) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": name,
  "description": description,
  ...(totalTime && { "totalTime": totalTime }),
  "step": steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.name,
    "text": step.text,
    ...(step.image && { "image": step.image }),
  })),
});

// Speakable Schema for a page — targets CSS selectors for voice/AI assistants
export const generateSpeakableSchema = (
  pageName: string,
  pageUrl: string,
  cssSelectors: string[] = [".page-summary", "h1", "h2"],
) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": pageName,
  "url": pageUrl,
  "creator": {
    "@type": "Organization",
    "name": "Imo Business Centrum SRL",
    "url": "https://realtrust.ro",
  },
  "license": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors,
  },
});

// VideoObject Schema for video testimonials
export interface VideoTestimonialSchemaData {
  name: string;
  description: string;
  youtubeId: string;
  uploadDate?: string;
  thumbnailUrl?: string;
}

export const generateVideoObjectSchema = (video: VideoTestimonialSchemaData) => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": video.name,
  "description": video.description,
  "embedUrl": `https://www.youtube.com/embed/${video.youtubeId}`,
  "contentUrl": `https://www.youtube.com/watch?v=${video.youtubeId}`,
  "thumbnailUrl": video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
  "uploadDate": video.uploadDate || new Date().toISOString().split("T")[0],
  "publisher": ORGANIZATION,
});

// ItemList Schema for property listing pages
export interface PropertyListItem {
  name: string;
  slug: string;
  description: string;
  image?: string;
  price?: number;
}

export const generatePropertyListSchema = (properties: PropertyListItem[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Apartamente ApArt Hotel Timișoara",
  "description": "Apartamente premium în regim hotelier în Timișoara, administrate profesional de RealTrust.",
  "url": `${BASE_URL}/oaspeti`,
  "numberOfItems": properties.length,
  "itemListElement": properties.map((prop, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "LodgingBusiness",
      "name": prop.name,
      "url": `${BASE_URL}/proprietate/${prop.slug}`,
      "description": prop.description,
      ...(prop.image && { "image": prop.image }),
      ...(prop.price && {
        "offers": {
          "@type": "Offer",
          "priceCurrency": "EUR",
          "price": prop.price,
          "availability": "https://schema.org/InStock",
        },
      }),
    },
  })),
});

// Service Schema for property management service page
export const generatePropertyManagementServiceSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${BASE_URL}/pentru-proprietari#service`,
  "name": "Administrare Apartamente Regim Hotelier Timișoara",
  "alternateName": "Property Management Short-Term Rental Timișoara",
  "description": "Serviciu complet de administrare a apartamentelor în regim hotelier în Timișoara. Include management Airbnb/Booking.com, check-in/check-out, curățenie, mentenanță și raportare financiară transparentă.",
  "url": `${BASE_URL}/pentru-proprietari`,
  "provider": ORGANIZATION,
  "areaServed": {
    "@type": "City",
    "name": "Timișoara",
    "containedInPlace": { "@type": "Country", "name": "Romania" },
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Pachete Administrare",
    "itemListElement": [
      {
        "@type": "Offer",
        "name": "Management Complet",
        "description": "Administrare 100% hands-off: listing, check-in/out, curățenie, mentenanță, rapoarte lunare",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "20",
          "priceCurrency": "EUR",
          "unitText": "% din venitul brut",
        },
      },
    ],
  },
});
