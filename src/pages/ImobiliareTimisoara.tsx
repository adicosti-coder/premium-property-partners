import { Link } from "react-router-dom";
import { MapPin, TrendingUp, Building2, ArrowRight, Loader2, Calculator, LineChart, TreePine, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import RealPropertyCard from "@/components/RealPropertyCard";
import { neighborhoods } from "@/data/neighborhoods";
import { useNeighborhoodProperties } from "@/hooks/useNeighborhoodProperties";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { lazy, Suspense } from "react";


const MarketPulse = lazy(() => import("@/components/MarketPulse"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const CompareDrawer = lazy(() => import("@/components/CompareDrawer"));

const ImobiliareTimisoara = () => {
  const { properties, countsBySlug, isLoading } = useNeighborhoodProperties();
  const liveNeighborhoodProperties = properties.filter((property) => property.neighborhood_slug);
  const breadcrumbItems = [
    { label: "Acasă", href: "/" },
    { label: "Imobiliare Timișoara" },
  ];

  const tocItems = [
    { id: "live", label: "Anunțuri live" },
    { id: "neighborhoods", label: "Cartiere" },
    { id: "evaluare", label: "Evaluare apartament" },
    { id: "preturi", label: "Prețuri & tendințe" },
    { id: "terenuri", label: "Terenuri Giroc & Chișoda" },
    { id: "market-pulse", label: "Market Pulse" },
    { id: "faq", label: "Întrebări frecvente" },
  ];

  const faqItems = [
    {
      question: "Cum se face evaluarea unui apartament în Timișoara?",
      answer: "Evaluarea apartamentului în Timișoara se realizează gratuit de RealTrust, ținând cont de cartier (Centru, ISHO, Dumbrăvița, Giroc, Chișoda), suprafață utilă, an construcție, finisaje și prețurile comparabile recente. Primești un raport în 24h.",
    },
    {
      question: "Care sunt prețurile imobiliare în Timișoara în 2026?",
      answer: "Prețurile medii pe metru pătrat în Timișoara variază între 1.400 €/mp (Mehala, Ronaț) și 2.600 €/mp (Centru, ISHO). Dumbrăvița și Giroc se situează la 1.800-2.100 €/mp, cu apreciere anuală de 5-8% pentru proiectele noi.",
    },
    {
      question: "Vindeți și terenuri în Timișoara, Giroc sau Chișoda?",
      answer: "Da, intermediem terenuri intravilane și extravilane în Timișoara și zonele metropolitane Giroc, Chișoda, Moșnița Nouă, Dumbrăvița și Ghiroda — pentru construcție casă, dezvoltare rezidențială sau investiție pe termen lung.",
    },
    {
      question: "Care sunt cele mai active cartiere pentru investiții?",
      answer: "ISHO, Centru, Complex Studențesc și Dumbrăvița domină cererea de regim hotelier. Giroc și Chișoda atrag familii pentru locuință, iar Aradului și Lipovei oferă cele mai bune randamente la închiriere clasică.",
    },
  ];

  useRegisterFAQs("imobiliare-timisoara", faqItems);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "RealTrust Imobiliare Timișoara",
    description: "Agenție imobiliară premium din Timișoara specializată în vânzări, investiții și administrare apartamente în regim hotelier.",
    url: "https://www.realtrust.ro/imobiliare-timisoara",
    telephone: "+40723154520",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Timișoara",
      addressRegion: "Timiș",
      addressCountry: "RO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 45.7489,
      longitude: 21.2087,
    },
    areaServed: neighborhoods.map((n) => ({
      "@type": "Place",
      name: `${n.fullName}, Timișoara`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Imobiliare Timișoara — Apartamente pe Zone | RealTrust"
        description="Explorează apartamentele de vânzare din Timișoara pe zone: Girocului, Aradului, Circumvalațiunii, Șagului, Complex Studențesc, Calea Lipovei, ISHO. Prețuri actuale, randamente verificate."
        url="https://www.realtrust.ro/imobiliare-timisoara"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <PageBreadcrumb items={breadcrumbItems} />

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-4">
              Apartamente de Vânzare în Timișoara
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explorează piața imobiliară din Timișoara pe cartiere. Prețuri actualizate, proprietăți verificate și administrare profesională RealTrust.
            </p>
          </div>

          {/* Table of Contents */}
          <nav aria-label="Cuprins pagină" className="mb-12 rounded-2xl border border-border bg-card/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">Cuprins</p>
            <ul className="flex flex-wrap gap-2">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div id="live" />
          {(isLoading || liveNeighborhoodProperties.length > 0) && (
            <section className="mb-16">
              <div className="mb-6 space-y-3">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {isLoading ? "Se încarcă inventarul live" : `${liveNeighborhoodProperties.length} anunțuri live`}
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                  Anunțuri live din /imobiliare și /investiții
                </h2>
                <p className="max-w-3xl text-sm md:text-base text-muted-foreground">
                  Proprietăți active preluate automat din inventarul RealTrust și repartizate pe cartierele relevante din Timișoara.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-border bg-card/60 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...liveNeighborhoodProperties]
                    .sort((a, b) => {
                      const roiA = parseFloat(a.roi_percentage ?? "0") || 0;
                      const roiB = parseFloat(b.roi_percentage ?? "0") || 0;
                      return roiB - roiA;
                    })
                    .map((property) => (
                      <RealPropertyCard key={property.id} property={property} />
                    ))}
                </div>
              )}
            </section>
          )}

          {/* Neighborhood Grid */}
          <div id="neighborhoods" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {neighborhoods
              .map((zone) => {
                const liveCount = countsBySlug[zone.slug] || 0;
                const totalCount = liveCount + zone.listingsCount;

                return (
                  <Link
                    key={zone.slug}
                    to={`/imobiliare-timisoara/${zone.slug}`}
                    className="group bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
                  >
                    {/* Image placeholder */}
                    <div className="h-40 bg-gradient-to-br from-primary/10 via-muted/30 to-muted/50 flex items-center justify-center relative">
                      <Building2 className="w-12 h-12 text-primary/30" />
                      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground">
                          {totalCount} anunțuri
                        </div>
                        {liveCount > 0 && (
                          <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1.5 text-xs font-semibold">
                            {liveCount} live
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {zone.fullName}
                      </h2>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          {zone.avgPricePerSqm.toLocaleString('ro-RO')} €/mp
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Timișoara
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {zone.description.slice(0, 120)}...
                      </p>

                      <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                        Vezi apartamente <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>

          {/* Market Pulse */}
          <Suspense fallback={<div className="min-h-[300px]" />}>
            <MarketPulse />
          </Suspense>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <Suspense fallback={null}>
        <CompareDrawer />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default ImobiliareTimisoara;
