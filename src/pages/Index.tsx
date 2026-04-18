import React, { useEffect, lazy, Suspense, useState, useRef } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { useLazyVisible } from "@/hooks/useLazyVisible";
import { useLanguage } from "@/i18n/LanguageContext";
import { NeighborhoodsGrid } from "@/components/NeighborhoodsGrid";
import { ServicesH2Strip } from "@/components/ServicesH2Strip";
import { LocalLandmarksStrip } from "@/components/LocalLandmarksStrip";
import SEOLocalEntitiesBlock from "@/components/SEOLocalEntitiesBlock";

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
const ROICaseStudySection = lazy(() => import("@/components/ROICaseStudySection"));
const OwnersTeaser = lazy(() => import("@/components/hub/OwnersTeaser"));
const GuestsTeaser = lazy(() => import("@/components/hub/GuestsTeaser"));
const PageSummary = lazy(() => import("@/components/PageSummary"));
const DIYvsProfessional = lazy(() => import("@/components/DIYvsProfessional"));
const ChannelLogos = lazy(() => import("@/components/ChannelLogos"));
// InteractiveMapWithPOI: NO lazy() here — even lazy() causes Vite to add
// the mapbox-gl chunk (455KB) to modulepreload, parsed at 948ms.
// Instead, we dynamically import() ONLY on user click inside GalleryMapSection.
const VerifiedReviewsBadges = lazy(() => import("@/components/VerifiedReviewsBadges"));
const MarketPulse = lazy(() => import("@/components/MarketPulse"));

// Near-fold section: stats + calculator — ALWAYS rendered (no lazy gate)
// to prevent mobile deadlock where Hero fills 100vh and observer never fires
const NearFoldSection = () => {
  const [calcRef, calcVisible] = useLazyVisible("300px");

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => {
        document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
      });
    };
    window.addEventListener("force-show-calculator", handler);
    return () => window.removeEventListener("force-show-calculator", handler);
  }, []);

  return (
    <div id="calculator" className="cv-auto">
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <StatsCounters />
        <MainNavigationCards />
      </Suspense>
      {/* ProfitCalculator (recharts ~170KiB) deferred until near-scroll */}
      <div ref={calcRef} style={{ minHeight: calcVisible ? undefined : '200px' }}>
        {calcVisible && (
          <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
            <ProfitCalculator />
            <QuickLeadForm />
          </Suspense>
        )}
      </div>
    </div>
  );
};

// Mid-fold section — always rendered with Suspense only
const MidFoldSection = () => (
  <div className="cv-auto">
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <DualServicePaths />
      <ChannelLogos />
      <MarketPulse />
    </Suspense>
  </div>
);

// Teaser sections — always rendered with Suspense only
const TeaserSections = () => (
  <div className="cv-auto">
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <section id="beneficii">
        <OwnersTeaser />
      </section>
      <DIYvsProfessional />
      <ROICaseStudySection />
      <section id="oaspeti-preview">
        <GuestsTeaser />
      </section>
    </Suspense>
  </div>
);

// Gallery + Map section — map loads ONLY on user click via dynamic import()
// to prevent mapbox-gl (455KB, 900ms CPU) from being parsed during audit.
// No lazy() wrapper — even that causes Vite to include the chunk in the module graph.
const GalleryMapSection = () => {
  const { language } = useLanguage();
  const [MapComp, setMapComp] = useState<React.ComponentType | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const activateMap = () => {
    if (MapComp || mapLoading) return;
    setMapLoading(true);
    import("@/components/InteractiveMapWithPOI").then(m => {
      setMapComp(() => m.default);
      setMapLoading(false);
    }).catch(() => setMapLoading(false));
  };

  return (
    <div className="cv-auto">
      <Suspense fallback={<div className="min-h-[400px]" />}>
        <section id="portofoliu">
          <PropertyGallery />
        </section>
      </Suspense>
      <div>
        {MapComp ? (
          <MapComp />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={activateMap}
            onKeyDown={(e) => e.key === 'Enter' && activateMap()}
            style={{ minHeight: '400px', cursor: 'pointer' }}
            className="relative flex items-center justify-center bg-muted/30 rounded-xl border border-border/50"
          >
            <div className="text-center p-6">
              <div className="text-4xl mb-3">{mapLoading ? '⏳' : '🗺️'}</div>
              <p className="text-lg font-semibold text-foreground/80">
                {mapLoading
                  ? (language === 'ro' ? 'Se încarcă harta...' : 'Loading map...')
                  : (language === 'ro' ? 'Apasă pentru a încărca harta interactivă' : 'Tap to load interactive map')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ro' ? 'Descoperă locațiile proprietăților noastre' : 'Discover our property locations'}
              </p>
            </div>
          </div>
        )}
      </div>
      <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
        <Testimonials />
      </Suspense>
    </div>
  );
};

// Bottom fold — always rendered with Suspense only
const BottomFoldSection = () => (
  <div className="cv-auto">
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <BlogPreview />
      <FAQ />
      <ContactSection />
      <CTA />
    </Suspense>
  </div>
);

// Deferred SEO — loaded after first paint to avoid blocking render
const DeferredHomeSEO = lazy(() => import("@/components/DeferredHomeSEO"));

const Index = () => {
  const { language } = useLanguage();

  // Phase 1: above-fold renders immediately
  // Phase 2: below-fold sections gated by IntersectionObserver sentinel —
  // prevents 100+ lazy chunks from downloading on initial page load (PageSpeed fix).
  // Sentinel is placed AFTER the near-fold section, so chunks load only when
  // the user actually scrolls toward them.
  const [belowFoldRef, belowFoldReady] = useLazyVisible("600px");

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
    const t = setTimeout(loadAnalytics, 30000);
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
        {/* SEO-only block (sr-only) — survives React hydration so Firecrawl/Google
            see ALL local entities tracked by the SEO AI Optimizer. */}
        <SEOLocalEntitiesBlock />
        {/* Hero - Entry Point (above-fold, eager) */}
        <Hero />
        <PageSummary
          summaryRo="RealTrust & ApArt Hotel Timișoara — apartamente regim hotelier și investiții imobiliare în cele mai căutate cartiere din Timișoara: Centrul istoric (lângă Parcul Central și Parcul Rozelor), Iosefin, Elisabetin, Fabric, ISHO, Complex Studențesc (lângă UVT, UPT, UMF), Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Lipovei. Proprietăți la 5–10 minute de Iulius Town, Shopping City Timișoara, Aeroportul Internațional și Gara de Nord. Administrare profesională, ROI 9.4% net verificat."
          summaryEn="RealTrust & ApArt Hotel Timișoara — short-term rental apartments and real estate investments in Timișoara's most sought-after neighborhoods: Old Town (near Central Park and Rose Park), Iosefin, Elisabetin, Fabric, ISHO, Student Complex (next to UVT, UPT, UMF universities), Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Lipovei. Properties 5–10 minutes from Iulius Town, Shopping City Timișoara, the International Airport and North Railway Station. Professional management, 9.4% net verified ROI."
        />

        {/* SEO H2 strip — explicit service headings (per audit) */}
        <ServicesH2Strip />

        {/* Neighborhoods Grid - Critical for SEO internal linking */}
        <NeighborhoodsGrid />

        {/* Local SEO landmarks strip — UVT/UPT/UMF, Iulius Town, Shopping City, parks */}
        <LocalLandmarksStrip />

        {/* Verified Reviews Badges - social proof */}
        {belowFoldReady && (
          <Suspense fallback={null}>
            <VerifiedReviewsBadges />
          </Suspense>
        )}

        {/* Near-fold: stats + calculator — visibility gated at 200px */}
        <NearFoldSection />

        {/* Sentinel: triggers below-fold chunk downloads only when user scrolls near */}
        <div ref={belowFoldRef} aria-hidden="true" style={{ height: 1 }} />

        {/* Below-fold: gated by IntersectionObserver to avoid blocking LCP */}
        {belowFoldReady && (
          <>
            {/* Mid-fold: trust + service sections */}
            <MidFoldSection />

            {/* Owners & Guests teasers */}
            <TeaserSections />

            {/* Property gallery + map + testimonials */}
            <GalleryMapSection />

            {/* Bottom-fold: blog, FAQ, contact, CTA */}
            <BottomFoldSection />
          </>
        )}
      </main>
      <Suspense fallback={null}>
        <Footer />
        {belowFoldReady && <GlobalConversionWidgets />}
      </Suspense>
    </div>
  );
};

export default Index;
