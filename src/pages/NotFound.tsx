import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();
  const { t, language } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const seoContent = {
    ro: {
      title: "Pagină Negăsită | RealTrust & ApArt Hotel",
      description: "Pagina pe care o cauți nu există. Întoarce-te la pagina principală pentru a explora apartamentele noastre premium din Timișoara."
    },
    en: {
      title: "Page Not Found | RealTrust & ApArt Hotel",
      description: "The page you're looking for doesn't exist. Return to the homepage to explore our premium apartments in Timișoara."
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  return (
    <>
      <SEOHead 
        title={seo.title}
        description={seo.description}
        noIndex={true}
      />
      <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="absolute top-6 right-6 z-10">
          <LanguageSwitcher />
        </div>

        <div className="text-center relative z-10 px-6">
          {/* Animated 404 illustration */}
          <div className="relative mb-8">
            {/* Floating map pin */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow" />
                <div className="relative bg-gradient-to-br from-primary to-gold p-6 rounded-full animate-float shadow-elegant">
                  <MapPin className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Animated 404 text */}
            <h1 className="text-8xl md:text-9xl font-bold text-gradient-gold mb-2 animate-fade-up">
              404
            </h1>
            
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-4 mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {t.notFound.title}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {t.notFound.message}
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Button asChild size="lg" className="gap-2 shadow-elegant hover:shadow-glow transition-all duration-300">
              <a href="/">
                <Home className="w-5 h-5" />
                {t.notFound.backHome}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
