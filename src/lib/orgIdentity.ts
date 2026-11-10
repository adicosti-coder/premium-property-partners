/**
 * Single source of truth for the brand's Schema.org identity.
 *
 * Every Organization / LocalBusiness / RealEstateAgent / LodgingBusiness
 * JSON-LD block emitted anywhere on the site MUST derive from these
 * constants so that Google can merge them by `@id` into a single
 * Knowledge Graph entity.
 *
 * Conflicting fields (different phone, email, logo, address per page)
 * fragment the entity and weaken E-E-A-T signals.
 *
 * Per-page schemas (BlogPosting, Apartment, RealEstateListing, …) should
 * reference the publisher/seller by `@id` only:
 *
 *     { "publisher": { "@id": ORG_ID } }
 *
 * instead of inlining a duplicate Organization block.
 */

import { ENTITY_SHORT, ENTITY_ANSWER } from "./entityDefinition";
import { CONTACT_HOURS } from "./businessFacts";

export const SITE_ORIGIN = "https://realtrust.ro";

/** Verified Google Business Profile (Google Maps) listing for RealTrust. */
export const GOOGLE_BUSINESS_PROFILE_URL =
  "https://www.google.com/maps/place/RealTrust/data=!4m2!3m1!1s0x40918b091135b1b3:0x714fdcd64f129651";

export const ORG_ID = `${SITE_ORIGIN}/#organization`;
export const REAL_ESTATE_AGENT_ID = `${SITE_ORIGIN}/#realestateagent`;
export const LODGING_BUSINESS_ID = `${SITE_ORIGIN}/#lodgingbusiness`;

/** Canonical contact data — change here only. */
export const BRAND = {
  // Legal/commercial entity. The accommodation brand (ApArt Hotel) is a
  // separate node — see LODGING_BUSINESS_ID / HOTEL_BRAND_NAME below.
  name: "RealTrust",
  legalName: "SC Imo Business Centrum SRL",
  taxID: "RO14380627",
  alternateNames: ["RealTrust Imobiliare", "RealTrust Timișoara"],
  telephone: "+40799069256",
  email: "info@realtrust.ro",
  logo: `${SITE_ORIGIN}/images/icon-512.png`,
  image: `${SITE_ORIGIN}/images/hero-optimized-1920w.webp`,
  url: SITE_ORIGIN,
  foundingDate: "2001",
  address: {
    addressLocality: "Timișoara",
    addressRegion: "Timiș",
    postalCode: "300125",
    addressCountry: "RO",
  },
  geo: {
    latitude: 45.7489,
    longitude: 21.2087,
  },
  // Only externally verifiable profiles belong here.
  sameAs: [
    "https://www.facebook.com/realtrust.ro",
    "https://www.instagram.com/ap.art.hotel/",
    GOOGLE_BUSINESS_PROFILE_URL,
  ],
} as const;

/** Accommodation brand operated by RealTrust — a brand, not the legal entity. */
export const HOTEL_BRAND_NAME = "ApArt Hotel Timișoara";


const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  addressLocality: BRAND.address.addressLocality,
  addressRegion: BRAND.address.addressRegion,
  postalCode: BRAND.address.postalCode,
  addressCountry: BRAND.address.addressCountry,
} as const;

const GEO_COORDINATES = {
  "@type": "GeoCoordinates",
  latitude: BRAND.geo.latitude,
  longitude: BRAND.geo.longitude,
} as const;

/** Canonical Organization node. Use as publisher/parent across the site. */
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: BRAND.name,
  legalName: BRAND.legalName,
  taxID: BRAND.taxID,
  alternateName: BRAND.alternateNames,
  // ENTITY SEO: identical wording to the visible "Ce este RealTrust?" block.
  description: ENTITY_ANSWER.ro,
  slogan: ENTITY_SHORT.ro,
  url: BRAND.url,
  logo: {
    "@type": "ImageObject",
    url: BRAND.logo,
    width: 512,
    height: 512,
  },
  image: BRAND.image,
  email: BRAND.email,
  telephone: BRAND.telephone,
  foundingDate: BRAND.foundingDate,
  address: POSTAL_ADDRESS,
  areaServed: { "@type": "City", name: "Timișoara" },
  sameAs: [...BRAND.sameAs],
  // Semantic relations: RealTrust → services + the ApArt Hotel brand.
  brand: {
    "@type": "Brand",
    "@id": `${SITE_ORIGIN}/#apart-hotel`,
    name: HOTEL_BRAND_NAME,
    url: `${SITE_ORIGIN}/cazare`,
  },
  // The agency, the investment advisory and the ApArt Hotel accommodation
  // operation are departments of the same legal entity, not separate companies.
  department: [
    { "@id": REAL_ESTATE_AGENT_ID },
    { "@id": `${SITE_ORIGIN}/#financialservice` },
    { "@id": LODGING_BUSINESS_ID },
  ],
  knowsAbout: [
    "servicii imobiliare Timișoara",
    "property management regim hotelier",
    "investiții imobiliare Timișoara",
  ],

  contactPoint: {
    "@type": "ContactPoint",
    telephone: BRAND.telephone,
    email: BRAND.email,
    contactType: "customer service",
    areaServed: "RO",
    availableLanguage: ["Romanian", "English"],
  },
} as const;

/** Lightweight publisher reference for nested schemas (BlogPosting, etc.). */
export const ORGANIZATION_REF = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: BRAND.name,
  logo: {
    "@type": "ImageObject",
    url: BRAND.logo,
  },
} as const;

/** Canonical RealEstateAgent node. */
export const REAL_ESTATE_AGENT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": REAL_ESTATE_AGENT_ID,
  name: BRAND.name,
  legalName: BRAND.legalName,
  taxID: BRAND.taxID,
  alternateName: "RealTrust - Servicii Imobiliare Timișoara",
  description: ENTITY_ANSWER.ro,
  url: BRAND.url,
  logo: BRAND.logo,
  image: BRAND.image,
  telephone: BRAND.telephone,
  email: BRAND.email,
  priceRange: "$$$",
  currenciesAccepted: "EUR, RON",
  paymentAccepted: "Cash, Credit Card, Bank Transfer",
  openingHours: CONTACT_HOURS.schemaText,
  address: POSTAL_ADDRESS,
  geo: GEO_COORDINATES,
  areaServed: [
    { "@type": "City", name: "Timișoara" },
    { "@type": "Place", name: "Cetate, Timișoara" },
    { "@type": "Place", name: "Iosefin, Timișoara" },
    { "@type": "Place", name: "Complex Studențesc, Timișoara" },
    { "@type": "Place", name: "ISHO, Timișoara" },
    { "@type": "Place", name: "Dumbrăvița, Timișoara" },
    { "@type": "Place", name: "Fabric, Timișoara" },
    { "@type": "Place", name: "Calea Aradului, Timișoara" },
  ],
  knowsAbout: [
    "Apartamente de vânzare Timișoara",
    "Închirieri apartamente Timișoara studenți",
    "Cazare regim hotelier Timișoara",
    "Investiții imobiliare Timișoara",
    "Administrare apartamente Airbnb Booking",
    "Evaluare proprietăți Timișoara",
  ],
  serviceType: [
    "Vânzări imobiliare",
    "Închirieri apartamente",
    "Administrare regim hotelier",
    "Consultanță investiții imobiliare",
    "Evaluare gratuită proprietăți",
  ],
  parentOrganization: { "@id": ORG_ID },
  sameAs: [...BRAND.sameAs],
} as const;

/** Lightweight RealEstateAgent reference for seller/provider fields. */
export const REAL_ESTATE_AGENT_REF = {
  "@type": "RealEstateAgent",
  "@id": REAL_ESTATE_AGENT_ID,
  name: REAL_ESTATE_AGENT_SCHEMA.name,
} as const;

export const FINANCIAL_SERVICE_ID = `${SITE_ORIGIN}/#financialservice`;

/**
 * Canonical FinancialService node — RealTrust's investment-advisory side
 * (ROI analysis, yield projections, portfolio structuring for apartments in
 * regim hotelier). Emitted on the investment/ROI pages and merged by Google
 * with ORG_ID via parentOrganization.
 */
export const FINANCIAL_SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "@id": FINANCIAL_SERVICE_ID,
  name: "RealTrust — Consultanță Investiții Imobiliare Timișoara",
  description:
    "Analiză de randament, due diligence și structurare de portofoliu pentru apartamente în regim hotelier în Timișoara. Randament net estimat 6,5–9,4% pe an (ocupare anuală 65–75%, calcul 70%).",
  url: `${SITE_ORIGIN}/investitii`,
  logo: BRAND.logo,
  image: BRAND.image,
  telephone: BRAND.telephone,
  email: BRAND.email,
  priceRange: "$$$",
  currenciesAccepted: "EUR, RON",
  paymentAccepted: "Cash, Credit Card, Bank Transfer",
  openingHours: CONTACT_HOURS.schemaText,
  address: POSTAL_ADDRESS,
  geo: GEO_COORDINATES,
  areaServed: { "@type": "City", name: "Timișoara" },
  parentOrganization: { "@id": ORG_ID },
  sameAs: [...BRAND.sameAs],
  serviceType: [
    "Consultanță investiții imobiliare",
    "Analiză randament (ROI) apartamente",
    "Administrare regim hotelier",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicii de investiții imobiliare",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Analiză Randament apartament",
          description:
            "Proiecție de venit și randament net pentru un apartament dat în regim hotelier, pe ipoteze publice.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Property management regim hotelier",
          description:
            "Administrare completă (listare, prețuri dinamice, curățenie, oaspeți, raportare lunară).",
        },
      },
    ],
  },
} as const;


/**
 * Canonical LodgingBusiness node for the ApArt Hotel accommodation brand.
 * The legal entity stays in ORGANIZATION_SCHEMA; this node only points to it.
 * Shared by the runtime homepage schemas and the prerendered static HTML.
 */
export const LODGING_BUSINESS_SCHEMA = {
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
    "Randament apartamente Timișoara",
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
          "description": "Complete hands-off property management with 6.5-9.4% estimated net ROI",
        },
        "priceSpecification": {
          "@type": "PriceSpecification",
          "minPrice": "15",
          "maxPrice": "20",
          "unitText": "% din venitul net (venit brut minus comisioane canale și utilități)",
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
} as const;
