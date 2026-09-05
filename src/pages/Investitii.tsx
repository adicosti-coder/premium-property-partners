import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOFooterText from "@/components/SEOFooterText";
import SEOHead from "@/components/SEOHead";
import { FINANCIAL_SERVICE_SCHEMA } from "@/lib/orgIdentity";
import PageSummary from "@/components/PageSummary";
import { generateSpeakableSchema } from "@/utils/schemaGenerators";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import InvestmentAnalysisModal from "@/components/InvestmentAnalysisModal";
import ContextualLinks from "@/components/seo/ContextualLinks";
import { CLUSTER_LINKS } from "@/lib/internalLinking";
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
import InvestorGuideButton from "@/components/InvestorGuideButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { Download, HelpCircle } from "lucide-react";
import { storageImage, storageImageSrcSet } from "@/utils/supabaseImage";

const ROICaseStudy = lazy(() => import("@/components/ROICaseStudy"));
const InvestmentEngineV34 = lazy(() => import("@/components/InvestmentEngineV34"));
const InvestmentYieldCalculator = lazy(() => import("@/components/InvestmentYieldCalculator"));

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
      title: "Investiții imobiliare",
      metaDescription: "Investiții imobiliare în Timișoara cu RealTrust: ROI net țintă 9,4% pe ipoteze publice, due diligence și administrare inclusă. Analiză gratuită 2026.",
      heroTitle: "Investment",
      heroTitleHighlight: "Deal Room",
      heroSubtitle: "Oportunități selectate, cu randament țintă calculat transparent. Le identificăm, le administrăm, tu primești venitul net.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Programează o discuție",
      ctaCalculator: "Calculator ROI",
      gridTitle: "Oportunități active",
      gridSubtitle: "Proprietăți cu potențial de investiție evaluat și administrare profesională inclusă.",
      cardCapital: "Capital necesar",
      cardYield: "Randament anual țintă",
      cardRevenue: "Venit lunar estimat",
      cardOccupancy: "Grad de ocupare",
      cardDetails: "Vezi detalii complete",
      cardCta: "Solicită analiză",
      noProperties: "Momentan nu avem oportunități disponibile",
      noPropertiesDesc: "Lasă-ne datele tale și te anunțăm când apar noi proprietăți de investiție.",
      benefits: [
        { icon: Shield, title: "Due diligence complet", desc: "Verificăm documentația și potențialul fiecărei proprietăți" },
        { icon: BarChart3, title: "ROI calculat realist", desc: "Estimări bazate pe date reale de ocupare și prețuri" },
        { icon: Building2, title: "Administrare inclusă", desc: "Operăm proprietatea după achiziție, tu primești raportul" },
        { icon: Clock, title: "Suport continuu", desc: "Raportare lunară și acces oricând la dashboard" },
      ],
    },
    en: {
      title: "Real estate investments",
      metaDescription: "Real estate investment opportunities in Timișoara: 9.4% target net yield on public assumptions, full due diligence, professional management included.",
      heroTitle: "Investment",
      heroTitleHighlight: "Deal Room",
      heroSubtitle: "Curated opportunities with target returns calculated transparently. We source and manage them, you receive the net income.",
      heroBadge: "Deal Room · RealTrust",
      ctaContact: "Schedule a discussion",
      ctaCalculator: "ROI calculator",
      gridTitle: "Active opportunities",
      gridSubtitle: "Properties with evaluated investment potential and professional management included.",
      cardCapital: "Required capital",
      cardYield: "Target annual yield",
      cardRevenue: "Est. monthly revenue",
      cardOccupancy: "Occupancy rate",
      cardDetails: "View full details",
      cardCta: "Request analysis",
      noProperties: "No opportunities available at the moment",
      noPropertiesDesc: "Leave your details and we'll notify you when new investment properties become available.",
      benefits: [
        { icon: Shield, title: "Full due diligence", desc: "We verify documentation and the potential of each property" },
        { icon: BarChart3, title: "Realistic ROI calculations", desc: "Estimates based on real occupancy data and prices" },
        { icon: Building2, title: "Management included", desc: "We operate the property after purchase, you receive the report" },
        { icon: Clock, title: "Continuous support", desc: "Monthly reporting and anytime access to the dashboard" },
      ],
    },
  };

  const t = texts[language as keyof typeof texts] || texts.ro;

  const faqItems = language === "ro" ? [
    {
      question: "Care este randamentul mediu pentru o investiție imobiliară în Timișoara?",
      answer: "Pentru regim hotelier administrat de noi, randamentul net țintă este de 9,4% pe an, calculat pe ipoteze publice (ocupare 75%, deducere 27% pentru management, costuri și taxe). În chirie clasică pe termen lung, randamentul tipic în Timișoara este 4-5% net.",
    },
    {
      question: "Care sunt zonele cu cel mai bun potențial pentru investiții?",
      answer: "Zonele cu potențial ridicat: ISHO (proximitate Iulius Town), Complex Studențesc (cerere studenți și Bulevardul Vasile Pârvan), Centrul Istoric (turism), Iosefin/Elisabetin (regenerare urbană) și zonele metropolitane Dumbrăvița, Ghiroda și Giroc (case noi).",
    },
    {
      question: "Cât capital am nevoie pentru o investiție la cheie în Timișoara?",
      answer: "Pentru o garsonieră în regim hotelier la cheie (achiziție + amenajare + dotare): 60.000 € – 85.000 €. Pentru un apartament 2 camere: 95.000 € – 130.000 €. Includem amenajarea completă, mobilier, electrocasnice și fotografii profesionale.",
    },
    {
      question: "Ce taxe notariale și de tranzacție sunt la cumpărarea unui apartament?",
      answer: "Taxele notariale variază între 0,4% și 1,6% din prețul tranzacției (degresiv). Se adaugă aproximativ 0,5% pentru intabulare la Cartea Funciară și impozitul pe transfer (1% pentru proprietăți peste 450.000 lei deținute mai puțin de 3 ani). Total estimat: 1,5-2,5% din preț.",
    },
    {
      question: "Cum funcționează serviciul de investiție imobiliară la cheie?",
      answer: "Gestionăm întregul proces: identificarea proprietății potrivite, due diligence, negocierea prețului, asistență la actul notarial, amenajarea și dotarea apartamentului, listarea pe Booking și Airbnb și administrarea operațională. Tu semnezi și primești raportul lunar.",
    },
    {
      question: "Care este evoluția prețurilor imobiliare în Timișoara?",
      answer: "În ultimii 5 ani, prețurile au crescut cu aproximativ 35-45% în zonele centrale (ISHO, Centrul Istoric) și cu 50-60% în zonele metropolitane (Dumbrăvița, Giroc, Chișoda). Pentru 2026 estimăm o creștere moderată de 5-8%, cu cel mai bun potențial în Iosefin și Complex Studențesc.",
    },
  ] : [
    {
      question: "What is the average yield for a real estate investment in Timișoara?",
      answer: "For hotel-style management by our team, the target net yield is 9.4% per year, calculated on public assumptions (75% occupancy, 27% deduction for management, costs and taxes). Classic long-term rentals in Timișoara typically yield 4-5% net.",
    },
    {
      question: "What are the best areas for real estate investment in Timișoara?",
      answer: "Highest-potential zones: ISHO (near Iulius Town), Student Complex (student demand + Vasile Pârvan Boulevard), Historic Center (tourism), Iosefin/Elisabetin (urban regeneration), and metropolitan areas Dumbrăvița, Ghiroda and Giroc (new houses).",
    },
    {
      question: "How much capital do I need for a turnkey investment in Timișoara?",
      answer: "Studio in turnkey hotel-style (purchase + renovation + furnishing): €60,000–€85,000. 2-room apartment: €95,000–€130,000. We include full renovation, furniture, appliances and professional photography.",
    },
    {
      question: "What notary and transaction fees apply when buying an apartment?",
      answer: "Notary fees range 0.4–1.6% of transaction price (degressive). Add ~0.5% for Land Registry and transfer tax (1% for properties over 450,000 RON owned less than 3 years). Total estimate: 1.5–2.5% of price.",
    },
    {
      question: "How does the turnkey real estate investment service work?",
      answer: "We manage the entire process: property sourcing, due diligence, price negotiation, notary support, full renovation and furnishing, listing on Booking/Airbnb and operational management. You sign and receive the monthly report.",
    },
    {
      question: "What is the price trend for Timișoara real estate?",
      answer: "Last 5 years: prices grew ~35-45% in central areas (ISHO, Historic Center) and 50-60% in metropolitan areas (Dumbrăvița, Giroc, Chișoda). For 2026 we forecast moderate 5-8% growth, with best upside in Iosefin and Student Complex.",
    },
  ];

  useRegisterFAQs("investitii-page", faqItems);

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
    "https://realtrust.ro/investitii",
    [".page-summary", "h1", "h2"],
  );

  return (
    <div className="dark min-h-screen bg-background">
      <SEOHead 
        title={language === "ro" ? "Investiții imobiliare în Timișoara | Randament 9,4% net țintă | RealTrust" : "Real estate investments in Timișoara | 9.4% target net yield | RealTrust"}
        description={t.metaDescription}
        url="https://realtrust.ro/investitii"
        jsonLd={[speakableSchema, FINANCIAL_SERVICE_SCHEMA as unknown as Record<string, unknown>]}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
          { name: t.title, url: "https://realtrust.ro/investitii" },
        ]}
      />
      <Header />

      <main id="main-content" role="main" aria-label={language === "ro" ? "Conținut principal" : "Main content"}>
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="Oportunități de investiție imobiliară în Timișoara cu randament net țintă de 9,4% calculat pe ipoteze publice (ocupare 75%, deducere 27%). Due diligence complet, administrare profesională inclusă, raportare lunară."
          summaryEn="Real estate investment opportunities in Timișoara with a 9.4% target net yield calculated on public assumptions (75% occupancy, 27% deduction). Full due diligence, professional management included, monthly reporting."
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
                { value: "9,4%", label: language === "ro" ? "ROI net țintă" : "Target net ROI" },
                { value: "~75%", label: language === "ro" ? "Ocupare medie" : "Average occupancy" },
                { value: "10k+", label: language === "ro" ? "Sejururi în portofoliu" : "Stays in portfolio" },
                { value: "9,7/10", label: language === "ro" ? "Scor recenzii" : "Reviews score" },
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
                onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(language === "ro" ? "Bună ziua, sunt interesat de o oportunitate de investiție." : "Hello, I'm interested in an investment opportunity.")}`, '_blank', 'noopener,noreferrer')}
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

      {/* Investment Yield Calculator */}
      <Suspense fallback={<div className="min-h-[300px]" />}>
        <InvestmentYieldCalculator />
      </Suspense>

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
              {[...properties].sort((a, b) => {
                const roiA = parseFloat(a.roi_percentage || "0");
                const roiB = parseFloat(b.roi_percentage || "0");
                return roiB - roiA;
              }).map((property) => {
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
                              src={storageImage(src, { width: 400 })}
                              srcSet={storageImageSrcSet(src)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              alt={`${property.name} — ${language === "ro" ? "apartament investiție" : "investment apartment"} ${property.location}`}
                              width={400}
                              height={300}
                              loading="lazy"
                              decoding="async"
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
                          {property.name
                            .replace(/[,|·\-–—]\s*(Randament|Yield|ROI)\s*\+?\d+[\.,]?\d*%?\s*(Net)?\s*/gi, '')
                            .replace(/\s*(Randament|Yield|ROI)\s*\+?\d+[\.,]?\d*%?\s*(Net)?\s*/gi, '')
                            .replace(/\s*[|·\-–—]\s*$/, '')
                            .trim()}
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
                onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(language === "ro" ? "Bună ziua, vreau să fiu notificat despre noi oportunități de investiție." : "Hello, I want to be notified about new investment opportunities.")}`, '_blank', 'noopener,noreferrer')}
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

      {/* Free Investor Guide 2026 — Lead Magnet Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-amber-500/5 via-background to-blue-950/10 border-y border-amber-500/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="outline" className="mb-4 px-3 py-1 text-amber-500 border-amber-500/40 bg-amber-500/5">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {language === "ro" ? "Descărcare Gratuită" : "Free Download"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 leading-tight">
                {language === "ro"
                  ? "Ghidul Investitorului Imobiliar Timișoara 2026"
                  : "Timișoara Real Estate Investor Guide 2026"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ro"
                  ? "Analiză completă PDF, gratuită, cu evoluția prețurilor pe cartiere, randamente verificate, taxe notariale și calculator de investiție la cheie. Folosit de peste 1.200 de investitori din Timișoara."
                  : "Complete free PDF analysis with neighborhood price trends, verified yields, notary fees and turnkey investment calculator. Used by 1,200+ investors in Timișoara."}
              </p>
              <ul className="space-y-2 mb-6">
                {(language === "ro" ? [
                  "Evoluția prețurilor 2021–2026 pe cartiere",
                  "Randament regim hotelier vs. chirie clasică",
                  "Taxe notariale, intabulare CF, impozit transfer",
                  "Top 10 ansambluri rezidențiale 2026",
                ] : [
                  "Price trends 2021–2026 by neighborhood",
                  "Hotel-style yield vs. classic rental",
                  "Notary fees, Land Registry, transfer tax",
                  "Top 10 residential complexes 2026",
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <InvestorGuideButton />
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative w-64 h-80 rounded-xl bg-gradient-to-br from-blue-900 to-blue-950 border border-amber-500/30 shadow-2xl shadow-amber-500/10 flex flex-col items-center justify-center p-6 text-center transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <FileText className="w-16 h-16 text-amber-400 mb-4" />
                <p className="text-xs uppercase tracking-widest text-amber-300/70 mb-2">
                  {language === "ro" ? "Ediția 2026" : "2026 Edition"}
                </p>
                <p className="text-xl font-serif font-bold text-white mb-2">
                  Investor Guide
                </p>
                <p className="text-xs text-blue-200/70">
                  Timișoara Real Estate
                </p>
                <div className="absolute bottom-4 text-[10px] text-amber-400/60 uppercase tracking-wider">
                  RealTrust · 48 pages
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — Generates FAQPage schema */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
              {language === "ro"
                ? "Întrebări frecvente despre investiții imobiliare în Timișoara"
                : "Frequently asked questions about real estate investment in Timișoara"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ro"
                ? "Răspunsuri la cele mai comune întrebări despre randament, zone, taxe și serviciul la cheie."
                : "Answers to common questions about yield, zones, taxes and turnkey service."}
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
              onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(language === "ro" ? "Bună ziua, vreau să discutăm despre o oportunitate de investiție imobiliară în Timișoara." : "Hello, I'd like to discuss a real estate investment opportunity in Timișoara.")}`, '_blank', 'noopener,noreferrer')}
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
      {/* GEO — direct answers owned by the investment pillar */}
      {language === "ro" && (
        <section className="pb-4">
          <div className="container mx-auto px-6 max-w-5xl">
            <GeoAnswers
              group="investitii"
              title="Răspunsuri directe despre investițiile imobiliare din Timișoara"
              intro="Întrebările pe care le primim cel mai des înainte de o achiziție de investiție, cu răspunsul scurt și trimitere la pagina care explică pe larg."
            />
            <DataProvenance
              className="mb-4"
              external={[
                "Prețurile de achiziție folosite în exemple provin din anunțurile pe care le intermediem și din listările publice de pe piața din Timișoara.",
                "Taxele notariale, de intabulare și impozitele se verifică la sursă (ANAF, notar public) înainte de fiecare tranzacție.",
              ]}
              assumptions={[
                "Ocupare medie 75% pe an pentru regim hotelier.",
                "Deducere operațională și fiscală de aproximativ 27% din încasări, fără comisionul de administrare.",
                "Randament net de referință 9,4% pe an, raportat la capitalul total investit.",
                "Venit brut în regim hotelier de aproximativ 1,6× chiria clasică, pentru apartamente comparabile bine poziționate.",
              ]}
              calculations={[
                "Exemplu: 120.000 € capital investit × 9,4% ≈ 11.280 € net pe an (~940 €/lună). Este un scenariu, nu un venit garantat.",
                "Simulările din calculatorul de randament aplică aceleași ipoteze pe datele introduse de utilizator.",
              ]}
              verifiedOn="5 septembrie 2026"
            />
          </div>
        </section>
      )}

      {/* Contextual internal links — cluster investiții */}
      <section className="pb-8">

        <div className="container mx-auto px-6 max-w-5xl">
          <ContextualLinks
            title={language === "ro" ? "Următorii pași pentru investitori" : "Next steps for investors"}
            intro={
              language === "ro"
                ? "Catalog, simulări de randament, zone și ansambluri — tot ce urmează după această pagină."
                : "Catalogue, yield simulations, areas and complexes — everything that follows this page."
            }
            links={CLUSTER_LINKS.investitii}
          />
        </div>
      </section>
      </main>

      {/* Analysis Request Modal */}
      <InvestmentAnalysisModal
        open={analysisModal.open}
        onOpenChange={(open) => setAnalysisModal(prev => ({ ...prev, open }))}
        propertyId={analysisModal.propertyId}
        propertyName={analysisModal.propertyName}
      />

      <GlobalConversionWidgets />
      <BackToTop />
      <SEOFooterText pageType="catalog" city="Timișoara" />
      <Footer />
    </div>
  );
};

export default Investitii;