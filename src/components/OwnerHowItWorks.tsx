import { ClipboardCheck, Cog, TrendingUp, ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const OwnerHowItWorks = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      label: "Cum Funcționează",
      title: "3 Pași Simpli pentru a",
      titleHighlight: "Genera Venit Pasiv",
      subtitle: "De la prima discuție la primul venit — totul durează sub 7 zile.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Evaluare Gratuită",
          description: "Analizăm proprietatea ta, estimăm potențialul de venit și pregătim un plan personalizat de optimizare.",
          detail: "Durează doar 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Pregătim Totul",
          description: "Fotografii profesionale, listare pe platforme, self check-in digital, și optimizarea prețurilor automat.",
          detail: "Listare în 3-5 zile",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Încasezi Venituri",
          description: "Gestionăm oaspeții, curățenia și mentenanța. Tu primești banii direct în cont cu rapoarte transparente.",
          detail: "Plăți lunare garantate",
        },
      ],
    },
    en: {
      label: "How It Works",
      title: "3 Simple Steps to",
      titleHighlight: "Generate Passive Income",
      subtitle: "From first call to first income — everything takes under 7 days.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Free Evaluation",
          description: "We analyze your property, estimate income potential, and prepare a personalized optimization plan.",
          detail: "Takes only 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "We Set Everything Up",
          description: "Professional photos, platform listings, digital self check-in, and automatic pricing optimization.",
          detail: "Listed in 3-5 days",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "You Earn Income",
          description: "We manage guests, cleaning, and maintenance. You receive money directly with transparent reports.",
          detail: "Guaranteed monthly payments",
        },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section id="cum-functioneaza-proprietari" className="section-padding bg-gradient-subtle">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4 font-sans">
            {t.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.title}{" "}
            <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div ref={gridRef} className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connector lines between steps (desktop) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {t.steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`relative group text-center transition-all duration-500 ${
                    gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: gridVisible ? `${index * 150}ms` : "0ms" }}
                >
                  {/* Icon with number */}
                  <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="w-28 h-28 rounded-2xl bg-card border border-border shadow-card flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-elegant transition-all duration-300">
                      <Icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center font-sans shadow-lg">
                      {step.number}
                    </span>
                    {/* Arrow between steps (desktop) */}
                    {index < 2 && (
                      <ArrowRight className="hidden md:block absolute -right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                    )}
                  </div>

                  <h3 className="text-xl lg:text-2xl heading-premium text-foreground mb-3">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground text-premium mb-4 max-w-xs mx-auto">
                    {step.description}
                  </p>

                  {/* Detail badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {step.detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerHowItWorks;
