import { lazy, Suspense, useState, useEffect, useRef } from "react";
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
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";

const FloatingReferralButton = lazy(() => import("@/components/FloatingReferralButton"));
const OwnerBenefits = lazy(() => import("@/components/OwnerBenefits"));
const OwnerHowItWorks = lazy(() => import("@/components/OwnerHowItWorks"));
const OnboardingVideoExplainer = lazy(() => import("@/components/OnboardingVideoExplainer"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FinancialTransparency = lazy(() => import("@/components/FinancialTransparency"));
const PartnershipTimeline = lazy(() => import("@/components/PartnershipTimeline"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const RentalIncomeCalculator = lazy(() => import("@/components/RentalIncomeCalculator"));
const AdvancedRentalCalculator = lazy(() => import("@/components/AdvancedRentalCalculator"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const WhyUs = lazy(() => import("@/components/WhyUs"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const VideoTestimonials = lazy(() => import("@/components/VideoTestimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const ReferralBanner = lazy(() => import("@/components/ReferralBanner"));
const PageSummary = lazy(() => import("@/components/PageSummary"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const ServiceOptionsComparison = lazy(() => import("@/components/ServiceOptionsComparison"));
const ServiceGuaranteesGrid = lazy(() => import("@/components/ServiceGuaranteesGrid"));
const ProcessStepsTimeline = lazy(() => import("@/components/ProcessStepsTimeline"));
const QuickValueBanner = lazy(() => import("@/components/QuickValueBanner"));
const PropertyTypeSelector = lazy(() => import("@/components/PropertyTypeSelector"));
const PropertyQualification = lazy(() => import("@/components/PropertyQualification"));
const ServiceChainAF = lazy(() => import("@/components/ServiceChainAF"));
const DIYvsProfessional = lazy(() => import("@/components/DIYvsProfessional"));
const ChannelLogos = lazy(() => import("@/components/ChannelLogos"));
const LeadMagnetBanner = lazy(() => import("@/components/LeadMagnetBanner"));
const InvestorGuideButton = lazy(() => import("@/components/InvestorGuideButton"));
const FloatingInvestorGuide = lazy(() => import("@/components/FloatingInvestorGuide"));
const ROICaseStudySection = lazy(() => import("@/components/ROICaseStudySection"));

/**
 * Hook: loads a lazy component only after IntersectionObserver fires.
 * Returns [sentinelRef, shouldRender].
 */
function useDeferredLoad(rootMargin = "500px") {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldRender) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, rootMargin]);

  return [ref, shouldRender] as const;
}

const PentruProprietari = () => {
  const { language } = useLanguage();
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation({ threshold: 0.1 });

  // Deferred loading for heavy components - only loads after user scrolls ~500px
  const [calcSentinel, calcReady] = useDeferredLoad("500px");
  const [faqSentinel, faqReady] = useDeferredLoad("500px");

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
        { value: "15-25%", label: "Comision Transparent", description: "Fără costuri ascunse" },
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
        { value: "15-25%", label: "Transparent Commission", description: "No hidden fees" },
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
      title: "Administrare Apartamente Timișoara | RealTrust",
      description: "Transformă-ți apartamentul într-o sursă de venit pasiv cu administrare profesională. Comision 15-25%, rată ocupare 85%+, transparență totală și rapoarte lunare. Evaluare gratuită!"
    },
    en: {
      title: "Apartment Management Timișoara | RealTrust",
      description: "Transform your apartment into a passive income source with professional management. 15-25% commission, 85%+ occupancy, full transparency and monthly reports. Free evaluation!"
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  // Service JSON-LD schema - deferred import to reduce TBT
  const [schemas, setSchemas] = useState<any[]>([]);
  useEffect(() => {
    import("@/utils/schemaGenerators").then(({ generatePropertyManagementServiceSchema, generateSpeakableSchema }) => {
      const serviceSchema = generatePropertyManagementServiceSchema();
      const speakable = generateSpeakableSchema(seo.title, "https://www.realtrust.ro/pentru-proprietari");
      setSchemas([serviceSchema, speakable]);
    });
  }, [seo.title]);

  const breadcrumbItems = [
    { label: language === "ro" ? "Pentru Proprietari" : "For Owners" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://www.realtrust.ro/pentru-proprietari"
        jsonLd={schemas}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://www.realtrust.ro" },
          { name: language === "ro" ? "Pentru Proprietari" : "For Owners", url: "https://www.realtrust.ro/pentru-proprietari" },
        ]}
      />
      <Header />
      <Suspense fallback={null}>
      
      {/* AI-friendly page summary for extraction */}
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="RealTrust oferă administrare profesională a apartamentelor în regim hotelier în Timișoara, cu comision de 15-25%, rată de ocupare de peste 85%, self check-in digital, și transparență financiară completă prin rapoarte lunare. Fără perioadă minimă de contract."
          summaryEn="RealTrust provides professional short-term rental management in Timișoara, with a 15-25% commission, over 85% occupancy rate, digital self check-in, and complete financial transparency through monthly reports. No minimum contract period."
        />
      </div>

      {/* Floating Investor Guide - Mobile Only */}
      <FloatingInvestorGuide />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>

      {/* Hero Section - Investor Blue/Gold Theme */}
      <section className="relative pt-40 md:pt-36 pb-20 overflow-hidden">
        {/* Solid navy overlay - renders instantly before image loads */}
        <div className="absolute inset-0 bg-[#0a1628]" />
        
        {/* Hero background image with fixed dimensions & picture for mobile */}
        <div className="absolute inset-0">
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet="/images/hero-cinematic.webp"
              width="800"
              height="450"
            />
            <img
              src="/images/hero-cinematic.webp"
              alt={language === "ro" ? "Apartament premium administrat în regim hotelier Timișoara" : "Premium managed short-term rental apartment Timișoara"}
              className="w-full h-full object-cover"
              width={1920}
              height={1080}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/60 to-background" />
        </div>
        {/* Background decorations - CSS only, no framer-motion */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(45_93%_58%/0.1),transparent_70%)]" />

        <div
          ref={heroRef}
          className={`container mx-auto px-6 relative z-10 transition-opacity duration-700 ${
            heroVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left Column - Text & CTA */}
            <div className="text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/50 border border-amber-500/30 mb-6">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">{t.badge}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6">
                {t.title}{" "}
                <span className="text-gradient-gold">{t.titleHighlight}</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-white/80 mb-8">
                {t.subtitle}
              </p>

              {/* CTAs - CSS transitions only */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
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

            {/* Right Column - Hero Video Walkthrough - simplified CSS transition */}
            <div className={`transition-opacity duration-700 ${heroVisible ? "opacity-100" : "opacity-0"}`}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/20">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video object-cover"
                  width={640}
                  height={360}
                  poster="/images/hero-cinematic.webp"
                >
                  <source src="/videos/hero-apartment-walkthrough.mp4" type="video/mp4" />
                </video>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white/80 text-xs font-medium">
                    {language === "ro" ? "Tur Virtual Apartament Premium" : "Premium Apartment Virtual Tour"}
                  </span>
                </div>
              </div>
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

      {/* ========= CONVERSION FUNNEL: Beneficii → Calculator → Pachete → CTA ========= */}

      {/* STEP 1: Beneficii - convinge proprietarul */}
      <OwnerBenefits />

      {/* How It Works - 3 steps for owners */}
      <OwnerHowItWorks />

      {/* Video Explainer - Onboarding Process Tour */}
      <OnboardingVideoExplainer />

      {/* DIY vs Professional - dovada că managementul profesionist câștigă */}
      <DIYvsProfessional />

      {/* Service Options Comparison */}
      <ServiceOptionsComparison />

      {/* Channel Logos - pe ce platforme ești listat */}
      <ChannelLogos />

      {/* STEP 2: Calculator - deferred via IntersectionObserver */}
      <div ref={calcSentinel} />
      <section id="calculator" className="scroll-mt-24">
        {calcReady && <ProfitCalculator />}
      </section>

      {/* Advanced Rental Calculator (Estimator AI) */}
      <AdvancedRentalCalculator />

      {/* Rental Income Calculator (Calculator Pro) */}
      <RentalIncomeCalculator />

      {/* STEP 3: Pachete de prețuri — acum că știe potențialul, vede costul */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-6 text-center">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            {language === "ro" ? "Pachete Transparente" : "Transparent Packages"}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            {language === "ro" ? "Alege Pachetul Potrivit" : "Choose the Right Package"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {language === "ro"
              ? "Comision clar, fără costuri ascunse. Plătești doar din veniturile generate."
              : "Clear commission, no hidden fees. You only pay from generated revenue."}
          </p>
          <Link to="/preturi">
            <Button variant="hero" size="lg" className="group">
              {language === "ro" ? "Vezi Toate Pachetele & Prețurile" : "See All Packages & Pricing"}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Property Type Selector */}
      <PropertyTypeSelector 
        onContinue={() => scrollToCalculator()}
      />

      {/* Property Qualification */}
      <PropertyQualification onContact={handleWhatsApp} />

      {/* Service Chain A-F */}
      <ServiceChainAF />

      {/* Service Guarantees Grid */}
      <ServiceGuaranteesGrid />

      {/* Financial Transparency */}
      <FinancialTransparency />

      {/* Process Steps Timeline */}
      <ProcessStepsTimeline />

      {/* Partnership Timeline */}
      <PartnershipTimeline />

      {/* Investor Guide CTA */}
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

      {/* ROI Case Studies - Before/After */}
      <ROICaseStudySection />

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

      {/* FAQ - deferred via IntersectionObserver */}
      <div ref={faqSentinel} />
      {faqReady && <FAQ />}

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
                variant="outline"
                size="xl"
                className="bg-card text-foreground border-border hover:bg-muted font-semibold shadow-md"
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
      <GlobalConversionWidgets />
      <BackToTop />
      </Suspense>
    </div>
  );
};

export default PentruProprietari;
