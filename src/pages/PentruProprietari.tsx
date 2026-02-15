import { Link } from "react-router-dom";
import { 
  Building2, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  Star,
  Phone,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingReferralButton from "@/components/FloatingReferralButton";
import OwnerBenefits from "@/components/OwnerBenefits";
import TrustBadges from "@/components/TrustBadges";
import FinancialTransparency from "@/components/FinancialTransparency";
import PartnershipTimeline from "@/components/PartnershipTimeline";
import ProfitCalculator from "@/components/ProfitCalculator";
import RentalIncomeCalculator from "@/components/RentalIncomeCalculator";
import AdvancedRentalCalculator from "@/components/AdvancedRentalCalculator";
import HowItWorks from "@/components/HowItWorks";
import WhyUs from "@/components/WhyUs";
import Testimonials from "@/components/Testimonials";
import VideoTestimonials from "@/components/VideoTestimonials";
import FAQ from "@/components/FAQ";
import ReferralBanner from "@/components/ReferralBanner";
import SEOHead from "@/components/SEOHead";
import PageSummary from "@/components/PageSummary";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ServiceOptionsComparison from "@/components/ServiceOptionsComparison";
import ServiceGuaranteesGrid from "@/components/ServiceGuaranteesGrid";
import ProcessStepsTimeline from "@/components/ProcessStepsTimeline";
// New components from realtrust.ro
import QuickValueBanner from "@/components/QuickValueBanner";
import PropertyTypeSelector from "@/components/PropertyTypeSelector";
import PropertyQualification from "@/components/PropertyQualification";
import ServiceChainAF from "@/components/ServiceChainAF";
import DIYvsProfessional from "@/components/DIYvsProfessional";
import ChannelLogos from "@/components/ChannelLogos";
import LeadMagnetBanner from "@/components/LeadMagnetBanner";
import InvestorGuideButton from "@/components/InvestorGuideButton";
import FloatingInvestorGuide from "@/components/FloatingInvestorGuide";

const PentruProprietari = () => {
  const { language } = useLanguage();
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Pentru Proprietari de Apartamente",
      title: "Transformă-ți Proprietatea",
      titleHighlight: "într-o Sursă de Venit",
      subtitle: "Management profesional în regim hotelier cu tehnologie avansată, transparență totală și echipă dedicată. Maximizează randamentul apartamentului tău fără stres.",
      cta: "Calculează Potențialul Tău",
      secondaryCta: "Contactează-ne",
      stats: [
        { value: "+40%", label: "Randament Superior", description: "Față de chiria pe termen lung" },
        { value: "20%", label: "Comision Transparent", description: "Fără costuri ascunse" },
        { value: "+80%", label: "Rată Ocupare", description: "Media portofoliului nostru" },
        { value: "24/7", label: "Suport Complet", description: "Pentru tine și oaspeți" },
      ],
      trustPoints: [
        "Contract flexibil, fără perioadă minimă",
        "Banii intră direct în contul tău",
        "Rapoarte financiare în timp real",
        "Verificare completă a oaspeților",
      ],
      portalTitle: "Portal Dedicat Proprietarilor",
      portalSubtitle: "Acces 24/7 la toate informațiile despre proprietatea ta",
      portalCta: "Accesează Portalul",
      faqTitle: "Întrebări Frecvente",
    },
    en: {
      badge: "For Apartment Owners",
      title: "Transform Your Property",
      titleHighlight: "into an Income Source",
      subtitle: "Professional short-term rental management with advanced technology, full transparency, and a dedicated team. Maximize your apartment's returns without stress.",
      cta: "Calculate Your Potential",
      secondaryCta: "Contact Us",
      stats: [
        { value: "+40%", label: "Higher Returns", description: "Compared to long-term rent" },
        { value: "20%", label: "Transparent Commission", description: "No hidden fees" },
        { value: "98%", label: "Occupancy Rate", description: "Our portfolio average" },
        { value: "24/7", label: "Full Support", description: "For you and guests" },
      ],
      trustPoints: [
        "Flexible contract, no minimum period",
        "Money goes directly to your account",
        "Real-time financial reports",
        "Complete guest verification",
      ],
      portalTitle: "Dedicated Owner Portal",
      portalSubtitle: "24/7 access to all information about your property",
      portalCta: "Access Portal",
      faqTitle: "Frequently Asked Questions",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const scrollToCalculator = () => {
    const element = document.getElementById("calculator");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      language === "ro"
        ? "Bună ziua! Sunt interesat de serviciile RealTrust & ApArt Hotel pentru administrarea apartamentului meu."
        : "Hello! I'm interested in RealTrust & ApArt Hotel services for managing my apartment."
    );
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  const seoContent = {
    ro: {
      title: "Pentru Proprietari | Administrare Apartamente Timișoara | RealTrust",
      description: "Transformă-ți apartamentul într-o sursă de venit pasiv. Comision 20%, rată ocupare 98%, transparență totală. Evaluare gratuită!"
    },
    en: {
      title: "For Property Owners | Apartment Management Timișoara | RealTrust",
      description: "Transform your apartment into a passive income source. 20% commission, 98% occupancy rate, full transparency. Free evaluation!"
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  // Service JSON-LD schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": language === 'ro' ? "Administrare Apartamente în Regim Hotelier" : "Short-Term Rental Management",
    "description": seo.description,
    "provider": {
      "@type": "LocalBusiness",
      "name": "RealTrust & ApArt Hotel",
      "telephone": "+40723154520",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "addressCountry": "RO"
      }
    },
    "areaServed": {
      "@type": "City",
      "name": "Timișoara"
    },
    "serviceType": language === 'ro' ? "Administrare proprietăți" : "Property Management",
    "offers": {
      "@type": "Offer",
      "description": language === 'ro' ? "Comision 20%, fără costuri ascunse" : "20% commission, no hidden fees"
    }
  };

  // Speakable schema for AI/voice assistants
  const speakableSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": seo.title,
    "url": "https://realtrust.ro/pentru-proprietari",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".page-summary", "h1", "h2"],
    },
  };

  const breadcrumbItems = [
    { label: language === "ro" ? "Pentru Proprietari" : "For Owners" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/pentru-proprietari"
        jsonLd={[serviceSchema, speakableSchema]}
      />
      <Header />
      
      {/* AI-friendly page summary for extraction */}
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="RealTrust oferă administrare profesională a apartamentelor în regim hotelier în Timișoara, cu comision de 20%, rată de ocupare de peste 85%, self check-in digital, și transparență financiară completă prin rapoarte lunare. Fără perioadă minimă de contract."
          summaryEn="RealTrust provides professional short-term rental management in Timișoara, with a 20% commission, over 85% occupancy rate, digital self check-in, and complete financial transparency through monthly reports. No minimum contract period."
        />
      </div>

      {/* Floating Investor Guide - Mobile Only */}
      <FloatingInvestorGuide />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>

      {/* Hero Section - Investor Blue/Gold Theme */}
      <section className="relative pt-40 md:pt-36 pb-20 bg-gradient-to-b from-blue-950/80 via-blue-900/40 to-background overflow-hidden">
        {/* Background decorations - Blue/Gold investor theme */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(45_93%_58%/0.1),transparent_70%)]" />
        <div className="absolute top-40 left-[10%] w-32 h-32 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-60 right-[10%] w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

        <div
          ref={heroRef}
          className={`container mx-auto px-6 relative z-10 transition-all duration-1000 ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge - Investor Blue/Gold */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/50 border border-amber-500/30 mb-6 transition-all duration-700 ${
                heroVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">{t.badge}</span>
            </div>

            {/* Title */}
            <h1
              className={`text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 transition-all duration-700 ${
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              {t.title}{" "}
              <span className="text-gradient-gold">{t.titleHighlight}</span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto transition-all duration-700 ${
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              {t.subtitle}
            </p>

            {/* Trust Points - Investor styled */}
            <div
              className={`flex flex-wrap justify-center gap-4 mb-10 transition-all duration-700 ${
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "500ms" }}
            >
              {t.trustPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 backdrop-blur-sm rounded-full border border-blue-700/30 text-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-foreground">{point}</span>
                </div>
              ))}
            </div>

            {/* CTAs - Gold primary buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 ${
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              <Button
                variant="hero"
                size="xl"
                onClick={scrollToCalculator}
                className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                {t.cta}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="heroOutline"
                size="xl"
                onClick={handleWhatsApp}
                className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {t.secondaryCta}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section - Investor Blue/Gold theme */}
        <div
          ref={statsRef}
          className={`container mx-auto px-6 mt-16 transition-all duration-700 ${
            statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {t.stats.map((stat, index) => (
              <div
                key={index}
                className={`text-center p-6 rounded-2xl bg-blue-900/30 backdrop-blur-sm border border-blue-700/30 transition-all duration-500 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 ${
                  statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: statsVisible ? `${index * 100 + 200}ms` : "0ms" }}
              >
                <div className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Value Banner - Moved below Hero */}
      <QuickValueBanner onCtaClick={scrollToCalculator} />

      {/* Calculator Section - Moved up for visibility */}
      <section id="calculator">
        <ProfitCalculator />
      </section>

      {/* Advanced Rental Calculator (Estimator AI) */}
      <AdvancedRentalCalculator />

      {/* Rental Income Calculator (Calculator Pro) */}
      <RentalIncomeCalculator />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Property Type Selector - NEW */}
      <PropertyTypeSelector 
        onContinue={() => scrollToCalculator()}
      />

      {/* Property Qualification - NEW */}
      <PropertyQualification onContact={handleWhatsApp} />

      {/* The 3 Options Comparison - NEW from realtrust.ro */}
      <ServiceOptionsComparison />

      {/* DIY vs Professional - NEW */}
      <DIYvsProfessional />

      {/* Owner Benefits */}
      <OwnerBenefits />

      {/* Service Chain A-F - NEW */}
      <ServiceChainAF />

      {/* Channel Logos - NEW */}
      <ChannelLogos />

      {/* Service Guarantees Grid - NEW from realtrust.ro */}
      <ServiceGuaranteesGrid />

      {/* Financial Transparency */}
      <FinancialTransparency />

      {/* Process Steps Timeline - NEW from realtrust.ro */}
      <ProcessStepsTimeline />

      {/* Partnership Timeline */}
      <PartnershipTimeline />

      {/* Investor Guide CTA - Before Calculators */}
      <section className="py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-serif font-bold mb-4">
            {language === "ro" ? "Descarcă Ghidul Investitorului 2026" : "Download the 2026 Investor's Guide"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {language === "ro" 
              ? "Strategii de maximizare a randamentului, analiză de piață și zone premium din Timișoara."
              : "Strategies for maximizing returns, market analysis and premium zones in Timișoara."}
          </p>
          <InvestorGuideButton size="lg" />
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Why Us */}
      <WhyUs />

      {/* Testimonials */}
      <Testimonials />

      {/* Video Testimonials - Hidden until we have content */}
      {/* <VideoTestimonials /> */}

      {/* Owner Portal CTA */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-gold/10 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--gold)/0.1),transparent_70%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-gold">
                {language === "ro" ? "Exclusiv pentru Parteneri" : "Partners Only"}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {t.portalTitle}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t.portalSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="xl" className="group">
                <Link to="/autentificare-proprietar">
                  {t.portalCta}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="heroOutline" size="xl">
                <Link to="/despre-noi">
                  {language === "ro" ? "Despre Noi" : "About Us"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Magnet Banner */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-6">
          <LeadMagnetBanner variant="hero" />
        </div>
      </section>

      {/* Referral Banner */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-6">
          <ReferralBanner variant="hero" />
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {language === "ro" ? "Gata să Începi?" : "Ready to Start?"}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {language === "ro"
                ? "Contactează-ne acum pentru o evaluare gratuită a proprietății tale."
                : "Contact us now for a free evaluation of your property."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={handleWhatsApp}>
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="heroOutline"
                size="xl"
                onClick={() => window.location.href = "tel:+40723154520"}
              >
                <Phone className="w-5 h-5 mr-2" />
                +40 723 154 520
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingReferralButton />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default PentruProprietari;
