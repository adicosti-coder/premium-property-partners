import { useEffect, lazy, Suspense, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { useLazyVisible } from "@/hooks/useLazyVisible";
import { useLanguage } from "@/i18n/LanguageContext";

// ALL below-fold components are lazy loaded
const StatsCounters = lazy(() => import("@/components/StatsCounters"));
const QuickLeadForm = lazy(() => import("@/components/QuickLeadForm"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const CTA = lazy(() => import("@/components/CTA"));
const Footer = lazy(() => import("@/components/Footer"));
const BlogPreview = lazy(() => import("@/components/BlogPreview"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const DualServicePaths = lazy(() => import("@/components/DualServicePaths"));
const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const MainNavigationCards = lazy(() => import("@/components/hub/MainNavigationCards"));
const OwnersTeaser = lazy(() => import("@/components/hub/OwnersTeaser"));
const GuestsTeaser = lazy(() => import("@/components/hub/GuestsTeaser"));
const PageSummary = lazy(() => import("@/components/PageSummary"));

// Visibility-gated section: stats + calculator (near-fold)
const NearFoldSection = () => {
  const [ref, visible] = useLazyVisible("200px");
  const [forceShow, setForceShow] = useState(false);
  const show = visible || forceShow;

  // Listen for "force-show-calculator" so the Hero CTA can reveal & scroll
  useEffect(() => {
    const handler = () => {
      setForceShow(true);
      // Wait a tick for React to render, then scroll
      requestAnimationFrame(() => {
        document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
      });
    };
    window.addEventListener("force-show-calculator", handler);
    return () => window.removeEventListener("force-show-calculator", handler);
  }, []);

  return (
    <div ref={ref} id="calculator">
      {show && (
        <Suspense fallback={null}>
          <StatsCounters />
          <ProfitCalculator />
          <QuickLeadForm />
          <MainNavigationCards />
        </Suspense>
      )}
    </div>
  );
};

// Visibility-gated mid-fold section (simplified - removed redundant trust sections)
const MidFoldSection = () => {
  const [ref, visible] = useLazyVisible("400px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <DualServicePaths />
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

// Visibility-gated bottom fold (simplified - fewer sections)
const BottomFoldSection = ({ language }: { language: string }) => {
  const [ref, visible] = useLazyVisible("200px");
  return (
    <div ref={ref}>
      {visible && (
        <Suspense fallback={null}>
          <BlogPreview />
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
  const [heavyRef, heavyVisible] = useLazyVisible("100px");

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
      {/* Skip to content link for screen readers & keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {language === "ro" ? "Sari la conținut" : "Skip to content"}
      </a>
      {mounted && (
        <Suspense fallback={null}>
          <DeferredHomeSEO language={language} />
        </Suspense>
      )}
      <Header />
      <main id="main-content" role="main" aria-label={language === "ro" ? "Conținut principal" : "Main content"}>
        {/* Hero - Entry Point (above-fold, eager) */}
        <Hero />
        <PageSummary
          summaryRo="RealTrust — platformă completă de imobiliare și apart-hotel management în Timișoara. Administrare profesională în regim hotelier cu ROI 9%+, rată de ocupare 85%, self check-in digital 24/7. Servicii de vânzare, cumpărare, închiriere și amenajare apartamente."
          summaryEn="RealTrust — complete real estate and apart-hotel management platform in Timișoara. Professional short-term rental management with 9%+ ROI, 85% occupancy rate, 24/7 digital self check-in. Property sales, purchases, rentals and interior design services."
        />

        {/* Near-fold: stats + calculator — visibility gated at 200px */}
        <NearFoldSection />

        {/* Mid-fold: trust + service sections - gated by visibility */}
        <MidFoldSection />

        {/* Owners & Guests teasers - gated by visibility */}
        <TeaserSections />

        {/* Property gallery + testimonials */}
        <div ref={heavyRef}>
          {heavyVisible && (
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <section id="portofoliu">
                <PropertyGallery />
              </section>
              <Testimonials />
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
