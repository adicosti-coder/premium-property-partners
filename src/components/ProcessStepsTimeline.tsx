import { 
  ClipboardCheck, 
  Settings, 
  Globe, 
  Users, 
  TrendingUp, 
  BarChart3 
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const ProcessStepsTimeline = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollAnimation({ threshold: 0.1 });

  const steps = [
    {
      number: 1,
      icon: ClipboardCheck,
      titleRo: "Analiză & estimare în 24h",
      titleEn: "Analysis & estimate in 24h",
      descriptionRo: "Îți spunem realist ce poate produce proprietatea și ce upgrade-uri merită.",
      descriptionEn: "We realistically tell you what your property can generate and which upgrades are worth it.",
    },
    {
      number: 2,
      icon: Settings,
      titleRo: "Setup hotel-grade",
      titleEn: "Hotel-grade setup",
      descriptionRo: "Standard, reguli, check-in, kit-uri, proceduri, prețuri inițiale și calendar.",
      descriptionEn: "Standard, rules, check-in, kits, procedures, initial prices and calendar.",
    },
    {
      number: 3,
      icon: Globe,
      titleRo: "Listare & distribuție",
      titleEn: "Listing & distribution",
      descriptionRo: "Foto, copy, canale, sincronizare, politici — totul pregătit pentru conversie.",
      descriptionEn: "Photos, copy, channels, sync, policies — everything ready for conversion.",
    },
    {
      number: 4,
      icon: Users,
      titleRo: "Operare zilnică",
      titleEn: "Daily operations",
      descriptionRo: "Oaspeți, comunicare, curățenie, consumabile, mentenanță — fără stres pentru tine.",
      descriptionEn: "Guests, communication, cleaning, supplies, maintenance — no stress for you.",
    },
    {
      number: 5,
      icon: TrendingUp,
      titleRo: "Pricing dinamic",
      titleEn: "Dynamic pricing",
      descriptionRo: "Optimizăm prețul pe cerere, evenimente și sezonalitate pentru venit maxim.",
      descriptionEn: "We optimize prices based on demand, events and seasonality for maximum revenue.",
    },
    {
      number: 6,
      icon: BarChart3,
      titleRo: "Raportare & optimizare",
      titleEn: "Reporting & optimization",
      descriptionRo: "Rapoarte clare + plan de îmbunătățiri. Decizii pe date, nu pe presupuneri.",
      descriptionEn: "Clear reports + improvement plan. Data-driven decisions, not assumptions.",
    },
  ];

  return (
    <section className="py-20 bg-card relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {language === 'ro' ? 'Proces' : 'Process'}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {language === 'ro' ? 'Cum lucrăm, pas cu pas' : 'How we work, step by step'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ro'
              ? 'Un sistem repetabil: de la evaluare la randament și recenzii.'
              : 'A repeatable system: from evaluation to yield and reviews.'}
          </p>
        </div>

        {/* Steps Grid */}
        <div
          ref={stepsRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={`relative transition-all duration-500 ${
                  stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: stepsVisible ? `${index * 100}ms` : '0ms' }}
              >
                {/* Step number */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{step.number}</span>
                  </div>
                  
                  <div className="flex-1 pt-1">
                    {/* Icon and Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-serif font-semibold text-foreground">
                        {language === 'ro' ? step.titleRo : step.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {language === 'ro' ? step.descriptionRo : step.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Connector line (hidden on last items in row) */}
                {index < steps.length - 1 && (index + 1) % 3 !== 0 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%+1rem)] w-8 h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProcessStepsTimeline;
