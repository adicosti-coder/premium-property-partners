import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";

const CTA = () => {
  const { t, language } = useLanguage();
  const { trackFormSubmit } = useCtaAnalytics();

  const handlePrimaryCta = () => {
    trackFormSubmit("cta_primary");
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-6">
            {language === "ro"
              ? "Transformăm apartamentele în venit lunar fără bătăi de cap pentru proprietari și investitori."
              : "We turn apartments into monthly income — hassle-free for owners and investors."}
          </h2>
          
          <p className="text-lg text-foreground/70 dark:text-muted-foreground max-w-2xl mx-auto mb-10 font-sans">
            {language === "ro"
              ? "Cumpărăm, amenajăm, administrăm și generăm venit în regim hotelier — într-un sistem complet orientat spre profit."
              : "We buy, renovate, manage and generate hotel-style income — in a fully profit-oriented system."}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="premium" size="xl" onClick={handlePrimaryCta}>
              {language === "ro" ? "Află cât poate produce apartamentul tău" : "Find out how much your apartment can earn"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <a href="/investitii">
              <Button 
                variant="outline" 
                size="xl" 
                className="border-primary/20 hover:bg-primary hover:text-primary-foreground w-full"
              >
                {language === "ro" ? "Vreau investiție profitabilă în Timișoara" : "I want a profitable investment in Timișoara"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
          
          <p className="mt-8 text-sm text-foreground/60 dark:text-muted-foreground font-sans">
            {t.cta.footer}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;