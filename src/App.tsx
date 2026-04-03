import { Suspense, lazy, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimationPreferenceProvider } from "@/hooks/useAnimationPreference";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FAQSchemaProvider } from "@/hooks/useFAQSchema";

// Defer heavy shell components that are not needed for first paint
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));
const GoogleAnalytics = lazy(() => import("@/components/GoogleAnalytics"));

// Handle dynamic import failures (stale cache) by reloading the page
const handleDynamicImportError = (error: Error): never => {
  const isChunkError = error.message.includes('Failed to fetch dynamically imported module') ||
                       error.message.includes('Loading chunk') ||
                       error.message.includes('Loading CSS chunk');
  
  if (isChunkError) {
    // Clear any service worker cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  }
  
  // Always re-throw so the lazy() promise never resolves to undefined
  throw error;
};

// Wrap lazy imports with error handling
const lazyWithRetry = (importFn: () => Promise<{ default: React.ComponentType<unknown> }>) => {
  return lazy(() => importFn().catch(handleDynamicImportError) as Promise<{ default: React.ComponentType<unknown> }>);
};

// Configure React Query defaults for better stability on custom domains
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute default stale time
      retry: 2,
      refetchOnWindowFocus: false, // Prevent data disappearing on window focus
      refetchOnReconnect: true,
    },
  },
});

// Index loaded eagerly — it's the landing page and LCP depends on it rendering fast
import Index from "./pages/Index";
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Lazy loaded pages (code splitting for performance)
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const PropertyDetail = lazyWithRetry(() => import("./pages/PropertyDetail"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Favorites = lazyWithRetry(() => import("./pages/Favorites"));
const PentruOaspeti = lazyWithRetry(() => import("./pages/PentruOaspeti"));
const Guests = lazyWithRetry(() => import("./pages/Guests"));
const Imobiliare = lazyWithRetry(() => import("./pages/Imobiliare"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogArticlePage = lazyWithRetry(() => import("./pages/BlogArticle"));
const Investitii = lazyWithRetry(() => import("./pages/Investitii"));
const WhyBookDirect = lazyWithRetry(() => import("./pages/WhyBookDirect"));
const OwnerAuth = lazyWithRetry(() => import("./pages/OwnerAuth"));
const OwnerDashboard = lazyWithRetry(() => import("./pages/OwnerDashboard"));
const AboutUs = lazyWithRetry(() => import("./pages/AboutUs"));
const PentruProprietari = lazyWithRetry(() => import("./pages/PentruProprietari"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const CommunityArticles = lazyWithRetry(() => import("./pages/CommunityArticles"));
const CommunityArticleDetail = lazyWithRetry(() => import("./pages/CommunityArticleDetail"));
const SubmitArticle = lazyWithRetry(() => import("./pages/SubmitArticle"));
const EditArticle = lazyWithRetry(() => import("./pages/EditArticle"));
const PublicProfile = lazyWithRetry(() => import("./pages/PublicProfile"));
const ReferralProgram = lazyWithRetry(() => import("./pages/ReferralProgram"));
const Complexe = lazyWithRetry(() => import("./pages/Complexe"));
const ComplexDetail = lazyWithRetry(() => import("./pages/ComplexDetail"));
const Preturi = lazyWithRetry(() => import("./pages/Preturi"));
const ZoneLanding = lazyWithRetry(() => import("./pages/ZoneLanding"));
const AnalizaProprietate = lazyWithRetry(() => import("./pages/AnalizaProprietate"));
const GuestGuide = lazyWithRetry(() => import("./pages/GuestGuide"));
const CatalogInvestitii = lazyWithRetry(() => import("./pages/CatalogInvestitii"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe"));
const ScraperLeads = lazyWithRetry(() => import("./pages/ScraperLeads"));
const ComplexLanding = lazyWithRetry(() => import("./pages/ComplexLanding"));
// No loader — render nothing while chunks load so the HTML skeleton stays visible
const PageLoader = () => null;

// Redirect /contact → /#contact (avoid 404 noindex for Google)
// ContactRedirect uses Navigate for proper SEO (no JS redirect)
const ContactRedirect = () => <Navigate to="/#contact" replace />;
const ContactPage = lazyWithRetry(() => import("./pages/ContactPage"));

// Client-side redirects for legacy .html URLs (server .htaccess not processed)
const LegacyRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    // Only scroll to top on PUSH navigation (new page), not on POP (back/forward)
    if (navType === "PUSH") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);
  return null;
};

// Deferred shell — wraps children with lazy providers + widgets
const DeferredShell = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Delay non-critical shell until truly idle — avoids competing with LCP
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setReady(true), { timeout: 4000 })
      : setTimeout(() => setReady(true), 2000) as unknown as number;
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  return (
    <>
      {children}
      {ready && (
        <Suspense fallback={null}>
          <Toaster />
          <Sonner />
          <CookieConsent />
          <GoogleAnalytics />
        </Suspense>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AnimationPreferenceProvider>
        <LanguageProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <FAQSchemaProvider>
              <ScrollToTop />
              <DeferredShell>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/favorite" element={<Favorites />} />
                    <Route path="/oaspeti" element={<Guests />} />
                    <Route path="/pentru-oaspeti" element={<PentruOaspeti />} />
                    <Route path="/imobiliare" element={<Imobiliare />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogArticlePage />} />
                    <Route path="/proprietate/:slug" element={<PropertyDetail />} />
                    {/* SEO landing pages — each property has its own top-level route */}
                    <Route path="/ring-apart-hotel-spacious-deluxe" element={<PropertyDetail />} />
                    <Route path="/green-forest-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/fructus-plaza-ultracentral-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/fullview-studio-deluxe" element={<PropertyDetail />} />
                    <Route path="/avenue-of-mara-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/helios-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/ateneo-trevi-2-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/sunset-da-ra-studio-deluxe" element={<PropertyDetail />} />
                    <Route path="/ateneo-apart-hotel-studio-deluxe" element={<PropertyDetail />} />
                    <Route path="/modern-studio-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/investitii" element={<Investitii />} />
                    <Route path="/rezerva-direct" element={<WhyBookDirect />} />
                    <Route path="/autentificare-proprietar" element={<OwnerAuth />} />
                    <Route path="/portal-proprietar" element={<OwnerDashboard />} />
                    <Route path="/despre-noi" element={<AboutUs />} />
                    <Route path="/pentru-proprietari" element={<PentruProprietari />} />
                    <Route path="/profil" element={<Profile />} />
                    <Route path="/setari" element={<Settings />} />
                    <Route path="/comunitate" element={<CommunityArticles />} />
                    <Route path="/comunitate/articol/:id" element={<CommunityArticleDetail />} />
                    <Route path="/comunitate/trimite" element={<SubmitArticle />} />
                    <Route path="/comunitate/editeaza/:id" element={<EditArticle />} />
                    <Route path="/comunitate/profil/:userId" element={<PublicProfile />} />
                    <Route path="/recomanda-proprietar" element={<ReferralProgram />} />
                    <Route path="/complexe" element={<Complexe />} />
                    <Route path="/complex/:slug" element={<ComplexDetail />} />
                    <Route path="/complexe/:slug" element={<ComplexLanding />} />
                    <Route path="/preturi" element={<Preturi />} />
                    <Route path="/zona/:zone" element={<ZoneLanding />} />
                    <Route path="/analiza-proprietate" element={<AnalizaProprietate />} />
                    <Route path="/guide/:bookingId" element={<GuestGuide />} />
                    <Route path="/catalog-investitii" element={<CatalogInvestitii />} />
                    <Route path="/termeni-si-conditii" element={<LegalPage type="terms" />} />
                    <Route path="/politica-confidentialitate" element={<LegalPage type="privacy" />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/scraper-leads" element={<ScraperLeads />} />
                    <Route path="/contact" element={<ContactRedirect />} />
                    {/* Legacy .html redirects — use Navigate for proper 301-like behavior with crawlers */}
                    <Route path="/index.html" element={<Navigate to="/" replace />} />
                    <Route path="/index-en.html" element={<Navigate to="/" replace />} />
                    <Route path="/index_EN.html" element={<Navigate to="/" replace />} />
                    <Route path="/imobiliare-realtrust-en.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/imobiliare-realtrust.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/real-estate-en.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/real-estate.html" element={<Navigate to="/imobiliare" replace />} />
                    {/* Sitemap redirect to dynamic edge function */}
                    <Route path="/sitemap.xml" element={<LegacyRedirect to={`https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/generate-sitemap`} />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </DeferredShell>
              </FAQSchemaProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </LanguageProvider>
      </AnimationPreferenceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
