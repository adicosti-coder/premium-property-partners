import { useEffect, lazy, Suspense, useState } from "react";
import Hero from "@/components/Hero";
import { useLanguage } from "@/i18n/LanguageContext";

// Header lazy-loaded to defer vendor-ui (lucide, radix) + vendor-data (supabase) from critical path
const Header = lazy(() => import("@/components/Header"));

// Lightweight static header placeholder — pure CSS, zero JS dependencies
const HeaderPlaceholder = () => (
  <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 bg-background/80 border-b border-border/30" aria-hidden="true" />
);

// Critical below-fold components — direct imports to guarantee rendering on production
import StatsCounters from "@/components/StatsCounters";
import QuickLeadForm from "@/components/QuickLeadForm";
import ProfitCalculator from "@/components/ProfitCalculator";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import BlogPreview from "@/components/BlogPreview";
import DualServicePaths from "@/components/DualServicePaths";
import PropertyGallery from "@/components/PropertyGallery";
import MainNavigationCards from "@/components/hub/MainNavigationCards";
import OwnersTeaser from "@/components/hub/OwnersTeaser";
import GuestsTeaser from "@/components/hub/GuestsTeaser";

// Non-critical widgets still lazy
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

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

        <StatsCounters />
        <section id="calculator">
          <ProfitCalculator />
        </section>
        <QuickLeadForm />
        <MainNavigationCards />

        <DualServicePaths />

        <section id="beneficii">
          <OwnersTeaser />
        </section>
        <section id="oaspeti-preview">
          <GuestsTeaser />
        </section>

        <section id="portofoliu">
          <PropertyGallery />
        </section>
        <Testimonials />

        <BlogPreview />
        <FAQ />
        <ContactSection />
        <CTA />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default Index;
