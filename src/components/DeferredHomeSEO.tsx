import SEOHead from "@/components/SEOHead";
import { generateHomepageSchemas, generateFAQSchema, generateSpeakableSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const DeferredHomeSEO = ({ language }: { language: string }) => {
  const { data: reviews } = useQuery({
    queryKey: ["homepage-reviews-schema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("id, guest_name, rating, content, title, created_at, property_id, properties:property_id (name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id, guest_name: r.guest_name, rating: r.rating, content: r.content,
        title: r.title, created_at: r.created_at,
        property_name: (r.properties as { name: string } | null)?.name,
      })) as DatabaseReview[];
    },
    staleTime: Infinity, gcTime: Infinity,
    refetchOnWindowFocus: false, refetchOnMount: false, refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  });

  // Fetch real aggregate rating from DB
  const { data: ratingData } = useQuery({
    queryKey: ["homepage-aggregate-rating"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("rating")
        .eq("is_published", true);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
      // Booking.com uses 1-10 scale; convert to 1-5 for schema.org
      const avgNormalized = avg > 5 ? (avg / 2).toFixed(1) : avg.toFixed(1);
      return { ratingValue: avgNormalized, reviewCount: String(data.length) };
    },
    staleTime: Infinity, gcTime: Infinity,
    refetchOnWindowFocus: false, refetchOnMount: false, refetchOnReconnect: false,
  });

  const faqSchema = generateFAQSchema([
    { question: language === "ro" ? "Care este profitul real pe care îl pot obține din apartamentul meu?" : "What is the real profit I can get from my apartment?",
      answer: language === "ro" ? "Estimăm veniturile pe baza datelor de piață actuale, unde un preț mediu pe noapte (ADR) este de aproximativ 55€, cu o rată de ocupare medie de 65%." : "We estimate revenues based on current market data, where the average nightly rate (ADR) is approximately €55, with an average occupancy rate of 65%." },
    { question: language === "ro" ? "Ce servicii sunt incluse în comisionul de management?" : "What services are included in the management fee?",
      answer: language === "ro" ? "Oferim un pachet complet care include administrarea rezervărilor pe toate platformele (Airbnb, Booking), comunicarea cu oaspeții și coordonarea curățeniei." : "We offer a complete package that includes booking management across all platforms (Airbnb, Booking), guest communication, and cleaning coordination." },
    { question: language === "ro" ? "Cum asigurați transparența veniturilor și a costurilor?" : "How do you ensure transparency of revenues and costs?",
      answer: language === "ro" ? "Proprietarii primesc rapoarte lunare detaliate, unde comisioanele sunt explicate clar (15-25% comision management + 15-23% comision platforme)." : "Owners receive detailed monthly reports, where commissions are clearly explained (15-25% management fee + 15-23% platform fee)." },
  ]);
  const speakableSchema = generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://www.realtrust.ro", [".page-summary", "h1", "h2", ".faq-section"]);
  const homepageSchemas = [...generateHomepageSchemas(reviews), faqSchema, speakableSchema];

  // Inject real AggregateRating into the first schema (LocalBusiness/LodgingBusiness)
  if (ratingData && homepageSchemas.length > 0) {
    const mainSchema = homepageSchemas[0] as Record<string, unknown>;
    mainSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": ratingData.ratingValue,
      "reviewCount": ratingData.reviewCount,
      "bestRating": "5",
      "worstRating": "1",
    };
  }

  // Add LodgingBusiness + LocalBusiness combined schema (Fix 3A)
  const lodgingBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "LocalBusiness"],
    "name": "RealTrust & ApArt Hotel Timișoara",
    "description": "Administrare apartamente în regim hotelier în Timișoara. ROI 9.4% net verificat, 60+ proprietăți, rating 9.7 Booking.com.",
    "url": "https://www.realtrust.ro",
    "telephone": "+40723154520",
    "email": "info@realtrust.ro",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
      "addressLocality": "Timișoara",
      "postalCode": "300125",
      "addressCountry": "RO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 45.7489,
      "longitude": 21.2087
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "9.7",
      "reviewCount": "500",
      "bestRating": "10"
    },
    "priceRange": "€€",
    "currenciesAccepted": "EUR",
    "openingHours": "Mo-Su 00:00-24:00",
    "sameAs": [
      "https://www.facebook.com/realtrust.ro",
      "https://www.booking.com"
    ]
  };

  const allSchemas = [...homepageSchemas, lodgingBusinessSchema];

  return (
    <SEOHead
      description="RealTrust & ApArt Hotel Timișoara — administrare apartamente regim hotelier. ROI 9.4% net verificat, 60+ proprietăți gestionate, rating 9.7 Booking.com. Află cât câștigă apartamentul tău."
      jsonLd={allSchemas}
      includeWebSiteSchema={true}
    />
  );
};

export default DeferredHomeSEO;
