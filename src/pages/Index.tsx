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

// Hub Teaser Components
import ServicesOverview from "@/components/hub/ServicesOverview";
import OwnersTeaser from "@/components/hub/OwnersTeaser";
import GuestsTeaser from "@/components/hub/GuestsTeaser";
import AboutTeaser from "@/components/hub/AboutTeaser";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
