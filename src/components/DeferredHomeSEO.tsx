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

  const faqSchema = generateFAQSchema([
    { question: language === "ro" ? "Care este profitul real pe care îl pot obține din apartamentul meu?" : "What is the real profit I can get from my apartment?",
      answer: language === "ro" ? "Estimăm veniturile pe baza datelor de piață actuale, unde un preț mediu pe noapte (ADR) este de aproximativ 55€, cu o rată de ocupare medie de 65%." : "We estimate revenues based on current market data, where the average nightly rate (ADR) is approximately €55, with an average occupancy rate of 65%." },
    { question: language === "ro" ? "Ce servicii sunt incluse în comisionul de management?" : "What services are included in the management fee?",
      answer: language === "ro" ? "Oferim un pachet complet care include administrarea rezervărilor pe toate platformele (Airbnb, Booking), comunicarea cu oaspeții și coordonarea curățeniei." : "We offer a complete package that includes booking management across all platforms (Airbnb, Booking), guest communication, and cleaning coordination." },
    { question: language === "ro" ? "Cum asigurați transparența veniturilor și a costurilor?" : "How do you ensure transparency of revenues and costs?",
      answer: language === "ro" ? "Proprietarii primesc rapoarte lunare detaliate, unde comisioanele sunt explicate clar (15-20% comision management + 15-23% comision platforme)." : "Owners receive detailed monthly reports, where commissions are clearly explained (15-20% management fee + 15-23% platform fee)." },
  ]);
  const speakableSchema = generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://realtrust.ro", [".page-summary", "h1", "h2", ".faq-section"]);
  const homepageSchemas = [...generateHomepageSchemas(reviews), faqSchema, speakableSchema];

  return <SEOHead jsonLd={homepageSchemas} includeWebSiteSchema={true} />;
};

export default DeferredHomeSEO;
