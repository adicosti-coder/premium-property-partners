import { useEffect, lazy, Suspense, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { useLazyVisible } from "@/hooks/useLazyVisible";
import { useLanguage } from "@/i18n/LanguageContext";

// ALL below-fold components are lazy loaded
const StatsCounters = lazy(() => import("@/components/StatsCounters"));
const QuickLeadForm = lazy(() => import("@/components/QuickLeadForm"));
const PartnerLogos = lazy(() => import("@/components/PartnerLogos"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
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
const DualServicePaths = lazy(() => import("@/components/DualServicePaths"));
const ROICaseStudy = lazy(() => import("@/components/ROICaseStudy"));
const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const MainNavigationCards = lazy(() => import("@/components/hub/MainNavigationCards"));
const OwnersTeaser = lazy(() => import("@/components/hub/OwnersTeaser"));
const GuestsTeaser = lazy(() => import("@/components/hub/GuestsTeaser"));
const AboutTeaser = lazy(() => import("@/components/hub/AboutTeaser"));

// Visibility-gated section: stats + calculator (near-fold)
const NearFoldSection = () => {
  const [ref, visible] = useLazyVisible("200px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <StatsCounters />
          <section id="calculator">
            <ProfitCalculator />
          </section>
          <QuickLeadForm />
          <MainNavigationCards />
        </Suspense>
      )}
    </div>
  );
};

// Visibility-gated mid-fold section
const MidFoldSection = () => {
  const [ref, visible] = useLazyVisible("400px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <PartnerLogos />
          <TrustBadges />
          <DualServicePaths />
          <ROICaseStudy />
        </Suspense>
      )}
    </div>
  );
};

// Visibility-gated teaser sections
const TeaserSections = () => {
  const [ref, visible] = useLazyVisible("400px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <section id="beneficii">
            <OwnersTeaser />
          </section>
          <section id="oaspeti-preview">
            <GuestsTeaser />
          </section>
        </Suspense>
      )}
    </div>
  );
};

// Visibility-gated bottom fold (FAQ, contact, blog, etc.)
const BottomFoldSection = ({ language }: { language: string }) => {
  const [ref, visible] = useLazyVisible("600px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <ExternalTrustSeals />
          <AboutTeaser />
          <BlogPreview />
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
          <section className="py-12">
            <div className="container mx-auto px-6">
              <ReferralBanner variant="hero" />
            </div>
          </section>
          <FAQ />
          <ContactSection />
          <CTA />
        </Suspense>
      )}
    </div>
  );
};

// Deferred SEO — loaded after first paint to avoid blocking render
const DeferredHomeSEO = lazy(() => import("@/components/DeferredHomeSEO"));

const Index = () => {
  const { language } = useLanguage();
  
  // Visibility gates for heavy sections
  const [heavyRef, heavyVisible] = useLazyVisible("600px");

  // Defer SEO/analytics to after first paint
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestIdleCallback?.(() => setMounted(true)) ?? setTimeout(() => setMounted(true), 100);
    return () => { if (typeof id === 'number') cancelIdleCallback?.(id) ?? clearTimeout(id); };
  }, []);

  // Defer session analytics to first scroll (not a fixed timer)
  useEffect(() => {
    const loadAnalytics = () => {
      import("@/hooks/useSessionAnalytics").catch(() => {});
      document.removeEventListener("scroll", loadAnalytics);
    };
    document.addEventListener("scroll", loadAnalytics, { once: true, passive: true });
    // Fallback after 12s if no scroll
    const t = setTimeout(loadAnalytics, 12000);
    return () => { clearTimeout(t); document.removeEventListener("scroll", loadAnalytics); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {mounted && (
        <Suspense fallback={null}>
          <DeferredHomeSEO language={language} />
        </Suspense>
      )}
      <Header />
      <main>
        {/* Hero - Entry Point (above-fold, eager) */}
        <Hero />

        {/* Near-fold: stats + calculator — visibility gated at 200px */}
        <NearFoldSection />

        {/* Mid-fold: trust + service sections - gated by visibility */}
        <MidFoldSection />

        {/* Owners & Guests teasers - gated by visibility */}
        <TeaserSections />

        {/* Heavy section: PropertyGallery (mapbox 455KB + jsPDF 132KB) */}
        <div ref={heavyRef}>
          {heavyVisible && (
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <section id="portofoliu">
                <PropertyGallery />
              </section>
              <Testimonials />
              <BookingReviewsWidget />
            </Suspense>
          )}
        </div>
        
        {/* Bottom-fold: deferred until scroll */}
        <BottomFoldSection language={language} />
      </main>
      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default Index;
