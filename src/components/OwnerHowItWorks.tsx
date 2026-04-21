import { ClipboardCheck, Cog, TrendingUp, ArrowRight, BarChart3, CheckCircle2, TrendingDown } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const OwnerHowItWorks = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      label: "Cum Funcționează",
      title: "3 pași până la",
      titleHighlight: "primul venit",
      subtitle: "De la prima discuție la prima încasare — sub 7 zile. Tu semnezi un singur contract. Restul facem noi.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Evaluare gratuită, calibrată pe date reale",
          description: "Estimăm venitul lunar pe intervale recalibrate trimestrial din portofoliul nostru în regim hotelier (75–85% ocupare, tarife 2025–2026, comisioane Booking/Airbnb deduse). Fără promisiuni umflate — doar cifre verificate pe apartamente similare din zona ta.",
          detail: "Răspuns în 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Onboarding complet, gestionat de noi",
          description: "Fotografii profesionale, listare pe 30+ canale, self check-in digital, pricing dinamic și toate procedurile hoteliere — pregătite la cheie de echipa noastră.",
          detail: "Live în 3-5 zile",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Încasezi lunar, fără bătăi de cap",
          description: "Operăm tot: oaspeți, curățenie, mentenanță, comunicare. Tu primești banii direct în cont, cu raport financiar detaliat în fiecare lună — comparat cu estimarea inițială pentru transparență totală.",
          detail: "Plăți lunare garantate",
        },
      ],
    },
    en: {
      label: "How It Works",
      title: "3 steps to your",
      titleHighlight: "first payout",
      subtitle: "From first call to first payout — under 7 days. You sign one contract. We handle the rest.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Free evaluation, calibrated on real data",
          description: "We estimate monthly income using ranges recalibrated quarterly from our hotel-regime portfolio (75–85% occupancy, 2025–2026 rates, Booking/Airbnb fees deducted). No inflated promises — only verified figures from comparable apartments in your area.",
          detail: "Answer in 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Full onboarding, handled by us",
          description: "Professional photography, listing on 30+ channels, digital self check-in, dynamic pricing and all hotel-grade procedures — set up turnkey by our team.",
          detail: "Live in 3-5 days",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Monthly income, zero hassle",
          description: "We run everything: guests, cleaning, maintenance, communication. You receive money directly in your account, with a detailed monthly report — benchmarked against the initial estimate for full transparency.",
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
