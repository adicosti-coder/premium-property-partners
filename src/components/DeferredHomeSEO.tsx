import { Helmet } from "react-helmet-async";
import { BRAND } from "@/lib/orgIdentity";
import { generateHomepageSchemas, generateSpeakableSchema, DatabaseReview } from "@/utils/schemaGenerators";

import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const DeferredHomeSEO = ({ language }: { language: string }) => {
  const { data: reviews } = useQuery({
    queryKey: ["homepage-reviews-schema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_property_reviews");
      if (error) throw error;
      const top = (data || [])
        .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10);
      const propIds = Array.from(new Set(top.map((r: any) => r.property_id).filter(Boolean)));
      let nameById = new Map<string, string>();
      if (propIds.length) {
        const { data: props } = await supabase.from("properties").select("id, name").in("id", propIds);
        (props || []).forEach((p: any) => nameById.set(p.id, p.name));
      }
      return top.map((r: any) => ({
        id: r.id, guest_name: r.guest_name, rating: r.rating, content: r.content,
        title: r.title, created_at: r.created_at,
        property_name: nameById.get(r.property_id),
      })) as DatabaseReview[];
    },
    staleTime: Infinity, gcTime: Infinity,
    refetchOnWindowFocus: false, refetchOnMount: false, refetchOnReconnect: false,
  });

  // Derive aggregate rating from the already limited review sample to avoid a second heavy query on homepage.
  const { data: ratingData } = useQuery({
    queryKey: ["homepage-aggregate-rating"],
    queryFn: async () => null,
    staleTime: Infinity, gcTime: Infinity,
    refetchOnWindowFocus: false, refetchOnMount: false, refetchOnReconnect: false,
    enabled: false,
    initialData: (() => {
      if (!reviews?.length) return null;
      const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      const avgNormalized = avg > 5 ? (avg / 2).toFixed(1) : avg.toFixed(1);
      return { ratingValue: avgNormalized, reviewCount: String(reviews.length) };
    })(),
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
    { question: language === "ro" ? "Care sunt prețurile apartamentelor noi din Timișoara în 2026?" : "What are the prices of new apartments in Timișoara in 2026?",
      answer: language === "ro" ? "Apartamente noi Timișoara prețuri 2026: garsoniere de la 65.000€, 2 camere între 95.000–145.000€, 3 camere între 140.000–220.000€. Ansamblurile premium (ISHO, Openville, Take Ionescu) pornesc de la 1.800€/mp, iar zonele emergente (Calea Aradului, Girocului) de la 1.400€/mp." : "New apartment prices in Timișoara 2026: studios from €65,000, 2-room from €95,000–145,000, 3-room from €140,000–220,000. Premium developments (ISHO, Openville, Take Ionescu) start at €1,800/sqm, emerging areas (Calea Aradului, Girocului) from €1,400/sqm." },
    { question: language === "ro" ? "Ce păreri au clienții despre agenția imobiliară RealTrust Timișoara?" : "What do clients say about RealTrust real estate agency Timișoara?",
      answer: language === "ro" ? "Agenție imobiliară Timișoara păreri RealTrust: scor consolidat 9.7/10 din peste 180 recenzii verificate (Booking, Airbnb, Google). Clienții apreciază transparența comisioanelor, comunicarea promptă și rezultatele financiare predictibile pentru proprietari." : "RealTrust real estate agency Timișoara reviews: consolidated 9.7/10 score from over 180 verified reviews (Booking, Airbnb, Google). Clients value commission transparency, prompt communication and predictable financial results for owners." },
    { question: language === "ro" ? "Aveți apartamente de închiriat aproape de UPT Politehnica Timișoara?" : "Do you have apartments for rent near UPT Politehnica Timișoara?",
      answer: language === "ro" ? "Da — apartamente de închiriat lângă UPT Timișoara în Complex Studențesc, la 3-7 minute pe jos de Politehnica Timișoara, UVT și UMF. Garsoniere de la 280€/lună, 2 camere 380-550€/lună, contracte pe an universitar pentru studenți români și Erasmus." : "Yes — apartments for rent near UPT Timișoara in Complex Studențesc, 3-7 min walk from Politehnica, UVT and UMF. Studios from €280/month, 2-room €380-550/month, academic year contracts for Romanian and Erasmus students." },
  ];

  // Register FAQ items via centralized context instead of inline FAQPage schema
  useRegisterFAQs("homepage", homepageFaqItems);

  const speakableSchema = generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://realtrust.ro", [".page-summary", "h1", "h2", ".faq-section"]);
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
    mainSchema.sameAs = [...BRAND.sameAs];
    mainSchema.openingHours = "Mo-Su 00:00-24:00";
    mainSchema.currenciesAccepted = "EUR";
    mainSchema.priceRange = "€€";
  }

  // RealEstateAgent & Organization schemas are now injected globally by
  // SEOHead.tsx on every page. DeferredHomeSEO only injects homepage-specific
  // schemas (aggregate rating, FAQ, speakable, WebSite SearchAction).
  const allSchemas = [...homepageSchemas];


  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(allSchemas)}</script>
    </Helmet>
  );
};

export default DeferredHomeSEO;
