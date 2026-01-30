import { useState } from "react";
import { Building2, Home, BedDouble, Users, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyTypeSelectorProps {
  onSelect?: (type: "studio" | "apartment") => void;
  onContinue?: (type: "studio" | "apartment") => void;
}

const PropertyTypeSelector = ({ onSelect, onContinue }: PropertyTypeSelectorProps) => {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<"studio" | "apartment" | null>(null);

  const content = {
    ro: {
      title: "Ce Tip de Proprietate Ai?",
      subtitle: "Selectează pentru a vedea recomandări personalizate",
      studio: {
        title: "Garsonieră / Studio",
        description: "Până la 45mp, ideal pentru turiști solo sau cupluri",
        features: ["Tarif mediu: 150-200 RON/noapte", "Ocupare ridicată", "Turnaround rapid"],
      },
      apartment: {
        title: "Apartament 2-3 Camere",
        description: "45-90mp, perfect pentru familii sau grupuri",
        features: ["Tarif mediu: 250-400 RON/noapte", "Sejururi mai lungi", "Venit superior"],
      },
      cta: "Calculează Potențialul",
    },
    en: {
      title: "What Type of Property Do You Have?",
      subtitle: "Select to see personalized recommendations",
      studio: {
        title: "Studio Apartment",
        description: "Up to 45sqm, ideal for solo travelers or couples",
        features: ["Average rate: €35-45/night", "High occupancy", "Quick turnaround"],
      },
      apartment: {
        title: "2-3 Bedroom Apartment",
        description: "45-90sqm, perfect for families or groups",
        features: ["Average rate: €55-90/night", "Longer stays", "Higher revenue"],
      },
      cta: "Calculate Potential",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const handleSelect = (type: "studio" | "apartment") => {
    setSelected(type);
    onSelect?.(type);
  };

  const handleContinue = () => {
    if (selected) {
      onContinue?.(selected);
    }
  };

  const options = [
    {
      id: "studio" as const,
      icon: BedDouble,
      ...t.studio,
    },
    {
      id: "apartment" as const,
      icon: Home,
      ...t.apartment,
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {language === "ro" ? "Personalizare" : "Personalization"}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "group relative p-6 rounded-2xl border-2 text-left transition-all duration-300",
                  "hover:shadow-lg hover:scale-[1.02]",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-primary"
                  )}
                >
                  <Icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2">{option.title}</h3>
                <p className="text-muted-foreground mb-4">{option.description}</p>

                {/* Features */}
                <ul className="space-y-2">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        {selected && (
          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              variant="hero"
              size="xl"
              className="group animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {t.cta}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PropertyTypeSelector;
