import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ROICalculatorWidget from "@/components/ROICalculatorWidget";
import { lazy, Suspense } from "react";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const CalculatorROI = () => {
  const breadcrumbItems = [
    { label: "Acasă", href: "/" },
    { label: "Calculator ROI" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Calculator ROI Regim Hotelier vs Chirie Clasică | RealTrust"
        description="Calculează randamentul apartamentului tău: regim hotelier vs chirie clasică. Compară veniturile lunare și ROI-ul anual cu management RealTrust."
        url="https://www.realtrust.ro/calculator-roi"
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageBreadcrumb items={breadcrumbItems} />

          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-3">
              Calculator ROI — Regim Hotelier
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Află cât poate câștiga apartamentul tău în regim hotelier față de chiria clasică. Ajustează valorile și vezi rezultatele în timp real.
            </p>
          </div>

          <ROICalculatorWidget />
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

export default CalculatorROI;
