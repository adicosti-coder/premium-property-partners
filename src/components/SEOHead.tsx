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
}

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
  
  const finalJsonLd = jsonLd || defaultJsonLd;

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
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
