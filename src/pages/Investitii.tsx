import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-6" />
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <Card 
                  key={property.id} 
                  className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  {/* Property Image */}
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {property.image_path ? (
                      <img 
                        src={property.image_path.startsWith("http") ? property.image_path : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${property.image_path}`}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      {property.tag}
                    </Badge>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {property.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {/* Investment Metrics */}
                    <div className="space-y-3 mb-6">
                      {property.capital_necesar && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Wallet className="w-4 h-4" />
                            {t.cardCapital}
                          </div>
                          <span className="font-bold text-foreground">
                            {formatCurrency(property.capital_necesar)}
                          </span>
                        </div>
                      )}
                      
                      {property.roi_percentage && (
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            {t.cardYield}
                          </div>
                          <span className="font-bold text-green-700 dark:text-green-400 text-lg">
                            {property.roi_percentage}%
                          </span>
                        </div>
                      )}

                      {property.estimated_revenue && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BarChart3 className="w-4 h-4" />
                            {t.cardRevenue}
                          </div>
                          <span className="font-semibold text-foreground">
                            {property.estimated_revenue} €
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Link to={`/proprietate/${slugify(property.name)}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          {t.cardDetails}
                        </Button>
                      </Link>
                      <Button 
                        variant="hero" 
                        className="flex-1"
                        onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de investiția" : "Hello, I'm interested in investing in"}: ${property.name}`)}`, '_blank')}
                      >
                        {t.cardCta}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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