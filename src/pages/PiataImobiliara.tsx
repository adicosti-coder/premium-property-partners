import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import MarketPulse from "@/components/MarketPulse";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, BarChart3, MapPin, ArrowRight } from "lucide-react";
import { neighborhoods } from "@/data/neighborhoods";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const PiataImobiliara = () => {
  const breadcrumbItems = [
    { label: "Acasă", href: "/" },
    { label: "Piața Imobiliară Timișoara" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Piața Imobiliară Timișoara 2026 — Prețuri și Tendințe | RealTrust"
        description="Prețuri medii pe metru pătrat în Timișoara, tendințe piață imobiliară 2026. Cele mai scumpe și accesibile cartiere. Date actualizate lunar."
        url="https://www.realtrust.ro/piata-imobiliara-timisoara"
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <PageBreadcrumb items={breadcrumbItems} />

          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-3">
              Piața Imobiliară Timișoara — Aprilie 2026
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prețuri medii pe metru pătrat, tendințe și comparații între cartiere. Date agregate din surse publice, actualizate lunar.
            </p>
          </div>

          <MarketPulse />

          {/* Neighborhood price comparison */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Prețuri pe cartiere
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {neighborhoods
                .sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm) // ROI descrescător = preț ascendent
                .map((zone) => (
                  <Link
                    key={zone.slug}
                    to={`/imobiliare-timisoara/${zone.slug}`}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {zone.fullName}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-lg font-bold text-primary">
                        {zone.avgPricePerSqm.toLocaleString("ro-RO")} €/mp
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {zone.listingsCount} proprietăți disponibile
                    </p>
                  </Link>
                ))}
            </div>
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

export default PiataImobiliara;
