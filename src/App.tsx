import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimationPreferenceProvider } from "@/hooks/useAnimationPreference";
import { SharedAssistantProvider } from "@/hooks/useSharedAssistantContext";
import { Loader2 } from "lucide-react";

// Handle dynamic import failures (stale cache) by reloading the page
const handleDynamicImportError = (error: Error) => {
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
    // Reload the page to get fresh chunks
    window.location.reload();
    return;
  }
  
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

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AnimationPreferenceProvider>
        <LanguageProvider>
          <SharedAssistantProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
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
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </SharedAssistantProvider>
        </LanguageProvider>
      </AnimationPreferenceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
