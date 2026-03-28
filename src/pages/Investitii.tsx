import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageSummary from "@/components/PageSummary";
import { generateSpeakableSchema } from "@/utils/schemaGenerators";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import InvestmentAnalysisModal from "@/components/InvestmentAnalysisModal";
import { 
  TrendingUp, 
  Building2, 
  Wallet, 
  Calculator, 
  ArrowRight, 
  Phone,
  BarChart3,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  Star,
  FileText
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const ROICaseStudy = lazy(() => import("@/components/ROICaseStudy"));
const InvestmentEngineV34 = lazy(() => import("@/components/InvestmentEngineV34"));

interface PropertyImage {
  image_path: string;
  is_primary: boolean;
  display_order: number;
}

interface InvestmentProperty {
  id: string;
  slug: string | null;
  name: string;
  location: string;
  roi_percentage: string | null;
  estimated_revenue: string | null;
  capital_necesar: number | null;
  image_path: string | null;
  tag: string;
  description_ro: string;
  description_en: string;
  property_code: string | null;
  property_images: PropertyImage[];
}

const Investitii = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [analysisModal, setAnalysisModal] = useState<{ open: boolean; propertyId: string; propertyName: string }>({
    open: false,
    propertyId: "",
    propertyName: "",
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["investment-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, name, location, roi_percentage, estimated_revenue, capital_necesar, image_path, tag, description_ro, description_en, property_code, property_images(image_path, is_primary, display_order)")
        .eq("is_active", true)
        .eq("listing_type", "investitie")
        .order("display_order");
      if (error) throw error;
      return data as InvestmentProperty[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const texts = {
    ro: {
      title: "Investiții Imobiliare",
      metaDescription: "Oportunități de investiții imobiliare în Timișoara cu randament net 9%+ verificat. Due diligence complet, administrare profesională inclusă. Noi le găsim, noi le administrăm, tu încasezi!",
      heroTitle: "Investment",
      heroTitleHighlight: "Deal Room",
      heroSubtitle: "Oportunități exclusive cu randament verificat. Noi le găsim, noi le administrăm, tu încasezi profitul.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Programează o Discuție",
      ctaCalculator: "Calculator ROI",
      gridTitle: "Oportunități Active",
      gridSubtitle: "Proprietăți cu potențial de investiție verificat și administrare profesională inclusă.",
      cardCapital: "Capital Necesar",
      cardYield: "Randament Anual",
      cardRevenue: "Venit Lunar Estimat",
      cardOccupancy: "Grad Ocupare",
      cardDetails: "Vezi Detalii Complete",
      cardCta: "Solicită Analiză",
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
      metaDescription: "Real estate investment opportunities in Timișoara with verified 9%+ net yield. Complete due diligence, professional management included.",
      heroTitle: "Investment",
      heroTitleHighlight: "Deal Room",
      heroSubtitle: "Exclusive opportunities with verified returns. We find, manage, you collect the profit.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Schedule a Discussion",
      ctaCalculator: "ROI Calculator",
      gridTitle: "Active Opportunities",
      gridSubtitle: "Properties with verified investment potential and professional management included.",
      cardCapital: "Required Capital",
      cardYield: "Annual Yield",
      cardRevenue: "Est. Monthly Revenue",
      cardOccupancy: "Occupancy Rate",
      cardDetails: "View Full Details",
      cardCta: "Request Analysis",
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

  const breadcrumbItems = [{ label: t.title }];

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const speakableSchema = generateSpeakableSchema(
    t.title,
    "https://www.realtrust.ro/investitii",
    [".page-summary", "h1", "h2"],
  );

  return (
    <div className="dark min-h-screen bg-background">
      <SEOHead 
        title={language === "ro" ? "Investiții Imobiliare Timișoara | RealTrust" : "Real Estate Investments Timișoara | RealTrust"}
        description={t.metaDescription}
        url="https://www.realtrust.ro/investitii"
        jsonLd={speakableSchema}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://www.realtrust.ro" },
          { name: t.title, url: "https://www.realtrust.ro/investitii" },
        ]}
      />
      <Header />
      
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="RealTrust oferă oportunități de investiții imobiliare în Timișoara cu randament net verificat de 9+ ROI. Due diligence complet, administrare profesională inclusă, raportare lunară."
          summaryEn="RealTrust offers real estate investment opportunities in Timișoara with verified net yields of 9%+ ROI. Complete due diligence, professional management included."
        />
      </div>
      
      <div className="container mx-auto px-6">
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

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {[
                { value: "9.4%", label: language === "ro" ? "ROI Net Verificat" : "Verified Net ROI" },
                { value: "98%", label: language === "ro" ? "Rată de Ocupare" : "Occupancy Rate" },
                { value: "10k+", label: language === "ro" ? "Oaspeți Satisfăcuți" : "Happy Guests" },
                { value: "4.9★", label: language === "ro" ? "Rating Mediu" : "Average Rating" },
              ].map((stat, i) => (
                <div key={i} className="text-center px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-2xl font-bold font-sans text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            
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

      {/* ROI Case Study */}
      <Suspense fallback={<div className="min-h-[300px]" />}>
        <ROICaseStudy />
      </Suspense>

      {/* Investment Deal Room Grid */}
      <section className="py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
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
                  <Skeleton className="h-56 w-full bg-slate-800" />
                  <div className="p-6">
                    <Skeleton className="h-8 w-3/4 mb-4 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 mb-6 bg-slate-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full bg-slate-800" />
                      <Skeleton className="h-10 w-full bg-slate-800" />
                      <Skeleton className="h-10 w-full bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {properties.map((property) => {
                const propertyPath = `/proprietate/${property.slug ?? property.id}`;

                return (
                  <div
                    key={property.id}
                    className="group bg-slate-900 rounded-2xl sm:rounded-3xl border border-amber-500/20 hover:border-amber-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 overflow-hidden cursor-pointer"
                    onClick={() => navigate(propertyPath)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(propertyPath);
                      }
                    }}
                  >
                    {/* Image with ROI Overlay */}
                    <div className="relative h-56 overflow-hidden">
                      {(() => {
                        const imgPath = property.image_path ||
                          (property.property_images?.find(i => i.is_primary)?.image_path) ||
                          (property.property_images?.[0]?.image_path);
                        if (imgPath) {
                          const src = imgPath.startsWith("http") ? imgPath : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${imgPath}`;
                          return (
                            <img
                              src={src}
                              alt={`${property.name} — ${language === "ro" ? "apartament investiție" : "investment apartment"} ${property.location}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          );
                        }
                        return (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-slate-600" />
                          </div>
                        );
                      })()}
                      {/* Dark gradient overlay bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                      {/* ROI Golden Overlay — top right */}
                      {property.roi_percentage && (
                        <div className="absolute top-0 right-0 overflow-hidden">
                          <div className="bg-gradient-to-bl from-amber-500 via-amber-500 to-transparent w-32 h-32 flex items-start justify-end p-3">
                            <div className="text-right">
                              <span className="text-white font-sans font-black text-2xl leading-none block">
                                {property.roi_percentage}%
                              </span>
                              <span className="text-amber-100/90 text-[10px] font-bold uppercase tracking-widest">
                                ROI
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Property Code Badge */}
                      {property.property_code && (
                        <Badge className="absolute top-3 left-3 bg-slate-900/80 text-amber-400 border-amber-500/30 font-mono text-xs backdrop-blur-sm">
                          {property.property_code}
                        </Badge>
                      )}

                      {/* Property name on image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-xl font-serif font-bold text-white drop-shadow-lg group-hover:text-amber-300 transition-colors leading-tight">
                          {property.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-slate-300 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{property.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Table */}
                    <div className="p-5">
                      <table className="w-full text-sm">
                        <tbody>
                          {property.estimated_revenue && (
                            <tr className="border-b border-slate-800">
                              <td className="py-2.5 text-slate-400 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-amber-500/70" />
                                {t.cardRevenue}
                              </td>
                              <td className="py-2.5 text-right font-sans font-bold text-amber-400 text-base">
                                €{property.estimated_revenue}
                              </td>
                            </tr>
                          )}
                          {property.capital_necesar && (
                            <tr className="border-b border-slate-800">
                              <td className="py-2.5 text-slate-400 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-amber-500/70" />
                                {t.cardCapital}
                              </td>
                              <td className="py-2.5 text-right font-sans font-bold text-white text-base">
                                {formatCurrency(property.capital_necesar)}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-2.5 text-slate-400 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500/70" />
                              {t.cardOccupancy}
                            </td>
                            <td className="py-2.5 text-right font-sans font-bold text-green-400 text-base">
                              85–92%
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Annual Profit Highlight */}
                      {property.estimated_revenue && (
                        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                          <span className="text-xs text-amber-300/80 font-medium uppercase tracking-wide">
                            {language === "ro" ? "Profit Anual Est." : "Est. Annual Profit"}
                          </span>
                          <span className="font-sans font-black text-lg text-amber-400">
                            €{(parseFloat(property.estimated_revenue.replace(/\./g, '').replace(',', '.')) * 12).toLocaleString("ro-RO")}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(propertyPath);
                          }}
                        >
                          {t.cardDetails}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnalysisModal({
                              open: true,
                              propertyId: property.id,
                              propertyName: property.name,
                            });
                          }}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          {t.cardCta}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

          <div className="mt-16">
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <InvestmentEngineV34 defaultPrice={95000} defaultRent={450} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <div className="flex justify-center mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 fill-primary text-primary" />)}
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {language === "ro" ? "Gata să Investești Inteligent?" : "Ready to Invest Smart?"}
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            {language === "ro"
              ? "Echipa noastră îți răspunde în mai puțin de 2 ore. Fără costuri ascunse, fără angajamente."
              : "Our team replies in under 2 hours. No hidden costs, no commitments."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="lg"
              className="group px-8"
              onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(language === "ro" ? "Bună ziua, vreau să discutăm despre o oportunitate de investiție imobiliară în Timișoara." : "Hello, I'd like to discuss a real estate investment opportunity in Timișoara.")}`, '_blank')}
            >
              <Phone className="w-5 h-5 mr-2" />
              {language === "ro" ? "Discută pe WhatsApp" : "Chat on WhatsApp"}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link to="/preturi">
              <Button variant="outline" size="lg" className="px-8">
                {language === "ro" ? "Vezi Pachete & Prețuri" : "View Packages & Pricing"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Analysis Request Modal */}
      <InvestmentAnalysisModal
        open={analysisModal.open}
        onOpenChange={(open) => setAnalysisModal(prev => ({ ...prev, open }))}
        propertyId={analysisModal.propertyId}
        propertyName={analysisModal.propertyName}
      />

      <GlobalConversionWidgets />
      <BackToTop />
      <Footer />
    </div>
  );
};

export default Investitii;