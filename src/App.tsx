import { Suspense, lazy, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimationPreferenceProvider } from "@/hooks/useAnimationPreference";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FAQSchemaProvider } from "@/hooks/useFAQSchema";
import CanonicalHreflang from "@/components/seo/CanonicalHreflang";
import TrailingSlashRedirect from "@/components/seo/TrailingSlashRedirect";
import { captureCampaignAttribution } from "@/lib/campaignAttribution";

const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));

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

const GA_MEASUREMENT_ID = "G-JXDGWL3G6V";

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
const BlogCategory = lazyWithRetry(() => import("./pages/BlogCategory"));
const BlogLocation = lazyWithRetry(() => import("./pages/BlogLocation"));
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
const ScraperPreview = lazyWithRetry(() => import("./pages/ScraperPreview"));
const ProspectListings = lazyWithRetry(() => import("./pages/ProspectListings"));
const ImobiliareTimisoara = lazyWithRetry(() => import("./pages/ImobiliareTimisoara"));
const NeighborhoodDetail = lazyWithRetry(() => import("./pages/NeighborhoodDetail"));
const CalculatorROI = lazyWithRetry(() => import("./pages/CalculatorROI"));
const AnalizaROIApartament = lazyWithRetry(() => import("./pages/AnalizaROIApartament"));
const CityOfMaraTimisoara = lazyWithRetry(() => import("./pages/CityOfMaraTimisoara"));
const PiataImobiliara = lazyWithRetry(() => import("./pages/PiataImobiliara"));
const EvaluareGratuita = lazyWithRetry(() => import("./pages/EvaluareGratuita"));
const ThankYou = lazyWithRetry(() => import("./pages/ThankYou"));
const SemnareContract = lazyWithRetry(() => import("./pages/SemnareContract"));
const StatusLead = lazyWithRetry(() => import("./pages/StatusLead"));
const AnalizaPartajata = lazyWithRetry(() => import("./pages/AnalizaPartajata"));
const ProgramareConfirmata = lazyWithRetry(() => import("./pages/ProgramareConfirmata"));
const ComplexLanding = lazyWithRetry(() => import("./pages/ComplexLanding"));
const NeighborhoodCluster = lazyWithRetry(() => import("./pages/NeighborhoodCluster"));
const SharedComparison = lazyWithRetry(() => import("./pages/SharedComparison"));
const CallDashboard = lazyWithRetry(() => import("./pages/CallDashboard"));
const AdminLeadDashboard = lazyWithRetry(() => import("./pages/AdminLeadDashboard"));
const FastReview = lazyWithRetry(() => import("./pages/admin/FastReview"));
// No loader — render nothing while chunks load so the HTML skeleton stays visible
const PageLoader = () => null;

const ContactPage = lazyWithRetry(() => import("./pages/ContactPage"));
const IntrebariFrecvente = lazyWithRetry(() => import("./pages/IntrebariFrecvente"));
const Rezervare = lazyWithRetry(() => import("./pages/Rezervare"));
const AdaugaAnunt = lazyWithRetry(() => import("./pages/AdaugaAnunt"));
const ProcesulNostru = lazyWithRetry(() => import("./pages/ProcesulNostru"));
const ServiciiImobiliareTimisoara = lazyWithRetry(() => import("./pages/ServiciiImobiliareTimisoara"));
const Multumim = lazyWithRetry(() => import("./pages/Multumim"));
const SuccesCalcul = lazyWithRetry(() => import("./pages/SuccesCalcul"));

// Client-side redirects for legacy .html URLs (server .htaccess not processed)
const LegacyRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const location = useLocation();
  const { pathname } = location;
  const navType = useNavigationType();

  useEffect(() => {
    // First-touch campaign / outreach attribution (utm, gclid, ?src=andrei_wa)
    captureCampaignAttribution();
    if (typeof window.gtag === "function") {
      window.gtag("config", GA_MEASUREMENT_ID, { page_path: location.pathname });
    }
    // Meta Pixel SPA page view (no-op without ads consent / pixel ID)
    void import("@/lib/conversionTracking").then((m) => m.trackMetaPageView()).catch(() => {});
  }, [location.pathname]);


  useEffect(() => {
    // Only scroll to top on PUSH navigation (new page), not on POP (back/forward)
    if (navType === "PUSH") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);
  return null;
};

// Deferred shell — wraps children with lazy providers + widgets.
// Loads ONLY on first user interaction or a long fallback so Lighthouse never
// pulls these chunks into the critical chain.
const DeferredShell = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setReady(true);
      events.forEach(e => document.removeEventListener(e, trigger));
    };
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach(e => document.addEventListener(e, trigger, { once: true, passive: true }));
    // GDPR: the cookie banner must appear without requiring an interaction first.
    const timer = setTimeout(trigger, 2500);
    return () => {
      clearTimeout(timer);
      events.forEach(e => document.removeEventListener(e, trigger));
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
              <TrailingSlashRedirect />
              <CanonicalHreflang />
              <ScrollToTop />
              <DeferredShell>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/:adminTab" element={<Admin />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/favorite" element={<Favorites />} />
                    <Route path="/oaspeti" element={<Guests />} />
                    <Route path="/pentru-oaspeti" element={<PentruOaspeti />} />
                    <Route path="/imobiliare" element={<Imobiliare />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/categorie/:slug" element={<BlogCategory />} />
                    <Route path="/blog/locatie/:location" element={<BlogLocation />} />
                    <Route path="/blog/:slug" element={<BlogArticlePage />} />
                    <Route path="/proprietate/:slug" element={<PropertyDetail />} />
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
                    <Route path="/moonlight-emerald-suite" element={<PropertyDetail />} />
                    <Route path="/xcity-3-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/ring-residence-apart-hotel" element={<PropertyDetail />} />
                    <Route path="/investitii" element={<Investitii />} />
                    <Route path="/rezerva-direct" element={<WhyBookDirect />} />
                    <Route path="/autentificare-proprietar" element={<OwnerAuth />} />
                    <Route path="/portal-proprietar" element={<OwnerDashboard />} />
                    <Route path="/despre-noi" element={<AboutUs />} />
                    <Route path="/pentru-proprietari" element={<PentruProprietari />} />
                    {/* Short alias people type / share manually — keeps one canonical URL. */}
                    <Route path="/proprietari" element={<Navigate to="/pentru-proprietari" replace />} />

                    <Route path="/profil" element={<Profile />} />
                    <Route path="/setari" element={<Settings />} />
                    <Route path="/comunitate" element={<CommunityArticles />} />
                    <Route path="/comunitate/articol/:id" element={<CommunityArticleDetail />} />
                    <Route path="/comunitate/trimite" element={<SubmitArticle />} />
                    <Route path="/comunitate/editeaza/:id" element={<EditArticle />} />
                    <Route path="/comunitate/profil/:userId" element={<PublicProfile />} />
                    <Route path="/recomanda-proprietar" element={<ReferralProgram />} />
                    <Route path="/recomanda" element={<ReferralProgram />} />

                    <Route path="/complexe" element={<Complexe />} />
                    <Route path="/complex/:slug" element={<ComplexDetail />} />
                    <Route path="/complexe/city-of-mara" element={<CityOfMaraTimisoara />} />
                    <Route path="/complexe/:slug" element={<ComplexLanding />} />
                    <Route path="/cartier/:slug" element={<NeighborhoodCluster />} />
                    <Route path="/preturi" element={<Preturi />} />
                    <Route path="/zona/:zone" element={<ZoneLanding />} />
                    <Route path="/analiza-proprietate" element={<AnalizaProprietate />} />
                    <Route path="/guide/:bookingId" element={<GuestGuide />} />
                    <Route path="/catalog-investitii" element={<CatalogInvestitii />} />
                    <Route path="/imobiliare-timisoara" element={<ImobiliareTimisoara />} />
                    <Route path="/imobiliare-timisoara/:zona" element={<NeighborhoodDetail />} />
                    <Route path="/calculator-roi" element={<CalculatorROI />} />
                    <Route path="/analiza-roi-apartament" element={<AnalizaROIApartament />} />
                    <Route path="/piata-imobiliara-timisoara" element={<PiataImobiliara />} />
                    <Route path="/evaluare-gratuita" element={<EvaluareGratuita />} />
                    <Route path="/multumire" element={<ThankYou />} />
                    <Route path="/contract/:token" element={<SemnareContract />} />
                    <Route path="/status-lead" element={<StatusLead />} />
                    <Route path="/status-lead/:token" element={<StatusLead />} />
                    <Route path="/analiza/:token" element={<AnalizaPartajata />} />
                    <Route path="/programare-confirmata" element={<ProgramareConfirmata />} />
                    <Route path="/mulțumire" element={<Navigate to="/multumire" replace />} />
                    <Route path="/termeni-si-conditii" element={<LegalPage type="terms" />} />
                    <Route path="/politica-confidentialitate" element={<LegalPage type="privacy" />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/scraper-leads" element={<ScraperLeads />} />
                    <Route path="/admin/scraper-preview" element={<ScraperPreview />} />
                    <Route path="/admin/prospect-listings" element={<ProspectListings />} />
                    <Route path="/admin/call-dashboard" element={<CallDashboard />} />
                    <Route path="/admin/lead-dashboard" element={<AdminLeadDashboard />} />
                    <Route path="/admin/properties/fast-review" element={<FastReview />} />
                    <Route path="/prospect-listings" element={<Navigate to="/admin/prospect-listings" replace />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/rezervare" element={<Rezervare />} />
                    <Route path="/adauga-anunt" element={<AdaugaAnunt />} />
                    <Route path="/procesul-nostru" element={<ProcesulNostru />} />
                    <Route path="/servicii-imobiliare-timisoara" element={<ServiciiImobiliareTimisoara />} />
                    <Route path="/multumim" element={<Multumim />} />
                    <Route path="/succes-calcul" element={<SuccesCalcul />} />
                    <Route path="/comparatie/:shareCode" element={<SharedComparison />} />
                    <Route path="/contact-locatie" element={<Navigate to="/contact" replace />} />
                    {/* Legacy / mistyped URLs shared manually — avoid 404 dead ends. */}
                    <Route path="/favorites" element={<Navigate to="/favorite" replace />} />
                    <Route path="/guests" element={<Navigate to="/pentru-oaspeti" replace />} />
                    <Route path="/proprietati" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/legal/politica-de-confidentialitate" element={<Navigate to="/politica-confidentialitate" replace />} />
                    <Route path="/legal/termeni-si-conditii" element={<Navigate to="/termeni-si-conditii" replace />} />
                    <Route path="/index.html" element={<Navigate to="/" replace />} />
                    <Route path="/index-en.html" element={<Navigate to="/" replace />} />
                    <Route path="/index_EN.html" element={<Navigate to="/" replace />} />
                    <Route path="/imobiliare-realtrust-en.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/imobiliare-realtrust.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/real-estate-en.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/real-estate.html" element={<Navigate to="/imobiliare" replace />} />
                    <Route path="/sitemap.xml" element={<LegacyRedirect to={`https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/generate-sitemap`} />} />
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
