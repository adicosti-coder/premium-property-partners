import React, { useEffect, lazy, Suspense, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SEOHead from "@/components/SEOHead";
import { useLazyVisible } from "@/hooks/useLazyVisible";
import { useLanguage } from "@/i18n/LanguageContext";
import { NeighborhoodsGrid } from "@/components/NeighborhoodsGrid";
import { ServicesH2Strip } from "@/components/ServicesH2Strip";
import { LocalLandmarksStrip } from "@/components/LocalLandmarksStrip";
import SEOLocalEntitiesBlock from "@/components/SEOLocalEntitiesBlock";
import { generateHomepageSchemas, generateSpeakableSchema } from "@/utils/schemaGenerators";

import StatsCounters from "@/components/StatsCounters";
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
import VerifiedReviewsBadges from "@/components/VerifiedReviewsBadges";
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

// Bottom fold — split to avoid blog/contact queries during homepage audit
const BottomFoldPrimarySection = () => (
  <div className="cv-auto">
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <FAQ />
      <ContactSection />
      <CTA />
    </Suspense>
  </div>
);

const BottomFoldSecondarySection = () => (
  <div className="cv-auto">
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <BlogPreview />
    </Suspense>
  </div>
);

const HOMEPAGE_SEO = {
  ro: {
    title: "RealTrust Timișoara | Imobiliare, Regim Hotelier & ROI",
    description:
      "Descoperă apartamente de închiriat și vânzare în Timișoara, regim hotelier lângă UVT și Iulius Town. Calculează ROI și contactează-ne!",
  },
  en: {
    title: "RealTrust Timișoara | Real Estate, Short-Term Rentals & ROI",
    description:
      "Short-term rental apartments and real estate investments in Timișoara, near Timișoara Airport, UVT and Iulius Town. Calculate ROI free.",
  },
} as const;

const STATIC_HOMEPAGE_SCHEMAS = [
  ...generateHomepageSchemas(),
  generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://www.realtrust.ro", [
    ".page-summary",
    "h1",
    "h2",
    ".faq-section",
  ]),
];

// Deferred review schema enrichment — loaded after first paint to avoid blocking render
const DeferredHomeSEO = lazy(() => import("@/components/DeferredHomeSEO"));

const Index = () => {
  const { language } = useLanguage();
  const homepageSeo = HOMEPAGE_SEO[language as keyof typeof HOMEPAGE_SEO] || HOMEPAGE_SEO.ro;

  // Phase 1: above-fold renders immediately
  // Phase 2: below-fold sections gated by IntersectionObserver sentinel —
  // prevents 100+ lazy chunks from downloading on initial page load (PageSpeed fix).
  // Sentinel is placed AFTER the near-fold section, so chunks load only when
  // the user actually scrolls toward them.
  const [belowFoldRef, belowFoldReady] = useLazyVisible("300px", null);
  const [deepFoldRef, deepFoldReady] = useLazyVisible("200px", null);

  // Defer SEO schemas to first user interaction (frees main thread for LCP)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setMounted(true);
      events.forEach(e => document.removeEventListener(e, trigger));
    };
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach(e => document.addEventListener(e, trigger, { once: true, passive: true }));
    return () => { events.forEach(e => document.removeEventListener(e, trigger)); };
  }, []);

  // Defer session analytics to first scroll (not a fixed timer)
  useEffect(() => {
    const loadAnalytics = () => {
      import("@/hooks/useSessionAnalytics").catch(() => {});
      events.forEach(e => document.removeEventListener(e, loadAnalytics));
    };
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach(e => document.addEventListener(e, loadAnalytics, { once: true, passive: true }));
    return () => { events.forEach(e => document.removeEventListener(e, loadAnalytics)); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={homepageSeo.title}
        description={homepageSeo.description}
        url="https://www.realtrust.ro/"
        jsonLd={STATIC_HOMEPAGE_SCHEMAS}
      />
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
          summaryRo="RealTrust este agenție imobiliară Timișoara și operator de regim hotelier, cu apartamente noi Timișoara de vânzare, proprietăți în Centru Vechi, ISHO, Iosefin, Calea Girocului și închirieri apartamente Timișoara Complex Studențesc pentru studenți. Oferim investiții imobiliare cu randament în Timișoara, administrare profesională și cazare aproape de UVT, UPT, UMF, Iulius Town, Spitalul Județean, Gara de Nord și Aeroport, cu acces rapid la stațiile Piața Maria, Prefectură, Complex Studențesc și liniile E4/E7."
          summaryEn="RealTrust & ApArt Hotel Timișoara — short-term rental apartments and real estate investments in Timișoara's most sought-after neighborhoods: Old Town (near Central Park and Rose Park), Iosefin, Elisabetin, Fabric, ISHO, Student Complex (next to UVT, UPT, UMF universities), Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Lipovei. Properties 5–10 minutes from Iulius Town, Shopping City Timișoara, the International Airport and North Railway Station. Professional management, 9.4% net verified ROI."
        />

        {/* Sentinel placed RIGHT AFTER hero+summary — moves EVERYTHING below
            (ServicesH2Strip, NeighborhoodsGrid, LocalLandmarksStrip, NearFold,
            etc.) out of the LCP critical path. Hero fills 100dvh on mobile so
            none of these are visible at first paint anyway. */}
        <div ref={belowFoldRef} aria-hidden="true" style={{ height: 1 }} />

        {belowFoldReady && (
          <>
            {/* SEO H2 strip — explicit service headings (per audit) */}
            <ServicesH2Strip />

            {/* Neighborhoods Grid - Critical for SEO internal linking */}
            <NeighborhoodsGrid />

            {/* Local SEO landmarks strip — UVT/UPT/UMF, Iulius Town, parks */}
            <LocalLandmarksStrip />

            {/* Verified Reviews Badges - social proof */}
            <VerifiedReviewsBadges />

            {/* Near-fold: stats + calculator */}
            <NearFoldSection />

            {/* Mid-fold: trust + service sections */}
            <MidFoldSection />

            {/* Owners & Guests teasers */}
            <TeaserSections />

            {/* Property gallery + map + testimonials */}
            <GalleryMapSection />

            {/* Bottom-fold: FAQ, contact, CTA */}
            <BottomFoldPrimarySection />

            <div ref={deepFoldRef} aria-hidden="true" style={{ height: 1 }} />

            {/* Deep-fold: blog only after deeper scroll */}
            {deepFoldReady && <BottomFoldSecondarySection />}
          </>
        )}
      </main>
      <Suspense fallback={null}>
        {belowFoldReady && <Footer />}
        {belowFoldReady && <GlobalConversionWidgets />}
      </Suspense>
    </div>
  );
};

export default Index;
