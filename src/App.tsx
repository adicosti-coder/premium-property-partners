import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import PropertyDetail from "./pages/PropertyDetail";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import Guests from "./pages/Guests";
import Imobiliare from "./pages/Imobiliare";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import OnlineCheckIn from "./pages/OnlineCheckIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
              <Route path="/imobiliare" element={<Imobiliare />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/proprietate/:slug" element={<PropertyDetail />} />
              <Route path="/online-check-in" element={<OnlineCheckIn />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
