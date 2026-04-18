import SEOHead from "@/components/SEOHead";
import { generateHomepageSchemas, generateSpeakableSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const HOMEPAGE_SEO = {
  ro: {
    title: "RealTrust Timișoara | Imobiliare & Regim Hotelier | ROI Garantat",
    description:
      "Apartamente de vânzare, închiriere și regim hotelier în Timișoara, lângă UVT, Iulius Town și Aeroport. Calculează ROI gratuit și investește inteligent azi!",
  },
  en: {
    title: "RealTrust Timișoara | Real Estate, Short-Term Rentals & ROI",
    description:
      "Short-term rental apartments and real estate investments in Timișoara, near Timișoara Airport, UVT and Iulius Town. Calculate ROI free.",
  },
} as const;

const DeferredHomeSEO = ({ language }: { language: string }) => {
  const homepageSeo = HOMEPAGE_SEO[language as keyof typeof HOMEPAGE_SEO] || HOMEPAGE_SEO.ro;
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
    { question: language === "ro" ? "Cât durează procesul de administrare a unui apartament în regim hotelier?" : "How long does the process of managing an apartment in hotel regime take?",
      answer: language === "ro" ? "Onboarding-ul complet durează 7-14 zile: evaluare proprietate, fotografie profesională, listare pe Booking & Airbnb, configurare sistem de check-in. Apoi administrarea este continuă și 100% gestionată de echipa RealTrust." : "Full onboarding takes 7-14 days: property evaluation, professional photography, listing on Booking & Airbnb, check-in system setup. Then management is continuous and 100% handled by the RealTrust team." },
    { question: language === "ro" ? "Care sunt costurile reale de administrare a unui apartament în regim hotelier Timișoara?" : "What are the real costs of managing a hotel-regime apartment in Timișoara?",
      answer: language === "ro" ? "Costurile sunt transparente: 15-25% comision management RealTrust + 15-23% comision platforme (Booking, Airbnb) + curățenie (35-50€/sejur, recuperată de la oaspete). Fără costuri ascunse, fără taxă de setup." : "Costs are transparent: 15-25% RealTrust management fee + 15-23% platform fees (Booking, Airbnb) + cleaning (€35-50/stay, recovered from guest). No hidden costs, no setup fee." },
    { question: language === "ro" ? "Ce cartiere din Timișoara sunt cele mai profitabile pentru investiții imobiliare?" : "Which neighborhoods in Timișoara are most profitable for real estate investments?",
      answer: language === "ro" ? "Cele mai profitabile cartiere pentru regim hotelier sunt: Cetate / Centrul Vechi (ocupare 75-85%), Complex Studențesc (cerere constantă de la UVT, UPT, UMF), ISHO (premium, ADR ridicat) și Iosefin (mix turism + business). ROI net 8-10% verificat." : "The most profitable neighborhoods for hotel regime are: Cetate / Old Town (75-85% occupancy), Complex Studențesc (constant demand from UVT, UPT, UMF), ISHO (premium, high ADR) and Iosefin (tourism + business mix). Net ROI 8-10% verified." },
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
      title={homepageSeo.title}
      description={homepageSeo.description}
      jsonLd={allSchemas}
    />
  );
};

export default DeferredHomeSEO;
