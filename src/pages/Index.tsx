import { useEffect, lazy, Suspense, useState } from "react";
import Hero from "@/components/Hero";
import { useLanguage } from "@/i18n/LanguageContext";

// Header lazy-loaded to defer vendor-ui (lucide, radix) + vendor-data (supabase) from critical path
const Header = lazy(() => import("@/components/Header"));

// Lightweight static header placeholder — pure CSS, zero JS dependencies
const HeaderPlaceholder = () => (
  <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 bg-background/80 border-b border-border/30" aria-hidden="true" />
);

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

// All sections render eagerly inside Suspense — lazy() handles code-splitting

// Deferred SEO — loaded after first paint to avoid blocking render
const DeferredHomeSEO = lazy(() => import("@/components/DeferredHomeSEO"));

const Index = () => {
  const { language } = useLanguage();

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
    const t = setTimeout(loadAnalytics, 12000);
    return () => { clearTimeout(t); document.removeEventListener("scroll", loadAnalytics); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
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
      <Suspense fallback={<HeaderPlaceholder />}>
        <Header />
      </Suspense>
      <main id="main-content" role="main" aria-label={language === "ro" ? "Conținut principal" : "Main content"}>
        <Hero />

        <Suspense fallback={null}>
          <StatsCounters />
          <section id="calculator">
            <ProfitCalculator />
          </section>
          <QuickLeadForm />
          <MainNavigationCards />
        </Suspense>

        <Suspense fallback={null}>
          <DualServicePaths />
        </Suspense>

        <Suspense fallback={null}>
          <section id="beneficii">
            <OwnersTeaser />
          </section>
          <section id="oaspeti-preview">
            <GuestsTeaser />
          </section>
        </Suspense>

        <Suspense fallback={null}>
          <section id="portofoliu">
            <PropertyGallery />
          </section>
          <Testimonials />
        </Suspense>

        <Suspense fallback={null}>
          <BlogPreview />
          <FAQ />
          <ContactSection />
          <CTA />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default Index;
