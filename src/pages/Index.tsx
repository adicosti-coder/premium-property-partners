import { useEffect, lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SEOHead from "@/components/SEOHead";
import { generateHomepageSchemas, generateFAQSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useSessionAnalytics, useConversionFunnel } from "@/hooks/useSessionAnalytics";

// Lazy load below-fold components to reduce initial bundle & main thread work
const QuickLeadForm = lazy(() => import("@/components/QuickLeadForm"));
const PartnerLogos = lazy(() => import("@/components/PartnerLogos"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const CTA = lazy(() => import("@/components/CTA"));
const Footer = lazy(() => import("@/components/Footer"));
const BlogPreview = lazy(() => import("@/components/BlogPreview"));

const ReferralBanner = lazy(() => import("@/components/ReferralBanner"));
const InvestorGuideButton = lazy(() => import("@/components/InvestorGuideButton"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const BookingReviewsWidget = lazy(() => import("@/components/BookingReviewsWidget"));
const ExternalTrustSeals = lazy(() => import("@/components/ExternalTrustSeals"));

// Hub Teaser Components
const MainNavigationCards = lazy(() => import("@/components/hub/MainNavigationCards"));
const OwnersTeaser = lazy(() => import("@/components/hub/OwnersTeaser"));
const GuestsTeaser = lazy(() => import("@/components/hub/GuestsTeaser"));
const AboutTeaser = lazy(() => import("@/components/hub/AboutTeaser"));

const Index = () => {
  const { t, language } = useLanguage();
  
  // Session analytics
  const { trackElementView } = useSessionAnalytics();
  const { trackFunnelStep, trackFunnelComplete } = useConversionFunnel("homepage_journey");

  // Track key sections viewed
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              trackElementView(sectionId, "section");
              
              // Funnel steps
              const funnelSteps: Record<string, number> = {
                "beneficii": 1,
                "calculator": 2,
                "portofoliu": 3,
              };
              if (funnelSteps[sectionId]) {
                trackFunnelStep(sectionId, funnelSteps[sectionId]);
              }
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe key sections
    ["beneficii", "calculator", "portofoliu", "oaspeti-preview"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [trackElementView, trackFunnelStep]);
  
  // Fetch published reviews for Schema.org
  const { data: reviews } = useQuery({
    queryKey: ["homepage-reviews-schema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select(`
          id,
          guest_name,
          rating,
          content,
          title,
          created_at,
          property_id,
          properties:property_id (name)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return (data || []).map((review) => ({
        id: review.id,
        guest_name: review.guest_name,
        rating: review.rating,
        content: review.content,
        title: review.title,
        created_at: review.created_at,
        property_name: (review.properties as { name: string } | null)?.name,
      })) as DatabaseReview[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  });
  
  // Generate FAQ schema with the updated premium questions
  const faqSchema = generateFAQSchema([
    { 
      question: language === "ro" 
        ? "Care este profitul real pe care îl pot obține din apartamentul meu?" 
        : "What is the real profit I can get from my apartment?",
      answer: language === "ro"
        ? "Estimăm veniturile pe baza datelor de piață actuale, unde un preț mediu pe noapte (ADR) este de aproximativ 55€, cu o rată de ocupare medie de 65%. Prin strategiile noastre de optimizare, vizăm un ROI brut de 10% pentru proprietăți cu locații strategice."
        : "We estimate revenues based on current market data, where the average nightly rate (ADR) is approximately €55, with an average occupancy rate of 65%. Through our optimization strategies, we target a gross ROI of 10% for properties with strategic locations."
    },
    {
      question: language === "ro" 
        ? "Ce servicii sunt incluse în comisionul de management?" 
        : "What services are included in the management fee?",
      answer: language === "ro"
        ? "Oferim un pachet complet care include administrarea rezervărilor pe toate platformele (Airbnb, Booking), comunicarea cu oaspeții și coordonarea curățeniei. Implementăm soluții de Self Check-in digitalizat și monitorizare activă a proprietății."
        : "We offer a complete package that includes booking management across all platforms (Airbnb, Booking), guest communication, and cleaning coordination. We implement digital Self Check-in solutions and active property monitoring."
    },
    {
      question: language === "ro" 
        ? "Cum asigurați transparența veniturilor și a costurilor?" 
        : "How do you ensure transparency of revenues and costs?",
      answer: language === "ro"
        ? "Proprietarii primesc rapoarte lunare detaliate, unde comisioanele sunt explicate clar (15-20% comision management + 15-23% comision platforme). Modelul nostru bazat pe comision ne motivează să maximizăm gradul tău de ocupare."
        : "Owners receive detailed monthly reports, where commissions are clearly explained (15-20% management fee + 15-23% platform fee). Our commission-based model motivates us to maximize your occupancy rate."
    },
  ]);
  
  const homepageSchemas = [
    ...generateHomepageSchemas(reviews),
    faqSchema,
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead jsonLd={homepageSchemas} includeWebSiteSchema={true} />
      <Header />
      <main>
        {/* Hero - Entry Point (above-fold, eager) */}
        <Hero />
        
        {/* Below-fold: lazy loaded */}
        <Suspense fallback={null}>
          {/* Property Portfolio - moved before Calculator */}
          <section id="portofoliu">
            <PropertyGallery />
          </section>

          {/* Calculator */}
          <section id="calculator">
            <ProfitCalculator />
          </section>

          {/* Quick Lead Capture */}
          <QuickLeadForm />

          {/* Main Navigation Cards - Hub Navigation */}
          <MainNavigationCards />
          
          {/* Trust Elements */}
          <PartnerLogos />
          <TrustBadges />
        
        {/* Owners Teaser Section */}
        <section id="beneficii">
          <OwnersTeaser />
        </section>
        
        {/* Guests Teaser Section with Property Preview */}
        <section id="oaspeti-preview">
          <GuestsTeaser />
        </section>
        
        {/* Social Proof */}
        <Testimonials />
        
        {/* Booking.com Reviews Widget */}
        <BookingReviewsWidget />
        
        {/* External Trust Seals */}
        <ExternalTrustSeals />
        
        {/* About Teaser */}
        <AboutTeaser />
        
        {/* Blog Preview */}
        <BlogPreview />
        
        {/* Investor Guide CTA */}
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              {language === "ro" ? "Investește Inteligent în Timișoara" : "Invest Smart in Timișoara"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {language === "ro" 
                ? "Descarcă ghidul nostru gratuit cu analize de piață, randamente reale și strategii de maximizare a profitului pentru 2026."
                : "Download our free guide with market analysis, real yields, and profit maximization strategies for 2026."}
            </p>
            <InvestorGuideButton size="lg" className="px-8 py-6 text-lg" />
          </div>
        </section>
        
        {/* Referral Banner */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            <ReferralBanner variant="hero" />
          </div>
        </section>
        
        {/* FAQ - Keep for SEO */}
        <FAQ />
        
        {/* Contact */}
        <ContactSection />
        
        {/* Final CTA */}
        <CTA />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default Index;
