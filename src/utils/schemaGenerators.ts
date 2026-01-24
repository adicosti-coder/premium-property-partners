/**
 * Schema.org JSON-LD Generators for SEO
 * Centralized utilities for generating structured data
 */

const BASE_URL = "https://realtrustaparthotel.lovable.app";
const ORGANIZATION = {
  "@type": "Organization",
  "name": "RealTrust & ApArt Hotel Timișoara",
  "url": BASE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${BASE_URL}/favicon.ico`,
  },
  "sameAs": [
    "https://www.facebook.com/realtrust.ro",
    "https://www.instagram.com/realtrust_timisoara",
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+40723154520",
    "contactType": "customer service",
    "availableLanguage": ["Romanian", "English"],
  },
};

// LocalBusiness Schema for homepage
export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": `${BASE_URL}/#organization`,
  "name": "RealTrust & ApArt Hotel Timișoara",
  "alternateName": "ApArt Hotel Timișoara",
  "description": "Administrare profesională de apartamente în regim hotelier în Timișoara. Maximizează venitul proprietății tale cu 98% rată de ocupare.",
  "url": BASE_URL,
  "telephone": "+40723154520",
  "email": "contact@realtrust.ro",
  "image": `${BASE_URL}/og-image.jpg`,
  "logo": `${BASE_URL}/favicon.ico`,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Timișoara",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "postalCode": "300000",
    "addressCountry": "RO",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 45.7489,
    "longitude": 21.2087,
  },
  "priceRange": "€€",
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
  ],
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

export const generateAggregateRatingSchema = (
  itemName: string,
  itemUrl: string,
  rating: AggregateRatingData
) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": itemName,
  "url": itemUrl,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": rating.ratingValue.toFixed(1),
    "reviewCount": rating.reviewCount,
    "bestRating": rating.bestRating || 5,
    "worstRating": rating.worstRating || 1,
  },
});

// Individual Review Schema
export interface ReviewData {
  author: string;
  datePublished: string;
  reviewBody: string;
  ratingValue: number;
}

export const generateReviewSchema = (
  itemName: string,
  itemUrl: string,
  reviews: ReviewData[]
) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": itemName,
  "url": itemUrl,
  "review": reviews.map((review) => ({
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": review.author,
    },
    "datePublished": review.datePublished,
    "reviewBody": review.reviewBody,
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.ratingValue,
      "bestRating": 5,
      "worstRating": 1,
    },
  })),
});

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
  },
  "publisher": ORGANIZATION,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": article.url,
  },
  "inLanguage": "ro-RO",
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
  "name": "RealTrust & ApArt Hotel Timișoara",
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

// RealEstateAgent Schema for Imobiliare page
export const generateRealEstateAgentSchema = () => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "RealTrust Imobiliare",
  "url": `${BASE_URL}/imobiliare`,
  "telephone": "+40723154520",
  "email": "imobiliare@realtrust.ro",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "addressCountry": "RO",
  },
  "areaServed": {
    "@type": "City",
    "name": "Timișoara",
  },
  "serviceType": ["Property Sales", "Property Consulting", "Property Valuation"],
});

// Combined schema for property pages
export const generatePropertyPageSchemas = (
  property: PropertySchemaData,
  reviews?: ReviewData[]
) => {
  const schemas: Record<string, unknown>[] = [
    generateApartmentSchema(property),
    generateHotelRoomOfferSchema(property),
  ];

  if (property.rating > 0 && property.reviewCount > 0) {
    schemas.push(
      generateAggregateRatingSchema(
        property.name,
        `${BASE_URL}/proprietate/${property.slug}`,
        {
          ratingValue: property.rating,
          reviewCount: property.reviewCount,
        }
      )
    );
  }

  if (reviews && reviews.length > 0) {
    schemas.push(
      generateReviewSchema(
        property.name,
        `${BASE_URL}/proprietate/${property.slug}`,
        reviews.slice(0, 5) // Limit to 5 reviews for structured data
      )
    );
  }

  return schemas;
};
