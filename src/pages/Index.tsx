import Header from "@/components/Header";
import Hero from "@/components/Hero";
import QuickSelector from "@/components/QuickSelector";
import PartnerLogos from "@/components/PartnerLogos";
import Benefits from "@/components/Benefits";
import HowItWorks from "@/components/HowItWorks";
import WhyUs from "@/components/WhyUs";
import OwnerBenefits from "@/components/OwnerBenefits";
import ProfitCalculator from "@/components/ProfitCalculator";
import PropertyGallery from "@/components/PropertyGallery";
import Testimonials from "@/components/Testimonials";
import GuestSection from "@/components/GuestSection";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AboutFounder from "@/components/AboutFounder";
import BlogPreview from "@/components/BlogPreview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <QuickSelector />
        <PartnerLogos />
        <section id="beneficii">
          <Benefits />
        </section>
        <OwnerBenefits />
        <ProfitCalculator />
        <section id="cum-functioneaza">
          <HowItWorks />
        </section>
        <section id="de-ce-noi">
          <WhyUs />
        </section>
        <PropertyGallery />
        <Testimonials />
        <AboutFounder />
        <BlogPreview />
        <GuestSection />
        <FAQ />
        <ContactSection />
        <CTA />
      </main>
      <Footer />
      <MobileCTABar />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
