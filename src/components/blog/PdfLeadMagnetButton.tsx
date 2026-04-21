import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * End-of-article CTA that opens the InvestmentGuideLeadModal.
 * Communication is via window CustomEvent to avoid prop drilling.
 */
const PdfLeadMagnetButton = () => {
  const { language } = useLanguage();
  const open = () => {
    window.dispatchEvent(new CustomEvent("open-investment-guide-modal"));
  };
  return (
    <div className="my-12 p-6 md:p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-primary/5 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
        <FileDown className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-2">
        {language === "ro"
          ? "Descarcă Analiza Detaliată PDF"
          : "Download the detailed PDF analysis"}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-5">
        {language === "ro"
          ? "Ghidul Investițiilor Timișoara 2026 — 24 pagini cu grafice ROI, yield lunar și prognoze pe cartiere."
          : "Timișoara Investment Guide 2026 — 24 pages with ROI charts, monthly yield and neighborhood forecasts."}
      </p>
      <Button onClick={open} variant="hero" size="lg">
        <FileDown className="w-5 h-5 mr-2" />
        {language === "ro" ? "Descarcă PDF gratuit" : "Download free PDF"}
      </Button>
    </div>
  );
};

export default PdfLeadMagnetButton;
