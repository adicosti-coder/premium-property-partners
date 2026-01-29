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
import MobileCTABar from "@/components/MobileCTABar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import BlogPreview from "@/components/BlogPreview";
import PromoBanner from "@/components/PromoBanner";
import QuickStatsBar from "@/components/QuickStatsBar";
import ReferralBanner from "@/components/ReferralBanner";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import SocialProofNotifications from "@/components/SocialProofNotifications";
import AIChatbot from "@/components/AIChatbot";
import SEOHead from "@/components/SEOHead";
import { generateHomepageSchemas, generateFAQSchema, DatabaseReview } from "@/utils/schemaGenerators";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
  
  // Generate combined JSON-LD for homepage with database reviews
  const faqSchema = generateFAQSchema([
    { 
      question: language === "ro" ? "Ce servicii oferă RealTrust?" : "What services does RealTrust offer?",
      answer: language === "ro" 
        ? "Oferim administrare profesională de apartamente în regim hotelier, incluzând marketing, rezervări, curățenie, check-in/out și mentenanță."
        : "We offer professional apartment management for short-term rentals, including marketing, bookings, cleaning, check-in/out and maintenance."
    },
    {
      question: language === "ro" ? "Care este rata de ocupare medie?" : "What is the average occupancy rate?",
      answer: language === "ro"
        ? "Proprietățile noastre din Timișoara au o rată de ocupare medie de 98%, cu venituri semnificativ mai mari decât închirierea tradițională."
        : "Our properties in Timișoara have an average occupancy rate of 98%, with significantly higher income than traditional rentals."
    },
    {
      question: language === "ro" ? "Cum funcționează colaborarea?" : "How does the partnership work?",
      answer: language === "ro"
        ? "Noi ne ocupăm de tot: de la fotografii profesionale și listare pe platforme, până la comunicarea cu oaspeții și curățenie. Tu primești rapoarte lunare și plăți transparente."
        : "We handle everything: from professional photos and platform listings, to guest communication and cleaning. You receive monthly reports and transparent payments."
    },
  ]);
  
  const homepageSchemas = [
    ...generateHomepageSchemas(reviews),
    faqSchema,
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead jsonLd={homepageSchemas} includeWebSiteSchema={true} />
      <PromoBanner />
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
      <MobileCTABar />
      <FloatingWhatsApp />
      <AccessibilityPanel />
      <ExitIntentPopup />
      <SocialProofNotifications />
      <AIChatbot />
    </div>
  );
};

export default Index;
