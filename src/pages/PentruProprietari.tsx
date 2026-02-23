import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  Star,
  Phone,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { generatePropertyManagementServiceSchema, generateSpeakableSchema } from "@/utils/schemaGenerators";

// Componente critice încărcate normal pentru a evita "layout shift"
import PageSummary from "@/components/PageSummary";
import QuickValueBanner from "@/components/QuickValueBanner";

// Componente non-critice încărcate lazy
const OwnerBenefits = lazy(() => import("@/components/OwnerBenefits"));
const OwnerHowItWorks = lazy(() => import("@/components/OwnerHowItWorks"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const FAQ = lazy(() => import("@/components/FAQ"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const PentruProprietari = () => {
  const { language } = useLanguage();

  const content = {
    ro: {
      badge: "Pentru Proprietari de Apartamente",
      title: "Transformă-ți Proprietatea",
      titleHighlight: "într-o Sursă de Venit",
      subtitle: "Management profesional în regim hotelier cu tehnologie avansată și transparență totală. Maximizează randamentul fără stres.",
      cta: "Calculează Potențialul",
      secondaryCta: "Contactează-ne",
      stats: [
        { value: "+40%", label: "Randament Superior" },
        { value: "20%", label: "Comision" },
        { value: "+80%", label: "Ocupare" },
        { value: "24/7", label: "Suport" },
      ],
    },
    en: {
      badge: "For Apartment Owners",
      title: "Transform Your Property",
      titleHighlight: "into Income",
      subtitle: "Professional management with advanced technology and full transparency. Maximize returns without stress.",
      cta: "Calculate Potential",
      secondaryCta: "Contact Us",
      stats: [
        { value: "+40%", label: "Higher Returns" },
        { value: "20%", label: "Commission" },
        { value: "80%+", label: "Occupancy" },
        { value: "24/7", label: "Support" },
      ],
    }
  };

  const t = content[language as keyof typeof content] || content.ro;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/40723154520`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={language === "ro" ? "Pentru Proprietari | RealTrust" : "For Owners | RealTrust"}
        description="Administrare profesională apartamente regim hotelier."
      />
      <Header />
      
      {/* HERO SECTION - SCOS DIN SUSPENSE PENTRU VITEZA */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[80vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-cinematic.webp"
            alt="RealTrust Hero"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-blue-950/70" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/50 border border-amber-500/30 mb-6">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">{t.badge}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">
              {t.title} <span className="text-amber-400">{t.titleHighlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">{t.subtitle}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-bold" onClick={() => document.getElementById('calculator')?.scrollIntoView({behavior: 'smooth'})}>
                {t.cta} <ArrowRight className="ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10" onClick={handleWhatsApp}>
                {t.secondaryCta}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* RESTUL PAGINII ÎNCĂRCAT GRADUAL */}
      <Suspense fallback={<div className="h-20 flex items-center justify-center">Se încarcă...</div>}>
        <div className="container mx-auto px-6 py-12">
            <PageSummary 
                summaryRo="RealTrust oferă administrare profesională în Timișoara cu transparență totală."
                summaryEn="RealTrust provides professional management in Timisoara with full transparency."
            />
        </div>

        <OwnerBenefits />
        <OwnerHowItWorks />
        
        <section id="calculator" className="scroll-mt-24 py-12">
          <ProfitCalculator />
        </section>

        <TrustBadges />
        <FAQ />
      </Suspense>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default PentruProprietari;
