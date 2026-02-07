import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
// Card imports removed - using custom dark theme cards
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Building2, 
  Wallet, 
  Calculator, 
  ArrowRight, 
  Phone,
  CheckCircle2,
  BarChart3,
  Shield,
  Clock,
  MapPin
} from "lucide-react";
import { Link } from "react-router-dom";

interface InvestmentProperty {
  id: string;
  name: string;
  location: string;
  roi_percentage: string | null;
  estimated_revenue: string | null;
  capital_necesar: number | null;
  image_path: string | null;
  tag: string;
  description_ro: string;
  description_en: string;
}

const Investitii = () => {
  const { language } = useLanguage();

  // Fetch only properties with ROI data (investment opportunities)
  const { data: properties, isLoading } = useQuery({
    queryKey: ["investment-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, location, roi_percentage, estimated_revenue, capital_necesar, image_path, tag, description_ro, description_en")
        .eq("is_active", true)
        .not("roi_percentage", "is", null)
        .order("display_order");
      if (error) throw error;
      return data as InvestmentProperty[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const texts = {
    ro: {
      title: "Investiții Imobiliare",
      metaDescription: "Oportunități de investiții imobiliare în Timișoara cu randament verificat. Noi le găsim, noi le administrăm, tu încasezi profitul.",
      heroTitle: "Proprietăți cu Randament",
      heroTitleHighlight: "Verificat",
      heroSubtitle: "Noi le găsim, noi le administrăm, tu încasezi profitul.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Programează o Discuție",
      ctaCalculator: "Calculator ROI",
      gridTitle: "Oportunități Active",
      gridSubtitle: "Proprietăți cu potențial de investiție verificat și administrare profesională inclusă.",
      cardCapital: "Capital Necesar",
      cardYield: "Yield Anual Estimat",
      cardRevenue: "Venit Lunar Estimat",
      cardDetails: "Vezi Detalii",
      cardCta: "Solicită Informații",
      noProperties: "Momentan nu avem oportunități disponibile",
      noPropertiesDesc: "Contactează-ne pentru a fi notificat când apar noi proprietăți de investiție.",
      benefits: [
        { icon: Shield, title: "Due Diligence Complet", desc: "Verificăm documentația și potențialul fiecărei proprietăți" },
        { icon: BarChart3, title: "ROI Calculat Realist", desc: "Estimări bazate pe date reale de ocupare și prețuri" },
        { icon: Building2, title: "Administrare Inclusă", desc: "Operăm proprietatea după achiziție, tu doar încasezi" },
        { icon: Clock, title: "Suport Continuu", desc: "Raportare lunară și acces la dashboard în timp real" },
      ],
    },
    en: {
      title: "Real Estate Investments",
      metaDescription: "Real estate investment opportunities in Timișoara with verified returns. We find them, we manage them, you collect the profit.",
      heroTitle: "Properties with Verified",
      heroTitleHighlight: "Returns",
      heroSubtitle: "We find them, we manage them, you collect the profit.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Schedule a Discussion",
      ctaCalculator: "ROI Calculator",
      gridTitle: "Active Opportunities",
      gridSubtitle: "Properties with verified investment potential and professional management included.",
      cardCapital: "Required Capital",
      cardYield: "Est. Annual Yield",
      cardRevenue: "Est. Monthly Revenue",
      cardDetails: "View Details",
      cardCta: "Request Info",
      noProperties: "No opportunities available at the moment",
      noPropertiesDesc: "Contact us to be notified when new investment properties become available.",
      benefits: [
        { icon: Shield, title: "Complete Due Diligence", desc: "We verify documentation and potential of each property" },
        { icon: BarChart3, title: "Realistic ROI Calculations", desc: "Estimates based on real occupancy data and prices" },
        { icon: Building2, title: "Management Included", desc: "We operate the property after purchase, you just collect" },
        { icon: Clock, title: "Continuous Support", desc: "Monthly reporting and real-time dashboard access" },
      ],
    },
  };

  const t = texts[language as keyof typeof texts] || texts.ro;

  const breadcrumbItems = [
    { label: t.title }
  ];

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const slugify = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ă/g, "a")
      .replace(/â/g, "a")
      .replace(/î/g, "i")
      .replace(/ș/g, "s")
      .replace(/ț/g, "t")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={t.title + " | RealTrust"}
        description={t.metaDescription}
        url="https://realtrust.ro/investitii"
      />
      <Header />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 pt-24">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-primary border-primary/30 bg-primary/5">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t.heroBadge}
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
              {t.heroTitle}{" "}
              <span className="text-primary">{t.heroTitleHighlight}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {t.heroSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(language === "ro" ? "Bună ziua, sunt interesat de o oportunitate de investiție." : "Hello, I'm interested in an investment opportunity.")}`, '_blank')}
                className="group"
              >
                <Phone className="w-5 h-5 mr-2" />
                {t.ctaContact}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link to="/pentru-proprietari#calculator">
                <Button variant="outline" size="lg">
                  <Calculator className="w-5 h-5 mr-2" />
                  {t.ctaCalculator}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-6 bg-card rounded-xl border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {t.gridTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t.gridSubtitle}
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden">
                  <Skeleton className="h-48 w-full bg-slate-800" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-20 mb-4 bg-slate-800" />
                    <Skeleton className="h-8 w-3/4 mb-2 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 mb-6 bg-slate-800" />
                    <div className="space-y-3 border-t border-slate-700 pt-6">
                      <Skeleton className="h-6 w-full bg-slate-800" />
                      <Skeleton className="h-6 w-full bg-slate-800" />
                      <Skeleton className="h-6 w-full bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <div 
                  key={property.id} 
                  className="group bg-slate-900 text-white p-6 rounded-3xl border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10"
                >
                  {/* Property Image */}
                  <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-3xl">
                    {property.image_path ? (
                      <img 
                        src={property.image_path.startsWith("http") ? property.image_path : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${property.image_path}`}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                  </div>

                  {/* ROI Badge */}
                  {property.roi_percentage && (
                    <Badge className="bg-amber-600 text-white border-0 mb-4 px-3 py-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Top ROI: {property.roi_percentage}%
                    </Badge>
                  )}

                  {/* Property Name & Location */}
                  <h3 className="text-2xl font-serif font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-slate-400 mb-6">
                    <MapPin className="w-4 h-4" />
                    {property.location}
                  </div>

                  {/* Financial Metrics */}
                  <div className="space-y-3 mb-6 border-t border-slate-700 pt-6">
                    {property.capital_necesar && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          {t.cardCapital}
                        </span>
                        <span className="text-white font-bold text-lg">
                          {formatCurrency(property.capital_necesar)}
                        </span>
                      </div>
                    )}
                    
                    {property.estimated_revenue && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          {t.cardRevenue}
                        </span>
                        <span className="text-amber-500 font-bold text-lg">
                          €{property.estimated_revenue}
                        </span>
                      </div>
                    )}

                    {property.roi_percentage && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {t.cardYield}
                        </span>
                        <span className="text-green-400 font-bold text-lg">
                          {property.roi_percentage}%
                        </span>
                      </div>
                    )}

                    {/* Calculated yearly profit based on revenue */}
                    {property.estimated_revenue && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-300 font-medium">
                          {language === "ro" ? "Profit Anual Estimat" : "Est. Annual Profit"}
                        </span>
                        <span className="text-amber-500 font-bold text-xl">
                          €{(parseFloat(property.estimated_revenue) * 12).toLocaleString("ro-RO")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <Link to={`/proprietate/${slugify(property.name)}`} className="block">
                      <Button 
                        variant="outline" 
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500"
                      >
                        {t.cardDetails}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Button 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                      onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de investiția" : "Hello, I'm interested in investing in"}: ${property.name}`)}`, '_blank')}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {t.cardCta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.noProperties}</h3>
              <p className="text-muted-foreground mb-6">{t.noPropertiesDesc}</p>
              <Button 
                variant="hero"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(language === "ro" ? "Bună ziua, vreau să fiu notificat despre noi oportunități de investiție." : "Hello, I want to be notified about new investment opportunities.")}`, '_blank')}
              >
                <Phone className="w-5 h-5 mr-2" />
                {t.ctaContact}
              </Button>
            </div>
          )}
        </div>
      </section>

      <GlobalConversionWidgets />
      <BackToTop />
      <Footer />
    </div>
  );
};

export default Investitii;