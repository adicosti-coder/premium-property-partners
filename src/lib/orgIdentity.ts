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

export const SITE_ORIGIN = "https://realtrust.ro";

export const ORG_ID = `${SITE_ORIGIN}/#organization`;
export const REAL_ESTATE_AGENT_ID = `${SITE_ORIGIN}/#realestateagent`;
export const LODGING_BUSINESS_ID = `${SITE_ORIGIN}/#lodgingbusiness`;

/** Canonical contact data — change here only. */
export const BRAND = {
  name: "RealTrust & ApArt Hotel",
  legalName: "Imo Business Centrum SRL",
  alternateNames: ["ApArt Hotel Timișoara", "RealTrust Imobiliare"],
  telephone: "+40799069256",
  email: "info@realtrust.ro",
  logo: `${SITE_ORIGIN}/images/hero-optimized-800w.webp`,
  image: `${SITE_ORIGIN}/images/hero-optimized-1920w.webp`,
  url: SITE_ORIGIN,
  foundingDate: "2001",
  address: {
    streetAddress: "Strada Samuel Clain Micu Nr.14, ap.4",
    addressLocality: "Timișoara",
    addressRegion: "Timiș",
    postalCode: "300125",
    addressCountry: "RO",
  },
  geo: {
    latitude: 45.7489,
    longitude: 21.2087,
  },
  sameAs: [
    "https://www.facebook.com/realtrust.ro",
    "https://www.instagram.com/realtrust_timisoara",
    "https://www.booking.com",
  ],
} as const;

const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: BRAND.address.streetAddress,
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
  alternateName: BRAND.alternateNames,
  url: BRAND.url,
  logo: {
    "@type": "ImageObject",
    url: BRAND.logo,
    width: 800,
    height: 450,
  },
  image: BRAND.image,
  email: BRAND.email,
  telephone: BRAND.telephone,
  foundingDate: BRAND.foundingDate,
  address: POSTAL_ADDRESS,
  areaServed: { "@type": "City", name: "Timișoara" },
  sameAs: [...BRAND.sameAs],
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
  name: "RealTrust / Trust Estate",
  alternateName: "RealTrust - Servicii Imobiliare Timișoara",
  description:
    "Firmă de property management și investiții imobiliare în Timișoara. Operăm ApArt Hotel și oferim consultanță financiară pentru ansambluri rezidențiale premium.",
  url: BRAND.url,
  logo: BRAND.logo,
  image: BRAND.image,
  telephone: BRAND.telephone,
  email: BRAND.email,
  priceRange: "$$$",
  currenciesAccepted: "EUR, RON",
  paymentAccepted: "Cash, Credit Card, Bank Transfer",
  openingHours: "Mo-Fr 10:00-18:00",
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
    "Analiză de randament, due diligence și structurare de portofoliu pentru apartamente în regim hotelier în Timișoara. Randament net țintă 9,4% (ocupare 75%, deducere 27%).",
  url: `${SITE_ORIGIN}/investitii`,
  logo: BRAND.logo,
  image: BRAND.image,
  telephone: BRAND.telephone,
  email: BRAND.email,
  priceRange: "$$$",
  currenciesAccepted: "EUR, RON",
  paymentAccepted: "Cash, Credit Card, Bank Transfer",
  openingHours: "Mo-Fr 10:00-18:00",
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
          name: "Analiză ROI apartament",
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
