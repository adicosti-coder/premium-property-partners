import Header from "@/components/Header";
import Hero from "@/components/Hero";
import QuickLeadForm from "@/components/QuickLeadForm";
import QuickSelector from "@/components/QuickSelector";
import PartnerLogos from "@/components/PartnerLogos";
import Benefits from "@/components/Benefits";
import HowItWorks from "@/components/HowItWorks";
import WhyUs from "@/components/WhyUs";
import OwnerBenefits from "@/components/OwnerBenefits";
import ProfitCalculator from "@/components/ProfitCalculator";
import RentalIncomeCalculator from "@/components/RentalIncomeCalculator";
import PropertyGallery from "@/components/PropertyGallery";
import Testimonials from "@/components/Testimonials";
import GuestSection from "@/components/GuestSection";
import CleaningStandards from "@/components/CleaningStandards";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import AboutFounder from "@/components/AboutFounder";
import BlogPreview from "@/components/BlogPreview";
import PromoBanner from "@/components/PromoBanner";
import StatsCounters from "@/components/StatsCounters";
import ResidentialComplexes from "@/components/ResidentialComplexes";
import PartnershipTimeline from "@/components/PartnershipTimeline";
import DigitalHouseManual from "@/components/DigitalHouseManual";
import TrustBadges from "@/components/TrustBadges";
import FinancialTransparency from "@/components/FinancialTransparency";
import VideoTestimonials from "@/components/VideoTestimonials";
import FacilitiesShowcase from "@/components/FacilitiesShowcase";
import InteractiveMapWithPOI from "@/components/InteractiveMapWithPOI";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <PromoBanner />
      <Header />
      <main>
        <Hero />
        <QuickLeadForm />
        <PartnerLogos />
        <section id="beneficii">
          <Benefits />
        </section>
        <OwnerBenefits />
        <TrustBadges />
        <FinancialTransparency />
        <PartnershipTimeline />
        <ProfitCalculator />
        <RentalIncomeCalculator />
        <section id="cum-functioneaza">
          <HowItWorks />
        </section>
        <section id="de-ce-noi">
          <WhyUs />
        </section>
        <PropertyGallery />
        <FacilitiesShowcase />
        <InteractiveMapWithPOI />
        <ResidentialComplexes />
        <StatsCounters />
        <Testimonials />
        <VideoTestimonials />
        <AboutFounder />
        <BlogPreview />
        <GuestSection />
        <DigitalHouseManual />
        <CleaningStandards />
        <FAQ />
        <ContactSection />
        <CTA />
      </main>
      <Footer />
      <MobileCTABar />
      <FloatingWhatsApp />
      <AccessibilityPanel />
    </div>
  );
};

export default Index;
