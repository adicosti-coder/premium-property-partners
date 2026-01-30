import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

interface PropertyQualificationProps {
  onContact?: () => void;
}

const PropertyQualification = ({ onContact }: PropertyQualificationProps) => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      title: "Este Proprietatea Ta Potrivită?",
      subtitle: "Verifică rapid dacă apartamentul tău se califică pentru administrare hotelieră",
      suitable: {
        title: "Potrivit pentru Noi",
        items: [
          "Apartament în Timișoara sau zonă metropolitană",
          "Mobilat complet și echipat",
          "Curățenie și aspectul general bune",
          "Aproape de transport public sau zone centrale",
          "Disponibil pentru închiriere pe termen scurt",
          "Proprietar deschis la colaborare profesională",
        ],
      },
      notSuitable: {
        title: "Nu este Momentul Potrivit",
        items: [
          "Necesită renovări majore",
          "Mobilier vechi sau deteriorat",
          "Locație greu accesibilă",
          "Bloc cu reguli împotriva regimului hotelier",
          "Disponibil doar pentru perioade foarte scurte",
        ],
      },
      cta: "Cere Evaluare Gratuită",
      ctaNote: "Răspundem în 24h cu recomandări personalizate",
    },
    en: {
      title: "Is Your Property Suitable?",
      subtitle: "Quickly check if your apartment qualifies for hotel-style management",
      suitable: {
        title: "Suitable for Us",
        items: [
          "Apartment in Timișoara or metropolitan area",
          "Fully furnished and equipped",
          "Good cleanliness and general appearance",
          "Close to public transport or central areas",
          "Available for short-term rental",
          "Owner open to professional collaboration",
        ],
      },
      notSuitable: {
        title: "Not the Right Time",
        items: [
          "Requires major renovations",
          "Old or damaged furniture",
          "Hard to access location",
          "Building with rules against short-term rental",
          "Available only for very short periods",
        ],
      },
      cta: "Request Free Evaluation",
      ctaNote: "We respond within 24h with personalized recommendations",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section className="py-16 bg-card">
      <div
        ref={ref}
        className={cn(
          "container mx-auto px-6 transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Two Columns */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Suitable */}
          <div
            className={cn(
              "p-6 rounded-2xl border-2 border-green-500/30 bg-green-500/5",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                {t.suitable.title}
              </h3>
            </div>

            <ul className="space-y-3">
              {t.suitable.items.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Not Suitable */}
          <div
            className={cn(
              "p-6 rounded-2xl border-2 border-red-500/30 bg-red-500/5",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "300ms" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                {t.notSuitable.title}
              </h3>
            </div>

            <ul className="space-y-3">
              {t.notSuitable.items.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div
          className={cn(
            "text-center transition-all duration-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "400ms" }}
        >
          <Button onClick={onContact} variant="hero" size="xl" className="group">
            {t.cta}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">{t.ctaNote}</p>
        </div>
      </div>
    </section>
  );
};

export default PropertyQualification;
