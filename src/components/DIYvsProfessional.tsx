import { CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

const DIYvsProfessional = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      title: "Singur vs. Cu Noi",
      subtitle: "Compară efortul și rezultatele între administrarea pe cont propriu și managementul profesional",
      diy: {
        title: "Administrare Proprie",
        subtitle: "Tu faci totul",
        timeLabel: "Timp investit / lună",
        timeValue: "40-60 ore",
        items: [
          { text: "Răspunzi la mesaje 24/7", negative: true },
          { text: "Organizezi curățenia singur", negative: true },
          { text: "Gestionezi check-in/out personal", negative: true },
          { text: "Rezolvi urgențele noaptea", negative: true },
          { text: "Stabilești prețurile manual", negative: true },
          { text: "Te ocupi de recenzii și reclamații", negative: true },
        ],
        footer: "Stres ridicat, timp pierdut",
      },
      professional: {
        title: "Cu RealTrust",
        subtitle: "Noi ne ocupăm de tot",
        timeLabel: "Timp investit / lună",
        timeValue: "0 ore",
        items: [
          { text: "Comunicare profesională 24/7", positive: true },
          { text: "Echipă de curățenie dedicată", positive: true },
          { text: "Self check-in automatizat", positive: true },
          { text: "Suport tehnic non-stop", positive: true },
          { text: "Algoritm de pricing dinamic", positive: true },
          { text: "Managementul reputației inclus", positive: true },
        ],
        footer: "+40% venituri, 0 stres",
      },
      highlight: "20% comision din încasările nete — restul e al tău",
    },
    en: {
      title: "DIY vs. With Us",
      subtitle: "Compare effort and results between self-management and professional management",
      diy: {
        title: "Self Management",
        subtitle: "You do everything",
        timeLabel: "Time invested / month",
        timeValue: "40-60 hours",
        items: [
          { text: "Answer messages 24/7", negative: true },
          { text: "Organize cleaning yourself", negative: true },
          { text: "Handle check-in/out personally", negative: true },
          { text: "Solve emergencies at night", negative: true },
          { text: "Set prices manually", negative: true },
          { text: "Handle reviews and complaints", negative: true },
        ],
        footer: "High stress, lost time",
      },
      professional: {
        title: "With RealTrust",
        subtitle: "We handle everything",
        timeLabel: "Time invested / month",
        timeValue: "0 hours",
        items: [
          { text: "Professional 24/7 communication", positive: true },
          { text: "Dedicated cleaning team", positive: true },
          { text: "Automated self check-in", positive: true },
          { text: "Non-stop technical support", positive: true },
          { text: "Dynamic pricing algorithm", positive: true },
          { text: "Reputation management included", positive: true },
        ],
        footer: "+40% revenue, 0 stress",
      },
      highlight: "20% commission on net income — the rest is yours",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section className="py-20 bg-muted/30">
      <div ref={ref} className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className={cn(
              "text-3xl md:text-4xl font-serif font-bold text-foreground mb-3",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {t.title}
          </h2>
          <p
            className={cn(
              "text-lg text-muted-foreground max-w-2xl mx-auto",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "100ms" }}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-8">
          {/* DIY Column */}
          <div
            className={cn(
              "relative p-6 rounded-2xl bg-card border-2 border-red-500/20",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}
            style={{ transitionDelay: "200ms" }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{t.diy.title}</h3>
              <p className="text-sm text-muted-foreground">{t.diy.subtitle}</p>
            </div>

            {/* Time Badge */}
            <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-red-500/10 rounded-full">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-sm text-foreground">
                {t.diy.timeLabel}: <strong className="text-red-500">{t.diy.timeValue}</strong>
              </span>
            </div>

            {/* Items */}
            <ul className="space-y-3 mb-6">
              {t.diy.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-foreground">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-red-500/20">
              <span className="text-sm font-medium text-red-500">{t.diy.footer}</span>
            </div>
          </div>

          {/* Professional Column */}
          <div
            className={cn(
              "relative p-6 rounded-2xl bg-card border-2 border-green-500/30",
              "ring-2 ring-green-500/20 shadow-lg",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}
            style={{ transitionDelay: "300ms" }}
          >
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
              {language === "ro" ? "RECOMANDAT" : "RECOMMENDED"}
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{t.professional.title}</h3>
              <p className="text-sm text-muted-foreground">{t.professional.subtitle}</p>
            </div>

            {/* Time Badge */}
            <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 bg-green-500/10 rounded-full">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-sm text-foreground">
                {t.professional.timeLabel}: <strong className="text-green-500">{t.professional.timeValue}</strong>
              </span>
            </div>

            {/* Items */}
            <ul className="space-y-3 mb-6">
              {t.professional.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-foreground">{item.text}</span>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-green-500/20">
              <span className="text-sm font-medium text-green-500">{t.professional.footer}</span>
            </div>
          </div>
        </div>

        {/* Highlight */}
        <div
          className={cn(
            "text-center p-4 rounded-xl bg-gradient-to-r from-primary/10 via-gold/10 to-primary/10 border border-primary/20 max-w-2xl mx-auto",
            "transition-all duration-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "400ms" }}
        >
          <span className="text-lg font-semibold text-foreground">{t.highlight}</span>
        </div>
      </div>
    </section>
  );
};

export default DIYvsProfessional;
