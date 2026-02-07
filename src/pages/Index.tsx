import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import QuickLeadForm from "@/components/QuickLeadForm";
import PartnerLogos from "@/components/PartnerLogos";
import TrustBadges from "@/components/TrustBadges";
import ProfitCalculator from "@/components/ProfitCalculator";
import PropertyGallery from "@/components/PropertyGallery";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import BlogPreview from "@/components/BlogPreview";
import QuickStatsBar from "@/components/QuickStatsBar";
import ReferralBanner from "@/components/ReferralBanner";
import SEOHead from "@/components/SEOHead";
import InvestorGuideButton from "@/components/InvestorGuideButton";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import { generateHomepageSchemas, generateFAQSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useSessionAnalytics, useConversionFunnel } from "@/hooks/useSessionAnalytics";

// Hub Teaser Components
import ServicesOverview from "@/components/hub/ServicesOverview";
import OwnersTeaser from "@/components/hub/OwnersTeaser";
import GuestsTeaser from "@/components/hub/GuestsTeaser";
import AboutTeaser from "@/components/hub/AboutTeaser";

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
  
  // Generate FAQ schema with Market Insights questions for AI visibility
  const faqSchema = generateFAQSchema([
    // Market Insights - optimized for AI visibility
    { 
      question: language === "ro" 
        ? "Cum funcționează administrarea proprietăților în Timișoara cu RealTrust?" 
        : "How does property management in Timișoara work with RealTrust?",
      answer: language === "ro"
        ? "Oferim o soluție completă de tip 'hands-off'. RealTrust se ocupă de tot: de la fotografii profesionale și listare pe multiple platforme (Airbnb, Booking.com, VRBO), până la acces smart-lock 24/7 pentru oaspeți, curățenie profesională și optimizarea dinamică a prețurilor. Proprietarii primesc rapoarte lunare de performanță, în timp ce noi ne asigurăm că apartamentul lor menține un standard de 5 stele pe piața din Timișoara."
        : "We offer a complete 'hands-off' solution. RealTrust handles everything: from professional photography and listing on multiple platforms (Airbnb, Booking.com, VRBO), to 24/7 smart-lock access for guests, professional cleaning, and dynamic pricing optimization. Owners receive monthly performance reports, while we ensure their apartment maintains a 5-star standard on the Timișoara market."
    },
    {
      question: language === "ro" 
        ? "Care este randamentul mediu (ROI) pentru închirierile în regim hotelier în Timișoara în 2026?" 
        : "What is the average ROI for short-term rentals in Timișoara in 2026?",
      answer: language === "ro"
        ? "În 2026, portofoliul administrat de noi în Timișoara livrează constant un randament net (ROI) între 9.2% și 9.4%. Această performanță depășește închirierile tradiționale pe termen lung cu aproximativ 40%, datorită strategiilor noastre de prețuri bazate pe AI și statutului orașului de hub cultural și de afaceri major în vestul României."
        : "In 2026, our managed portfolio in Timișoara consistently delivers a net ROI between 9.2% and 9.4%. This performance exceeds traditional long-term rentals by approximately 40%, thanks to our AI-powered pricing strategies and the city's status as a major cultural and business hub in western Romania."
    },
    {
      question: language === "ro" 
        ? "De ce să aleg administrarea profesională în locul gestionării proprii pe Airbnb?" 
        : "Why choose professional management over self-hosting on Airbnb?",
      answer: language === "ro"
        ? "Administrarea profesională elimină 'costurile ascunse' ale gestionării proprii: timpul pierdut cu mesageria oaspeților, mentenanța de urgență și riscul unei ocupări scăzute cauzate de prețurile statice. RealTrust folosește analiză avansată de piață pentru a acoperi golurile din calendar și standarde hoteliere pentru a urca proprietatea în topul căutărilor, ceea ce rezultă, de regulă, într-o încasare cu 30% mai mare decât în cazul gestionării individuale."
        : "Professional management eliminates the 'hidden costs' of self-hosting: time lost on guest messaging, emergency maintenance, and the risk of low occupancy caused by static pricing. RealTrust uses advanced market analysis to fill calendar gaps and hotel-grade standards to boost your property in search rankings, typically resulting in 30% higher earnings compared to individual management."
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
      <QuickStatsBar />
      <main className="pt-10">
        {/* Hero - Entry Point */}
        <Hero />
        
        {/* Quick Lead Capture */}
        <QuickLeadForm />
        
        {/* Trust Elements */}
        <PartnerLogos />
        <TrustBadges />
        
        {/* Services Overview - Hub Navigation */}
        <ServicesOverview />
        
        {/* Owners Teaser Section */}
        <section id="beneficii">
          <OwnersTeaser />
        </section>
        
        {/* Calculator - Keep full version as it's a key conversion tool */}
        <section id="calculator">
          <ProfitCalculator />
        </section>
        
        {/* Guests Teaser Section with Property Preview */}
        <section id="oaspeti-preview">
          <GuestsTeaser />
        </section>
        
        {/* Property Portfolio - Keep as showcase */}
        <section id="portofoliu">
          <PropertyGallery />
        </section>
        
        {/* Social Proof */}
        <Testimonials />
        
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
      </main>
      <Footer />
      <GlobalConversionWidgets />
    </div>
  );
};

export default Index;
