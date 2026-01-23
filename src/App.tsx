import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimationPreferenceProvider } from "@/hooks/useAnimationPreference";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import PropertyDetail from "./pages/PropertyDetail";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import PentruOaspeti from "./pages/PentruOaspeti";
import Guests from "./pages/Guests";
import Imobiliare from "./pages/Imobiliare";
import Blog from "./pages/Blog";
import BlogArticlePage from "./pages/BlogArticle";
import OnlineCheckIn from "./pages/OnlineCheckIn";
import WhyBookDirect from "./pages/WhyBookDirect";
import OwnerAuth from "./pages/OwnerAuth";
import OwnerDashboard from "./pages/OwnerDashboard";
import AboutUs from "./pages/AboutUs";
import PentruProprietari from "./pages/PentruProprietari";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CommunityArticles from "./pages/CommunityArticles";
import CommunityArticleDetail from "./pages/CommunityArticleDetail";
import SubmitArticle from "./pages/SubmitArticle";
import EditArticle from "./pages/EditArticle";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AnimationPreferenceProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AnimationPreferenceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
