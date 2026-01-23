import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  publishedTime?: string;
  author?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
  // Article specific
  articleTags?: string[];
  articleCategory?: string;
  // Product specific (for properties)
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: "InStock" | "OutOfStock" | "PreOrder";
  // FAQ specific
  faqItems?: Array<{ question: string; answer: string }>;
  // Breadcrumb
  breadcrumbItems?: Array<{ name: string; url: string }>;
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
      "url": "https://realtrustaparthotel.lovable.app/favicon.ico",
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
  "@type": "Product",
  "name": name,
  "description": description,
  "image": image,
  "url": url,
  "brand": {
    "@type": "Brand",
    "name": "ApArt Hotel Timișoara",
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": currency,
    "price": price || 0,
    "availability": `https://schema.org/${availability}`,
    "url": url,
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "150",
  },
});

// Helper to generate FAQ JSON-LD
const generateFaqJsonLd = (faqItems: Array<{ question: string; answer: string }>) => ({
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

const SEOHead = ({
  title,
  description,
  image = "https://realtrustaparthotel.lovable.app/og-image.jpg",
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
}: SEOHeadProps) => {
  const { language } = useLanguage();
  
  const defaultTitles = {
    ro: "RealTrust & ApArt Hotel Timișoara | Administrare Premium în Regim Hotelier",
    en: "RealTrust & ApArt Hotel Timișoara | Premium Short-Term Rental Management"
  };
  
  const defaultDescriptions = {
    ro: "Maximizează venitul din apartamentul tău în Timișoara. Administrare profesională în regim hotelier cu rată de ocupare de 98%. Evaluare gratuită!",
    en: "Maximize your apartment income in Timișoara. Professional short-term rental management with 98% occupancy rate. Free evaluation!"
  };
  
  const finalTitle = title || defaultTitles[language as keyof typeof defaultTitles] || defaultTitles.ro;
  const finalDescription = description || defaultDescriptions[language as keyof typeof defaultDescriptions] || defaultDescriptions.ro;
  const finalUrl = url || (typeof window !== "undefined" ? window.location.href : "https://realtrustaparthotel.lovable.app");
  
  // Default JSON-LD for LocalBusiness
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "RealTrust & ApArt Hotel Timișoara",
    "image": image,
    "description": finalDescription,
    "@id": "https://realtrustaparthotel.lovable.app",
    "url": "https://realtrustaparthotel.lovable.app",
    "telephone": "+40723154520",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "addressCountry": "RO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 45.7489,
      "longitude": 21.2087
    },
    "priceRange": "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "150"
    }
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
    
    // Add FAQ schema if faqItems provided
    if (faqItems && faqItems.length > 0) {
      schemas.push(generateFaqJsonLd(faqItems));
    }
    
    // Add Breadcrumb schema if breadcrumbItems provided
    if (breadcrumbItems && breadcrumbItems.length > 0) {
      schemas.push(generateBreadcrumbJsonLd(breadcrumbItems));
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
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={language === "ro" ? "ro_RO" : "en_US"} />
      <meta property="og:site_name" content="RealTrust & ApArt Hotel" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      
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
