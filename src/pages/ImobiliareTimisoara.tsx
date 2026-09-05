import { Link } from "react-router-dom";
import { MapPin, TrendingUp, Building2, ArrowRight, Loader2, Calculator, LineChart, TreePine, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { REAL_ESTATE_AGENT_ID } from "@/lib/orgIdentity";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import RealPropertyCard from "@/components/RealPropertyCard";
import { neighborhoods } from "@/data/neighborhoods";
import { useNeighborhoodProperties } from "@/hooks/useNeighborhoodProperties";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { lazy, Suspense } from "react";
import { CompareProvider } from "@/contexts/CompareContext";
import ContextualLinks from "@/components/seo/ContextualLinks";
import { CLUSTER_LINKS } from "@/lib/internalLinking";


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

  // Zone hub: a CollectionPage about the areas served. The agency identity
  // itself lives in the canonical RealEstateAgent node (no duplicate business).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://realtrust.ro/cartiere",
    name: "Imobiliare Timișoara — apartamente pe cartiere",
    description:
      "Apartamente de vânzare din Timișoara, organizate pe cartiere, cu prețuri actualizate și randamente calculate transparent.",
    url: "https://realtrust.ro/cartiere",
    about: { "@id": REAL_ESTATE_AGENT_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: neighborhoods.map((n, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: `${n.fullName}, Timișoara`,
        url: `https://realtrust.ro/imobiliare-timisoara/${n.slug}`,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Imobiliare Timișoara — apartamente pe zone | RealTrust"
        description="Explorează apartamentele de vânzare din Timișoara, pe cartiere: Girocului, Aradului, Circumvalațiunii, Șagului, Complex Studențesc, Calea Lipovei, ISHO. Prețuri actualizate și randamente calculate transparent."
        url="https://realtrust.ro/cartiere"
        jsonLd={jsonLd}
        breadcrumbItems={[
          { name: "Acasă", url: "https://realtrust.ro" },
          { name: "Imobiliare Timișoara", url: "https://realtrust.ro/cartiere" },
        ]}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <PageBreadcrumb items={breadcrumbItems} />

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-4">
              Apartamente de vânzare în Timișoara
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Piața imobiliară din Timișoara, organizată pe cartiere: prețuri actualizate, proprietăți evaluate și administrare profesională disponibilă la cerere.
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
              <CompareProvider>
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
                <Suspense fallback={null}>
                  <CompareDrawer />
                </Suspense>
              </CompareProvider>
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

          {/* Evaluare apartament */}
          <section id="evaluare" className="mb-16 rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                  Evaluare apartament Timișoara — află prețul corect
                </h2>
                <p className="text-muted-foreground">
                  Vrei să vinzi sau să refinanțezi? Evaluarea gratuită RealTrust analizează cartierul (Centru, ISHO, Dumbrăvița, Giroc, Chișoda, Complex Studențesc), suprafața, anul construcției și comparabile recente. Primești raport în 24h.
                </p>
              </div>
            </div>
            <Link
              to="/evaluare-gratuita"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Solicită evaluare gratuită <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Prețuri & tendințe */}
          <section id="preturi" className="mb-16">
            <div className="flex items-center gap-2 mb-4">
              <LineChart className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Prețuri imobiliare Timișoara — tendințe 2026
              </h2>
            </div>
            <p className="text-muted-foreground mb-6 max-w-3xl">
              Piața imobiliară din Timișoara continuă aprecierea în 2026. Prețurile medii pe metru pătrat au crescut cu 5-8% față de 2025, susținute de cererea pentru proiecte noi și de expansiunea zonelor metropolitane Giroc, Chișoda și Dumbrăvița.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { zone: "Centru & ISHO", price: "2.400-2.600 €/mp", trend: "+6% YoY" },
                { zone: "Dumbrăvița & Giroc", price: "1.800-2.100 €/mp", trend: "+8% YoY" },
                { zone: "Aradului & Lipovei", price: "1.500-1.700 €/mp", trend: "+5% YoY" },
                { zone: "Complex Studențesc", price: "1.900-2.200 €/mp", trend: "+7% YoY" },
                { zone: "Chișoda & Moșnița", price: "1.400-1.700 €/mp", trend: "+9% YoY" },
                { zone: "Mehala & Ronaț", price: "1.300-1.500 €/mp", trend: "+4% YoY" },
              ].map((item) => (
                <div key={item.zone} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{item.zone}</p>
                  <p className="text-lg font-bold text-primary mt-1">{item.price}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.trend}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Terenuri */}
          <section id="terenuri" className="mb-16 rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <TreePine className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                  Terenuri de vânzare Timișoara, Giroc, Chișoda
                </h2>
                <p className="text-muted-foreground mb-3">
                  Intermediem terenuri intravilane și extravilane în Timișoara și zonele metropolitane <strong>Giroc</strong>, <strong>Chișoda</strong>, Moșnița Nouă, Dumbrăvița și Ghiroda — pentru construcție casă, dezvoltare rezidențială sau investiție pe termen lung.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Discută cu un consultant <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Market Pulse */}
          <div id="market-pulse">
            <Suspense fallback={<div className="min-h-[300px]" />}>
              <MarketPulse />
            </Suspense>
          </div>

          {/* FAQ */}
          <section id="faq" className="mt-16">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Întrebări frecvente — imobiliare Timișoara
              </h2>
            </div>
            <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
              {faqItems.map((item, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="last:border-b-0">
                  <AccordionTrigger className="text-left text-foreground">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default ImobiliareTimisoara;
