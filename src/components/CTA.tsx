import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const CTA = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-6">
            {t.cta.title} <span className="text-gradient-gold">{t.cta.titleHighlight}</span>?
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 font-sans">
            {t.cta.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="premium" size="xl">
              {t.cta.primaryButton}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" className="border-primary/20 hover:bg-primary hover:text-cream">
              <Phone className="mr-2 h-5 w-5" />
              {t.cta.secondaryButton}
            </Button>
          </div>
          
          <p className="mt-8 text-sm text-muted-foreground font-sans">
            {t.cta.footer}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;