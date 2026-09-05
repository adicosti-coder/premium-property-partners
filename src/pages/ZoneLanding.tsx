import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Shield, TrendingUp, ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const PropertyGallery = lazy(() => import("@/components/PropertyGallery"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const ROICaseStudySection = lazy(() => import("@/components/ROICaseStudySection"));
const FAQ = lazy(() => import("@/components/FAQ"));
const PageSummary = lazy(() => import("@/components/PageSummary"));
const InvestorInsightLink = lazy(() => import("@/components/blog/InvestorInsightLink"));

interface ZoneData {
  slug: string;
  name: string;
  nameEn: string;
  heroTitle: string;
  heroTitleEn: string;
  heroSubtitle: string;
  heroSubtitleEn: string;
  description: string;
  descriptionEn: string;
  highlights: string[];
  highlightsEn: string[];
  avgPrice: string;
  occupancy: string;
  rating: string;
  seoTitle: string;
  seoTitleEn: string;
  seoDescription: string;
  seoDescriptionEn: string;
  summaryRo: string;
  summaryEn: string;
}

const zones: Record<string, ZoneData> = {
  centru: {
    slug: "centru",
    name: "Centrul Istoric",
    nameEn: "Old Town Center",
    heroTitle: "Cazare Premium în Centrul Istoric Timișoara",
    heroTitleEn: "Premium Accommodation in Timișoara Old Town",
    heroSubtitle: "Apartamente gestionate profesional la 2 minute de Piața Victoriei și Piața Unirii",
    heroSubtitleEn: "Professionally managed apartments 2 minutes from Victory Square and Union Square",
    description: "Centrul Istoric al Timișoarei este inima culturală și turistică a orașului. Cu arhitectura barocă, restaurantele premium și viața de noapte vibrantă, această zonă atrage cei mai mulți turiști și generează cele mai mari venituri per noapte din Timișoara.",
    descriptionEn: "Timișoara's Old Town is the cultural and tourist heart of the city. With baroque architecture, premium restaurants, and vibrant nightlife, this area attracts the most tourists and generates the highest nightly income in Timișoara.",
    highlights: [
      "Piața Victoriei la 2 minute de mers pe jos",
      "Restaurante și cafenele premium",
      "Transport public excelent — tramvai, autobuz",
      "Rata de ocupare: 92-98%",
      "Venit mediu: €950-1.400/lună",
    ],
    highlightsEn: [
      "Victory Square 2 minutes walk",
      "Premium restaurants and cafes",
      "Excellent public transport — tram, bus",
      "Occupancy rate: 92-98%",
      "Average income: €950-1,400/month",
    ],
    avgPrice: "€65-95",
    occupancy: "95%",
    rating: "4.9",
    seoTitle: "Cazare Regim Hotelier Centrul Istoric Timișoara — lângă Piața Victoriei",
    seoTitleEn: "Hotel-Regime Accommodation Old Town Timișoara — near Victory Square",
    seoDescription: "Cazare regim hotelier în Centrul Istoric Timișoara, la 2 min de Piața Victoriei. Apartamente premium gestionate profesional, check-in inteligent, rating 4.9/5.",
    seoDescriptionEn: "Hotel-regime accommodation in Timișoara Old Town, 2 min from Victory Square. Premium apartments, smart check-in, 4.9/5 rating.",
    summaryRo: "Cazare regim hotelier în Centrul Istoric Timișoara: apartamente gestionate profesional cu check-in inteligent, rating 4.9/5, ocupare 95%, la 2 minute de Piața Victoriei. Ideal pentru turiști și investitori.",
    summaryEn: "Hotel-regime accommodation in Timișoara Old Town: professionally managed apartments with smart check-in, 4.9/5 rating, 95% occupancy, 2 minutes from Victory Square.",
  },
  "iulius-town": {
    slug: "iulius-town",
    name: "Iulius Town & Dâmbovița",
    nameEn: "Iulius Town & Dâmbovița",
    heroTitle: "Cazare Modernă lângă Iulius Town Timișoara",
    heroTitleEn: "Modern Accommodation near Iulius Town Timișoara",
    heroSubtitle: "Apartamente noi în complexe rezidențiale premium, la 5 minute de cel mai mare mall din vestul României",
    heroSubtitleEn: "New apartments in premium residential complexes, 5 minutes from the largest mall in western Romania",
    description: "Zona Iulius Town și Dâmbovița este cel mai dinamic cartier din Timișoara, cu complexe rezidențiale noi, birouri IT și cel mai mare centru comercial din vestul României. Ideală pentru turiști de business și familii.",
    descriptionEn: "The Iulius Town and Dâmbovița area is the most dynamic neighborhood in Timișoara, with new residential complexes, IT offices, and the largest shopping center in western Romania. Ideal for business tourists and families.",
    highlights: [
      "Iulius Town Mall la 5 minute",
      "Complexe rezidențiale noi (2020+)",
      "Zona IT — Continental, Hella, Atos",
      "Rata de ocupare: 85-92%",
      "Venit mediu: €800-1.200/lună",
    ],
    highlightsEn: [
      "Iulius Town Mall 5 minutes away",
      "New residential complexes (2020+)",
      "IT zone — Continental, Hella, Atos",
      "Occupancy rate: 85-92%",
      "Average income: €800-1,200/month",
    ],
    avgPrice: "€55-80",
    occupancy: "88%",
    rating: "4.8",
    seoTitle: "Cazare Regim Hotelier lângă Iulius Town Timișoara",
    seoTitleEn: "Hotel-Regime Accommodation near Iulius Town Timișoara",
    seoDescription: "Cazare regim hotelier lângă Iulius Town Mall Timișoara — apartamente moderne, smart lock, rating 4.8/5. Ideal business & familii.",
    seoDescriptionEn: "Hotel-regime accommodation near Iulius Town Mall Timișoara — modern apartments, smart lock, 4.8/5 rating. Ideal for business & families.",
    summaryRo: "Cazare regim hotelier lângă Iulius Town Timișoara: apartamente noi în complexe rezidențiale premium, smart lock, rating 4.8/5, ocupare 88%. Ideal business și familii.",
    summaryEn: "Hotel-regime accommodation near Iulius Town Timișoara: new apartments in premium residential complexes, smart lock, 4.8/5 rating, 88% occupancy.",
  },
  fabric: {
    slug: "fabric",
    name: "Fabric & Aradului",
    nameEn: "Fabric & Aradului",
    heroTitle: "Cazare Autentică în Fabric Timișoara",
    heroTitleEn: "Authentic Accommodation in Fabric Timișoara",
    heroSubtitle: "Cartierul cu cel mai mare potențial de creștere — apartamente renovate în zona Fabric și Aradului",
    heroSubtitleEn: "The neighborhood with the highest growth potential — renovated apartments in Fabric and Aradului area",
    description: "Fabric este cartierul cu cea mai mare creștere din Timișoara, cu investiții masive în infrastructură și un mix unic de clădiri istorice renovate și proiecte noi. Prețurile de achiziție sunt cu 20-30% mai mici decât în centru, dar veniturile din regim hotelier sunt comparabile.",
    descriptionEn: "Fabric is Timișoara's fastest-growing neighborhood, with massive infrastructure investments and a unique mix of renovated historic buildings and new projects. Purchase prices are 20-30% lower than downtown, but hospitality income is comparable.",
    highlights: [
      "Prețuri de achiziție cu 20-30% sub centru",
      "ROI superior: 10-12% anual",
      "Investiții masive în infrastructură",
      "Rata de ocupare: 82-90%",
      "Venit mediu: €750-1.100/lună",
    ],
    highlightsEn: [
      "Purchase prices 20-30% below downtown",
      "Superior ROI: 10-12% annually",
      "Massive infrastructure investments",
      "Occupancy rate: 82-90%",
      "Average income: €750-1,100/month",
    ],
    avgPrice: "€45-70",
    occupancy: "85%",
    rating: "4.7",
    seoTitle: "Cazare Regim Hotelier Fabric & Aradului Timișoara",
    seoTitleEn: "Hotel-Regime Accommodation Fabric & Aradului Timișoara",
    seoDescription: "Cazare regim hotelier în Fabric Timișoara — apartamente renovate lângă Calea Aradului, ROI 10%+, prețuri accesibile, potențial maxim de creștere.",
    seoDescriptionEn: "Hotel-regime accommodation in Fabric Timișoara — renovated apartments near Aradului, ROI 10%+, affordable prices, maximum growth potential.",
    summaryRo: "Cazare regim hotelier în Fabric Timișoara: apartamente renovate cu ROI 10%+, prețuri cu 20-30% sub centru. Cartierul cu cel mai mare potențial de creștere din Timișoara.",
    summaryEn: "Hotel-regime accommodation in Fabric Timișoara: renovated apartments with 10%+ ROI, prices 20-30% below downtown. Timișoara's highest growth potential neighborhood.",
  },
};

const ZoneLanding = () => {
  const { zone } = useParams<{ zone: string }>();
  const { language } = useLanguage();
  const data = zones[zone || ""] || zones.centru;

  const t = {
    ro: {
      avgPrice: "Preț mediu/noapte",
      occupancy: "Ocupare medie",
      rating: "Rating",
      cta: "Vezi Apartamentele Disponibile",
      ctaOwner: "Vreau să Listez Proprietatea",
      whyZone: "De ce",
      investHere: "pentru investiția ta?",
    },
    en: {
      avgPrice: "Avg price/night",
      occupancy: "Avg occupancy",
      rating: "Rating",
      cta: "View Available Apartments",
      ctaOwner: "I Want to List My Property",
      whyZone: "Why",
      investHere: "for your investment?",
    },
  };
  const text = t[language as keyof typeof t] || t.ro;
  const title = language === "en" ? data.heroTitleEn : data.heroTitle;
  const subtitle = language === "en" ? data.heroSubtitleEn : data.heroSubtitle;
  const desc = language === "en" ? data.descriptionEn : data.description;
  const highlights = language === "en" ? data.highlightsEn : data.highlights;

  // A zone page describes a place + the accommodation offer there — it is not
  // itself a LodgingBusiness, and it carries no review content, so no rating.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: language === "en" ? data.seoTitleEn : data.seoTitle,
    description: language === "en" ? data.seoDescriptionEn : data.seoDescription,
    url: `https://realtrust.ro/zona/${data.slug}`,
    about: {
      "@type": "Place",
      name: `${data.name}, Timișoara`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Timișoara",
        addressRegion: "Timiș",
        addressCountry: "RO",
      },
    },
    provider: { "@id": "https://realtrust.ro/#lodgingbusiness" },
  };


  return (
    <>
      <SEOHead
        title={language === "en" ? data.seoTitleEn : data.seoTitle}
        description={language === "en" ? data.seoDescriptionEn : data.seoDescription}
        url={`https://realtrust.ro/zona/${data.slug}`}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
          { name: data.name, url: `https://realtrust.ro/zona/${data.slug}` },
        ]}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative pt-32 pb-20 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4">
            <PageBreadcrumb
              items={[
                { label: language === "ro" ? "Acasă" : "Home", href: "/" },
                { label: language === "ro" ? "Zone" : "Zones" },
                { label: data.name },
              ]}
            />

            <div className="max-w-3xl mt-8">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-primary font-semibold">{data.name}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
                {title}
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {subtitle}
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mb-8">
                {[
                  { label: text.avgPrice, value: data.avgPrice, icon: <TrendingUp className="w-4 h-4" /> },
                  { label: text.occupancy, value: data.occupancy, icon: <Star className="w-4 h-4" /> },
                  { label: text.rating, value: `${data.rating}/5 ⭐`, icon: <Shield className="w-4 h-4" /> },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                    <div className="text-primary">{stat.icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/oaspeti">
                  <Button variant="premium" size="xl">
                    {text.cta}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/pentru-proprietari">
                  <Button variant="outline" size="xl">
                    {text.ctaOwner}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Description + Highlights */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">
                  {text.whyZone} {data.name} {text.investHere}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {desc}
                </p>
                <Link to="/pentru-proprietari" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                  {language === "ro" ? "Ghid complet pentru proprietari" : "Complete guide for owners"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Investor Insight — internal link to pillar guide */}
        <section className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={null}>
              <InvestorInsightLink zoneName={data.name} language={language as "ro" | "en"} />
            </Suspense>
          </div>
        </section>

        {/* Properties */}
        <Suspense fallback={null}>
          <PropertyGallery />
        </Suspense>

        {/* ROI Case Study */}
        <Suspense fallback={null}>
          <ROICaseStudySection />
        </Suspense>

        {/* FAQ */}
        <Suspense fallback={null}>
          <FAQ />
        </Suspense>

        {/* Contact CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
              {language === "ro" ? "Ai o proprietate în" : "Have a property in"} {data.name}?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {language === "ro"
                ? "Contactează-ne pentru o evaluare gratuită a potențialului de venit al proprietății tale."
                : "Contact us for a free evaluation of your property's income potential."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="https://wa.me/40799069256" target="_blank" rel="noopener noreferrer">
                <Button variant="premium" size="xl">
                  <Phone className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <Link to="/pentru-proprietari">
                <Button variant="outline" size="xl">
                  {language === "ro" ? "Ghid Investitor 2026" : "Investor Guide 2026"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <PageSummary
            summaryRo={data.summaryRo}
            summaryEn={data.summaryEn}
          />
        </Suspense>
      </main>

      <Footer />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </>
  );
};

export default ZoneLanding;
