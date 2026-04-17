import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";

const BASE_URL = "https://www.realtrust.ro";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: "website" | "article" | "product";
  publishedTime?: string;
  author?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  // Article specific
  articleTags?: string[];
  articleCategory?: string;
  // Product specific (for properties)
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: "InStock" | "OutOfStock" | "PreOrder";
  // FAQ specific
  /** @deprecated Use useRegisterFAQs() hook instead — kept for backward compat, items are ignored */
  faqItems?: Array<{ question: string; answer: string }>;
  // Breadcrumb
  breadcrumbItems?: Array<{ name: string; url: string }>;
  // Enable WebSite schema with SearchAction (for homepage)
  includeWebSiteSchema?: boolean;
}

// Helper to generate Article JSON-LD
const generateArticleJsonLd = (
  title: string,
  description: string,
  image: string,
  url: string,
  publishedTime?: string,
  author?: string,
  tags?: string[],
  category?: string
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": description,
  "image": image,
  "url": url,
  "datePublished": publishedTime,
  "author": {
    "@type": "Person",
    "name": author || "RealTrust Team",
  },
  "publisher": {
    "@type": "Organization",
    "name": "RealTrust & ApArt Hotel",
    "logo": {
      "@type": "ImageObject",
      "url": `${BASE_URL}/images/hero-optimized-800w.webp`,
      "width": 800,
      "height": 450,
    },
  },
  ...(tags && tags.length > 0 && { "keywords": tags.join(", ") }),
  ...(category && { "articleSection": category }),
});

// Helper to generate Product JSON-LD (for properties)
const generateProductJsonLd = (
  name: string,
  description: string,
  image: string,
  url: string,
  price?: number,
  currency: string = "EUR",
  availability: string = "InStock"
) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "name": name,
  "description": description,
  "image": image,
  "url": url,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
    "addressLocality": "Timișoara",
    "addressRegion": "Timiș",
    "postalCode": "300125",
    "addressCountry": "RO",
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": currency,
    "price": price || 0,
    "availability": `https://schema.org/${availability}`,
    "url": url,
  },
  // AggregateRating removed — injected dynamically with real DB values when available
});

// FAQ schema is now handled centrally by FAQSchemaProvider (useFAQSchema.tsx)
// generateFaqJsonLd was removed to prevent duplicate FAQPage blocks

// Helper to generate Breadcrumb JSON-LD
const generateBreadcrumbJsonLd = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url,
  })),
});

// Helper to generate WebSite schema with SearchAction
const generateWebSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "RealTrust & ApArt Hotel Timișoara",
  "alternateName": "RealTrust",
  "url": BASE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/oaspeti?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  "inLanguage": ["ro-RO", "en-US"],
});

const SEOHead = ({
  title,
  description,
  image = `${BASE_URL}/images/hero-optimized-1920w.webp`,
  imageAlt,
  url,
  type = "website",
  publishedTime,
  author,
  noIndex = false,
  jsonLd,
  articleTags,
  articleCategory,
  productPrice,
  productCurrency = "EUR",
  productAvailability = "InStock",
  faqItems,
  breadcrumbItems,
  includeWebSiteSchema = false,
}: SEOHeadProps) => {
  const { language } = useLanguage();
  
  const defaultTitles = {
    ro: "RealTrust Timișoara: Imobiliare & Regim Hotelier Profitabil",
    en: "RealTrust Timișoara: Real Estate & Profitable Short-Term Rentals"
  };
  
  const defaultDescriptions = {
    ro: "Apartamente regim hotelier Timișoara — Centru, Iosefin, Fabric, ISHO, Complex Studențesc, lângă UVT și Iulius Town. ROI 9.4% net verificat.",
    en: "Short-term rental apartments Timișoara — Old Town, Iosefin, Fabric, ISHO, Student Complex, near UVT and Iulius Town. 9.4% net verified ROI."
  };
  
  const finalTitle = title || defaultTitles[language as keyof typeof defaultTitles] || defaultTitles.ro;
  const finalDescription = description || defaultDescriptions[language as keyof typeof defaultDescriptions] || defaultDescriptions.ro;
  
  // Canonical URL: ALWAYS absolute on www.realtrust.ro, pathname only (NO query params, NO hash, NO trailing slash except root).
  // This ensures Google indexes one version per page regardless of ?lang, ?utm_*, ?id, filters, etc.
  const buildCanonical = (): string => {
    let pathname: string;
    if (url) {
      try {
        // If a full URL is provided, extract just the pathname.
        const parsed = new URL(url, BASE_URL);
        pathname = parsed.pathname;
      } catch {
        pathname = url.startsWith("/") ? url.split("?")[0].split("#")[0] : "/";
      }
    } else if (typeof window !== "undefined") {
      pathname = window.location.pathname;
    } else {
      pathname = "/";
    }
    // Normalize: collapse duplicate slashes, strip trailing slash (except root)
    pathname = pathname.replace(/\/{2,}/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    return `${BASE_URL}${pathname}`;
  };
  const finalUrl = buildCanonical();

  // Hreflang alternates — language is a client-side state (LanguageContext), not a URL segment.
  // Both RO and EN share the same canonical pathname; we signal language equivalence to Google.
  const getAlternateUrl = (lang: string) => {
    if (lang === "ro") return finalUrl;
    return `${finalUrl}?lang=${lang}`;
  };
  
  // Default JSON-LD for LocalBusiness (AggregateRating injected dynamically on homepage)
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "RealTrust & ApArt Hotel Timișoara",
    "image": image,
    "description": finalDescription,
    "@id": BASE_URL,
    "url": BASE_URL,
    "telephone": "+40723154520",
    "email": "info@realtrust.ro",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "postalCode": "300125",
      "addressCountry": "RO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 45.7489,
      "longitude": 21.2087
    },
    "priceRange": "$$"
  };
  
  // Determine which JSON-LD to use based on type
  let finalJsonLd: Record<string, unknown> | Record<string, unknown>[] = jsonLd || defaultJsonLd;
  if (!jsonLd) {
    const schemas: Record<string, unknown>[] = [defaultJsonLd];
    
    // Add Article schema if type is article
    if (type === "article") {
      schemas.push(
        generateArticleJsonLd(
          finalTitle,
          finalDescription,
          image,
          finalUrl,
          publishedTime,
          author,
          articleTags,
          articleCategory
        )
      );
    }
    
    // Add Product schema if type is product
    if (type === "product") {
      schemas.push(
        generateProductJsonLd(
          finalTitle,
          finalDescription,
          image,
          finalUrl,
          productPrice,
          productCurrency,
          productAvailability
        )
      );
    }
    
    // FAQ schema is now handled by the centralized FAQSchemaProvider (useFAQSchema.tsx)
    // Do NOT inject inline FAQPage here — it causes duplicate structured data
    
    // Add Breadcrumb schema if breadcrumbItems provided
    if (breadcrumbItems && breadcrumbItems.length > 0) {
      schemas.push(generateBreadcrumbJsonLd(breadcrumbItems));
    }
    
    // Add WebSite schema with SearchAction if enabled
    if (includeWebSiteSchema) {
      schemas.push(generateWebSiteJsonLd());
    }
    
    finalJsonLd = schemas.length === 1 ? schemas[0] : schemas;
  }

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={finalUrl} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <html lang={language} />
      
      {/* Hreflang for multilingual support */}
      <link rel="alternate" hrefLang="ro" href={getAlternateUrl("ro")} />
      <link rel="alternate" hrefLang="en" href={getAlternateUrl("en")} />
      <link rel="alternate" hrefLang="x-default" href={getAlternateUrl("ro")} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt || finalTitle} />
      <meta property="og:locale" content={language === "ro" ? "ro_RO" : "en_US"} />
      <meta property="og:locale:alternate" content={language === "ro" ? "en_US" : "ro_RO"} />
      <meta property="og:site_name" content="RealTrust & ApArt Hotel" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt || finalTitle} />
      
      {/* Article specific */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && articleTags && articleTags.length > 0 && (
        <meta property="article:tag" content={articleTags.join(",")} />
      )}
      
      {/* Product specific */}
      {type === "product" && productPrice && (
        <>
          <meta property="product:price:amount" content={String(productPrice)} />
          <meta property="product:price:currency" content={productCurrency} />
        </>
      )}
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
