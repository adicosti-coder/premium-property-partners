/**
 * Schema.org JSON-LD Generators for SEO
 * Centralized utilities for generating structured data
 */

const BASE_URL = "https://realtrust.ro";
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

// LocalBusiness Schema for homepage - enhanced for AI visibility
export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": `${BASE_URL}/#organization`,
  "name": "RealTrust & ApArt Hotel Timișoara",
  "alternateName": "ApArt Hotel Timișoara",
  "description": "Administrare profesională de apartamente în regim hotelier în Timișoara. Maximizează venitul proprietății tale cu 98% rată de ocupare și randament net 9.2-9.4% ROI.",
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
  // Enhanced PriceRange for AI matching with user budgets
  "priceRange": "€50-€150 per night",
  // AggregateRating - critical for AI recommendations
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "500",
    "bestRating": "5",
    "worstRating": "1",
  },
  // AreaServed - clearly marked for Timișoara
  "areaServed": [
    {
      "@type": "City",
      "name": "Timișoara",
      "containedInPlace": {
        "@type": "AdministrativeArea",
        "name": "Timiș County",
        "containedInPlace": {
          "@type": "Country",
          "name": "Romania",
        },
      },
    },
    {
      "@type": "AdministrativeArea",
      "name": "Județul Timiș",
    },
  ],
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
export const generateRealEstateAgentSchema = (rating?: AggregateRatingData) => {
  const baseSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}/imobiliare`,
    "name": "RealTrust Imobiliare",
    "alternateName": "RealTrust - Servicii Imobiliare Timișoara",
    "description": "Servicii imobiliare complete în Timișoara: vânzări, achiziții, închirieri și consultanță. Experiență de peste 25 ani în piața imobiliară.",
    "url": `${BASE_URL}/imobiliare`,
    "telephone": "+40723154520",
    "email": "imobiliare@realtrust.ro",
    "image": `${BASE_URL}/og-image.jpg`,
    "logo": `${BASE_URL}/favicon.ico`,
    "priceRange": "€€-€€€",
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
    "areaServed": [
      {
        "@type": "City",
        "name": "Timișoara",
      },
      {
        "@type": "AdministrativeArea",
        "name": "Județul Timiș",
      },
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Servicii Imobiliare",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Vânzare Proprietăți",
            "description": "Servicii complete de vânzare imobiliară cu evaluare, marketing și negociere",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Achiziție Proprietăți",
            "description": "Asistență în identificarea și achiziționarea proprietății ideale",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Închiriere & Administrare",
            "description": "Servicii de închiriere pe termen lung și scurt cu administrare completă",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Consultanță Imobiliară",
            "description": "Analiză de piață, evaluare proprietăți și consiliere investiții",
          },
        },
      ],
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "10:00",
        "closes": "14:00",
      },
    ],
    "sameAs": [
      "https://www.facebook.com/realtrust.ro",
      "https://www.instagram.com/realtrust_timisoara",
    ],
  };

  // Add aggregate rating if available
  if (rating && rating.reviewCount > 0) {
    baseSchema["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": rating.ratingValue.toFixed(1),
      "reviewCount": rating.reviewCount,
      "bestRating": rating.bestRating || 5,
      "worstRating": rating.worstRating || 1,
    };
  }

  return baseSchema;
};

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

export const generateReviewsFromDatabase = (
  reviews: DatabaseReview[],
  itemName: string,
  itemUrl: string
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": itemName,
  "url": itemUrl,
  "review": reviews.slice(0, 10).map((review) => ({
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
      "ratingValue": review.rating,
      "bestRating": 5,
      "worstRating": 1,
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
    "ratingValue": (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
    "reviewCount": reviews.length,
    "bestRating": 5,
    "worstRating": 1,
  },
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

// Homepage combined schema with reviews from database
export const generateHomepageSchemas = (reviews?: DatabaseReview[]) => {
  const schemas: Record<string, unknown>[] = [
    generateLocalBusinessSchema(),
    generateWebSiteSchema(),
  ];

  if (reviews && reviews.length > 0) {
    schemas.push(
      generateReviewsFromDatabase(
        reviews,
        "RealTrust & ApArt Hotel Timișoara",
        BASE_URL
      )
    );
  }

  return schemas;
};

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
  "name": "Blog RealTrust & ApArt Hotel",
  "description": "Articole, ghiduri și sfaturi pentru proprietari și oaspeți. Regim hotelier, investiții, administrare proprietăți în Timișoara.",
  "url": `${BASE_URL}/blog`,
  "isPartOf": {
    "@type": "WebSite",
    "name": "RealTrust & ApArt Hotel Timișoara",
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
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors,
  },
});
