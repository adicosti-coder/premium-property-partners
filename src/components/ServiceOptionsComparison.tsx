import { AlertTriangle, Minus, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const ServiceOptionsComparison = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.1 });

  const options = [
    {
      number: 1,
      labelRo: "Simplu",
      labelEn: "Simple",
      titleRo: "Chirie clasică",
      titleEn: "Classic Rental",
      forWhoRo: "vrei stabilitate, cu randament limitat.",
      forWhoEn: "you want stability, with limited returns.",
      featuresRo: [
        "Venit fix lunar",
        "Fără dynamic pricing / sezonalitate",
        "Fără hotelizare, fără KPI-uri"
      ],
      featuresEn: [
        "Fixed monthly income",
        "No dynamic pricing / seasonality",
        "No hotel-style service, no KPIs"
      ],
      yieldRo: "Scăzut",
      yieldEn: "Low",
      yieldIcon: AlertTriangle,
      yieldColor: "text-amber-500",
      dotColor: "bg-amber-500",
      recommended: false,
    },
    {
      number: 2,
      labelRo: "Delegare parțială",
      labelEn: "Partial Delegation",
      titleRo: "Administrare de bază",
      titleEn: "Basic Management",
      forWhoRo: "vrei venit variabil, cu implicare minimă.",
      forWhoEn: "you want variable income, with minimal involvement.",
      featuresRo: [
        "Listare + comunicare + coordonare curățenie",
        "Prețuri semi-optimizate",
        "Raport lunar (rezumat)"
      ],
      featuresEn: [
        "Listing + communication + cleaning coordination",
        "Semi-optimized pricing",
        "Monthly report (summary)"
      ],
      yieldRo: "Mediu",
      yieldEn: "Medium",
      yieldIcon: Minus,
      yieldColor: "text-muted-foreground",
      dotColor: "bg-muted-foreground",
      recommended: false,
    },
    {
      number: 3,
      labelRo: "Recomandat",
      labelEn: "Recommended",
      titleRo: "Sistem ApArt Hotel",
      titleEn: "ApArt Hotel System",
      forWhoRo: "vrei randament maximizat, predictibil și transparent.",
      forWhoEn: "you want maximized, predictable and transparent returns.",
      featuresRo: [
        "Hotelizare completă + standard premium",
        "Dynamic pricing + optimizare conversie",
        "Plăți directe la proprietar + KPI-uri clare"
      ],
      featuresEn: [
        "Complete hotel-style service + premium standard",
        "Dynamic pricing + conversion optimization",
        "Direct payments to owner + clear KPIs"
      ],
      yieldRo: "Maximizat",
      yieldEn: "Maximized",
      yieldIcon: CheckCircle2,
      yieldColor: "text-primary",
      dotColor: "bg-primary",
      recommended: true,
    },
  ];

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-card relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {language === 'ro' ? 'Opțiuni' : 'Options'}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {language === 'ro' ? 'Cele 3 opțiuni' : 'The 3 options'}{' '}
            <span className="text-muted-foreground font-normal">
              – {language === 'ro' ? 'același sistem, nivel diferit de implicare' : 'same system, different involvement level'}
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ro'
              ? 'Alegi cât de mult vrei să delegi. Noi standardizăm, optimizăm și raportăm.'
              : 'Choose how much you want to delegate. We standardize, optimize, and report.'}
          </p>
        </div>

        {/* Options Cards */}
        <div
          ref={cardsRef}
          className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {options.map((option, index) => {
            const YieldIcon = option.yieldIcon;
            return (
              <div
                key={index}
                className={`relative p-6 rounded-2xl border transition-all duration-500 ${
                  option.recommended
                    ? 'bg-gradient-to-b from-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10'
                    : 'bg-secondary/30 border-border hover:border-primary/20'
                } ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: cardsVisible ? `${index * 100}ms` : '0ms' }}
              >
                {/* Label */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-3 h-3 rounded-full ${option.dotColor}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {language === 'ro' ? `Opțiunea ${option.number}` : `Option ${option.number}`} · {language === 'ro' ? option.labelRo : option.labelEn}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                  {language === 'ro' ? option.titleRo : option.titleEn}
                </h3>

                {/* For who */}
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">{language === 'ro' ? 'Pentru cine:' : 'For whom:'}</strong>{' '}
                  {language === 'ro' ? option.forWhoRo : option.forWhoEn}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {(language === 'ro' ? option.featuresRo : option.featuresEn).map((feature, fIndex) => (
                    <li key={fIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Yield indicator */}
                <div className={`flex items-center gap-2 ${option.yieldColor}`}>
                  <YieldIcon className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {language === 'ro' ? 'Randament' : 'Yield'} {language === 'ro' ? option.yieldRo : option.yieldEn}
                  </span>
                </div>

                {/* CTA for recommended */}
                {option.recommended && (
                  <Button
                    variant="hero"
                    className="w-full mt-6"
                    onClick={scrollToContact}
                  >
                    {language === 'ro' ? 'Vreau analiza gratuită' : 'Get free analysis'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceOptionsComparison;
