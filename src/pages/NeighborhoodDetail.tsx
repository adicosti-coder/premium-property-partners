import { useParams, Link, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import NeighborhoodPropertyCard from "@/components/NeighborhoodPropertyCard";
import RealPropertyCard from "@/components/RealPropertyCard";
import CompareDrawer from "@/components/CompareDrawer";

import { getNeighborhoodBySlug } from "@/data/neighborhoods";
import { useNeighborhoodProperties } from "@/hooks/useNeighborhoodProperties";
import { MapPin, TrendingUp, Home, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lazy, Suspense } from "react";
import { CompareProvider } from "@/contexts/CompareContext";

const MarketPulse = lazy(() => import("@/components/MarketPulse"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const InvestorInsightLink = lazy(() => import("@/components/blog/InvestorInsightLink"));

const NeighborhoodDetail = () => {
  const { zona } = useParams<{ zona: string }>();
  const neighborhood = zona ? getNeighborhoodBySlug(zona) : undefined;
  const { properties, isLoading } = useNeighborhoodProperties(zona);

  if (!neighborhood) {
    return <Navigate to="/cartiere" replace />;
  }

  const breadcrumbItems = [
    { label: "Imobiliare Timișoara", href: "/cartiere" },
    { label: neighborhood.fullName },
  ];

  const totalCount = properties.length + neighborhood.listings.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={neighborhood.metaTitle}
        description={neighborhood.metaDescription}
        url={`https://realtrust.ro/imobiliare-timisoara/${neighborhood.slug}`}
        breadcrumbItems={[
          { name: "Acasă", url: "https://realtrust.ro" },
          { name: "Imobiliare Timișoara", url: "https://realtrust.ro/cartiere" },
          {
            name: neighborhood.fullName,
            url: `https://realtrust.ro/imobiliare-timisoara/${neighborhood.slug}`,
          },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: `Apartamente ${neighborhood.fullName} Timișoara`,
            description: neighborhood.metaDescription,
            url: `https://realtrust.ro/imobiliare-timisoara/${neighborhood.slug}`,
            address: { "@type": "PostalAddress", addressLocality: "Timișoara", addressRegion: "Timiș", addressCountry: "RO" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: neighborhood.faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
        ]}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <PageBreadcrumb items={breadcrumbItems} />

          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              Apartamente de vânzare în {neighborhood.fullName}, Timișoara
            </h1>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                {neighborhood.avgPricePerSqm.toLocaleString('ro-RO')} €/mp medie
              </div>
              <div className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm">
                <Home className="w-4 h-4" />
                {totalCount} proprietăți disponibile
              </div>
              <div className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm">
                <MapPin className="w-4 h-4" />
                Timișoara, Timiș
              </div>
            </div>

            {/* Description */}
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              {neighborhood.description}
            </p>
          </div>

          <CompareProvider>
            {/* Real DB Properties */}
            {(isLoading || properties.length > 0) && (
              <div className="mb-12">
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Anunțuri active — verificate RealTrust
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Proprietăți reale din portofoliul nostru de investiții și vânzări.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...properties]
                    .sort((a, b) => {
                      const roiA = parseFloat(a.roi_percentage ?? "0") || 0;
                      const roiB = parseFloat(b.roi_percentage ?? "0") || 0;
                      return roiB - roiA;
                    })
                    .map((p) => (
                      <RealPropertyCard key={p.id} property={p} />
                    ))}
                </div>
              )}
              </div>
            )}

            {/* Static Listings */}
            <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {properties.length > 0
                ? `Mai multe proprietăți în ${neighborhood.fullName}`
                : `Proprietăți disponibile în ${neighborhood.fullName}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {neighborhood.listings.map((listing) => (
                <NeighborhoodPropertyCard key={listing.id} listing={listing} />
              ))}
            </div>
            </div>
            <CompareDrawer />
          </CompareProvider>

          {/* Investor Insight — internal link to pillar guide */}
          <Suspense fallback={null}>
            <InvestorInsightLink zoneName={neighborhood.fullName} language="ro" />
          </Suspense>

          {/* CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 text-center mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Cauți altceva în {neighborhood.fullName}?
            </h2>
            <p className="text-muted-foreground mb-4">
              Contactează un consultant RealTrust pentru proprietăți exclusive care nu sunt listate public.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild>
                <a href="tel:+40799069256">
                  <Phone className="w-4 h-4 mr-2" />
                  Sună acum: 0799 069 256
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/evaluare-gratuita">
                  Evaluare gratuită
                </Link>
              </Button>
            </div>
          </div>

          {/* FAQ */}
          {neighborhood.faq.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Întrebări frecvente — {neighborhood.fullName}
              </h2>
              <div className="space-y-4">
                {neighborhood.faq.map((f, i) => (
                  <details
                    key={i}
                    className="group bg-card border border-border rounded-xl overflow-hidden"
                  >
                    <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground hover:text-primary transition-colors list-none flex items-center justify-between">
                      {f.question}
                      <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {f.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Contextual internal links — ansambluri din zonă, investiții, servicii */}
          <ContextualLinks
            title={`Explorează mai departe zona ${neighborhood.fullName}`}
            intro="Ansambluri, servicii și analize legate direct de această zonă din Timișoara."
            links={buildNeighborhoodLinks(neighborhood.slug, neighborhood.fullName)}
          />

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
      <BackToTop />
    </div>
  );
};

export default NeighborhoodDetail;
