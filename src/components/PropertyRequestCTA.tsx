import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import PropertyRequestModal from "@/components/PropertyRequestModal";

interface PropertyRequestCTAProps {
  sourceProperty?: string;
  variant?: "card" | "inline";
}

const PropertyRequestCTA = ({ sourceProperty, variant = "card" }: PropertyRequestCTAProps) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const t = language === "ro" ? {
    title: "Nu ai găsit ce cauți?",
    desc: "Spune-ne preferințele tale și echipa noastră va căuta pentru tine — gratuit și fără obligații.",
    cta: "Caută pentru mine",
  } : {
    title: "Haven't found what you're looking for?",
    desc: "Tell us your preferences and our team will search for you — free and with no obligation.",
    cta: "Search for me",
  };

  if (variant === "inline") {
    return (
      <>
        <button onClick={() => setOpen(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
          <Search className="w-3.5 h-3.5" />
          {t.cta}
        </button>
        <PropertyRequestModal open={open} onOpenChange={setOpen} sourceProperty={sourceProperty} />
      </>
    );
  }

  return (
    <>
      <section className="py-10">
        <div className="container mx-auto px-6">
          <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-serif font-semibold mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
              <Button variant="premium" size="lg" className="shrink-0 gap-2" onClick={() => setOpen(true)}>
                {t.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      <PropertyRequestModal open={open} onOpenChange={setOpen} sourceProperty={sourceProperty} />
    </>
  );
};

export default PropertyRequestCTA;
