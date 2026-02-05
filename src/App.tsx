
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimationPreferenceProvider } from "@/hooks/useAnimationPreference";
import { Loader2 } from "lucide-react";

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
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PentruOaspeti = lazy(() => import("./pages/PentruOaspeti"));
const Guests = lazy(() => import("./pages/Guests"));
const Imobiliare = lazy(() => import("./pages/Imobiliare"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticle"));
const OnlineCheckIn = lazy(() => import("./pages/OnlineCheckIn"));
const WhyBookDirect = lazy(() => import("./pages/WhyBookDirect"));
const OwnerAuth = lazy(() => import("./pages/OwnerAuth"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const PentruProprietari = lazy(() => import("./pages/PentruProprietari"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const CommunityArticles = lazy(() => import("./pages/CommunityArticles"));
const CommunityArticleDetail = lazy(() => import("./pages/CommunityArticleDetail"));
const SubmitArticle = lazy(() => import("./pages/SubmitArticle"));
const EditArticle = lazy(() => import("./pages/EditArticle"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));

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
                  <Route path="/online-check-in" element={<OnlineCheckIn />} />
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
        </LanguageProvider>
      </AnimationPreferenceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
