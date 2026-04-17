import SEOHead from "@/components/SEOHead";
import { generateHomepageSchemas, generateSpeakableSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
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

  const homepageFaqItems = [
    { question: language === "ro" ? "Care este profitul real pe care îl pot obține din apartamentul meu?" : "What is the real profit I can get from my apartment?",
      answer: language === "ro" ? "Estimăm veniturile pe baza datelor de piață actuale, unde un preț mediu pe noapte (ADR) este de aproximativ 55€, cu o rată de ocupare medie de 65%." : "We estimate revenues based on current market data, where the average nightly rate (ADR) is approximately €55, with an average occupancy rate of 65%." },
    { question: language === "ro" ? "Ce servicii sunt incluse în comisionul de management?" : "What services are included in the management fee?",
      answer: language === "ro" ? "Oferim un pachet complet care include administrarea rezervărilor pe toate platformele (Airbnb, Booking), comunicarea cu oaspeții și coordonarea curățeniei." : "We offer a complete package that includes booking management across all platforms (Airbnb, Booking), guest communication, and cleaning coordination." },
    { question: language === "ro" ? "Cum asigurați transparența veniturilor și a costurilor?" : "How do you ensure transparency of revenues and costs?",
      answer: language === "ro" ? "Proprietarii primesc rapoarte lunare detaliate, unde comisioanele sunt explicate clar (15-25% comision management + 15-23% comision platforme)." : "Owners receive detailed monthly reports, where commissions are clearly explained (15-25% management fee + 15-23% platform fee)." },
  ];

  // Register FAQ items via centralized context instead of inline FAQPage schema
  useRegisterFAQs("homepage", homepageFaqItems);

  const speakableSchema = generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://www.realtrust.ro", [".page-summary", "h1", "h2", ".faq-section"]);
  const homepageSchemas = [...generateHomepageSchemas(reviews), speakableSchema];

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

  // LodgingBusiness data is already in homepageSchemas[0] via generateHomepageSchemas
  // Add sameAs and openingHours to the main schema instead of duplicating
  if (homepageSchemas.length > 0) {
    const mainSchema = homepageSchemas[0] as Record<string, unknown>;
    mainSchema.sameAs = [
      "https://www.facebook.com/realtrust.ro",
      "https://www.booking.com"
    ];
    mainSchema.openingHours = "Mo-Su 00:00-24:00";
    mainSchema.currenciesAccepted = "EUR";
    mainSchema.priceRange = "€€";
  }

  // Organization schema (separate from LocalBusiness — recommended by SEO audit)
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RealTrust & ApArt Hotel",
    "legalName": "RealTrust Imobiliare SRL",
    "url": "https://www.realtrust.ro",
    "logo": "https://www.realtrust.ro/images/hero-optimized-800w.webp",
    "email": "info@realtrust.ro",
    "telephone": "+40723154520",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "postalCode": "300125",
      "addressCountry": "RO",
    },
    "areaServed": {
      "@type": "City",
      "name": "Timișoara",
    },
    "sameAs": [
      "https://www.facebook.com/realtrust.ro",
      "https://www.booking.com",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+40723154520",
      "contactType": "customer service",
      "areaServed": "RO",
      "availableLanguage": ["Romanian", "English"],
    },
  };

  const allSchemas = [...homepageSchemas, organizationSchema];

  return (
    <SEOHead
      description="Administrare apartamente regim hotelier în Timișoara cu ROI 9.4% net. 60+ proprietăți, rating 9.7 Booking. Calculează-ți câștigul gratuit!"
      jsonLd={allSchemas}
      includeWebSiteSchema={true}
    />
  );
};

export default DeferredHomeSEO;
