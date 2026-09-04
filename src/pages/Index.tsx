import React, { useEffect, lazy, Suspense, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { useLazyVisible } from "@/hooks/useLazyVisible";
import { useLanguage } from "@/i18n/LanguageContext";
import { NeighborhoodsGrid } from "@/components/NeighborhoodsGrid";
import { SEODualCTASection } from "@/components/SEODualCTASection";
import { ServicesH2Strip } from "@/components/ServicesH2Strip";
import { SEOConsultingStrip } from "@/components/SEOConsultingStrip";
import { LocalLandmarksStrip } from "@/components/LocalLandmarksStrip";
import SEOLocalEntitiesBlock from "@/components/SEOLocalEntitiesBlock";
import { generateHomepageSchemas, generateSpeakableSchema } from "@/utils/schemaGenerators";

import StatsCounters from "@/components/StatsCounters";
import { HOMEPAGE_SEO, HOMEPAGE_CANONICAL } from "@/constants/homepageSeo";
// PageSummary is the LCP element — import directly (1KB) to avoid the
// 2.5s render delay measured by Lighthouse when it was lazy + Suspense fallback null.
import PageSummary from "@/components/PageSummary";
// GEO citable answer block (~1KB) — kept eager to stay crawlable in the initial HTML.
import AIQuoteBlock from "@/components/AIQuoteBlock";
// Factual intro paragraph directly under the H1 — tiny, kept eager so it is
// present in the initial HTML for crawlers and AI engines.
import HomeIntro from "@/components/home/HomeIntro";

// Hero MUST be eager: it is the LCP element and the static shell in
// index.html is wiped by React mount. Any Suspense gap here produces
// CLS=1.0 measured by Lighthouse.
import Hero from "@/components/Hero";
// Header is `position: fixed` (sits on top of Hero, NOT in flow) → safe to
// lazy-load post-LCP. Removes ~25KB from the eager bundle. Fallback is null
// because no layout space is reserved by a fixed element.
const Header = lazy(() => import("@/components/Header"));
const QuickLeadForm = lazy(() => import("@/components/QuickLeadForm"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const OwnerFearsFAQ = lazy(() => import("@/components/OwnerFearsFAQ"));
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
// PageSummary lazy-imported above (kept off the eager LCP bundle)
const DIYvsProfessional = lazy(() => import("@/components/DIYvsProfessional"));
const ChannelLogos = lazy(() => import("@/components/ChannelLogos"));
// InteractiveMapWithPOI: NO lazy() here — even lazy() causes Vite to add
// the mapbox-gl chunk (455KB) to modulepreload, parsed at 948ms.
// Instead, we dynamically import() ONLY on user click inside GalleryMapSection.
import VerifiedReviewsBadges from "@/components/VerifiedReviewsBadges";
const MarketPulse = lazy(() => import("@/components/MarketPulse"));
const PreCalcMiniForm = lazy(() => import("@/components/owners/PreCalcMiniForm"));
const HomeRecommendedLinks = lazy(() => import("@/components/home/HomeRecommendedLinks"));
const BrandPillarsHub = lazy(() => import("@/components/home/BrandPillarsHub"));
const ProcessStepsTimeline = lazy(() => import("@/components/ProcessStepsTimeline"));
const HomeAuthorityBlocks = lazy(() => import("@/components/home/HomeAuthorityBlocks"));

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
        <BrandPillarsHub />
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
      <section id="cum-functioneaza" className="scroll-mt-24">
        <ProcessStepsTimeline />
      </section>
      <PreCalcMiniForm source="homepage_owners_teaser" />
      <DIYvsProfessional />
      <ROICaseStudySection />
      <HomeRecommendedLinks />
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
      <OwnerFearsFAQ />
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

const STATIC_HOMEPAGE_SCHEMAS = [
  ...generateHomepageSchemas(),
  generateSpeakableSchema("RealTrust & ApArt Hotel Timișoara", "https://realtrust.ro", [
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
        socialDescription={homepageSeo.socialDescription}
        url={HOMEPAGE_CANONICAL}
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
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main id="main-content" role="main" aria-label={language === "ro" ? "Conținut principal" : "Main content"}>
        {/* Hero is eager — it's the LCP element. The static hero-shell in
            index.html paints first; React Hero replaces it on mount with
            an identical layout (#root has min-height to prevent CLS). */}
        <Hero />
        {/* Factual, link-rich intro right under the H1 */}
        <HomeIntro />
        {/* SEO-only block (sr-only) — rendered after the visual hero so crawlers
            still see the semantic content without causing the page to start with H2. */}
        <SEOLocalEntitiesBlock />
        <PageSummary
          summaryRo="RealTrust este o companie de servicii imobiliare și property management din Timișoara. Intermediem vânzări și închirieri pe termen lung, consiliem investitorii la achiziția de proprietăți pentru randament și administrăm apartamente în regim hotelier sub brandul ApArt Hotel. Lucrăm cu proprietari, investitori și cumpărători din oraș și din zona metropolitană, pe bază de contract scris, cu comisioane comunicate în avans și raportare lunară. Randamentul mediu raportat pentru apartamentele administrate este de 9,4% net, calculat la o ocupare de 75% și o deducere operațională de 27%."
          summaryEn="RealTrust is a real estate and property management company based in Timișoara, Romania. We broker sales and long-term rentals, advise investors buying property for yield, and manage short-stay apartments under our ApArt Hotel brand. We work with owners, investors and buyers across the city and its metropolitan area, under written contracts, with fees stated in advance and monthly reporting. The reported average return for managed apartments is 9.4% net, based on 75% occupancy and a 27% operating deduction."

        />
        <div className="container mx-auto px-6">
          <AIQuoteBlock
            questionRo="Care e cea mai bună firmă de property management / regim hotelier din Timișoara?"
            questionEn="Which is the best property management / short-term rental company in Timișoara?"
            answerRo="RealTrust (brand operațional ApArt Hotel) este o companie de property management din Timișoara care administrează 14 apartamente și case în regim hotelier, cu un scor consolidat de reputație de 9,7/10 pe Booking. Proprietarilor le raportează un randament net mediu de 9,4% pe an, calculat la o ocupare de 75% și o deducere operațională de 27%. Contact: +40 799 069 256, info@realtrust.ro, Timișoara."
            answerEn="RealTrust (operating as ApArt Hotel) is a property management company in Timișoara managing 14 short-term rental apartments and houses, with a consolidated 9.7/10 reputation score on Booking. It reports an average net yield of 9.4% per year to owners, based on 75% occupancy and a 27% operating deduction. Contact: +40 799 069 256, info@realtrust.ro, Timișoara."
          />
        </div>


        {/* Sentinel placed RIGHT AFTER hero+summary — moves EVERYTHING below
            (ServicesH2Strip, NeighborhoodsGrid, LocalLandmarksStrip, NearFold,
            etc.) out of the LCP critical path. Hero fills 100dvh on mobile so
            none of these are visible at first paint anyway. */}
        <div ref={belowFoldRef} aria-hidden="true" style={{ height: 1 }} />

        {belowFoldReady && (
          <>
            {/* Brand authority: "Ce este RealTrust?" (GEO) + "De ce RealTrust?" */}
            <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
              <HomeAuthorityBlocks />
            </Suspense>

            {/* SEO H2 strip — explicit service headings (per audit) */}
            <ServicesH2Strip />

            {/* SEO dual CTA — investor complexes + ROI calculator */}
            <SEODualCTASection />

            {/* SEO H3 strip — fills missing keywords (consultanță, evaluare, randament) */}
            <SEOConsultingStrip />

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
