import { TrendingUp, ArrowRight, Home, BarChart3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { Button } from "@/components/ui/button";

const ROICaseStudy = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: chartRef, isVisible: chartVisible } = useScrollAnimation({ threshold: 0.2 });

  const content = {
    ro: {
      badge: "Studiu de Caz Real",
      title: "Chirie Clasică vs.",
      titleHighlight: "Sistem ApArt Hotel",
      subtitle: "Un apartament de 2 camere, 50 m², zona centrală Timișoara — comparație anuală reală.",
      classicLabel: "Chirie Clasică",
      apartLabel: "Sistem ApArt Hotel",
      classicItems: [
        { label: "Venit lunar fix", value: "350€" },
        { label: "Venit anual brut", value: "4.200€" },
        { label: "Costuri (taxe, reparații)", value: "−600€" },
        { label: "Venit anual net", value: "3.600€", highlight: true },
      ],
      apartItems: [
        { label: "ADR mediu", value: "55€/noapte" },
        { label: "Ocupare medie", value: "65%" },
        { label: "Venit anual brut", value: "13.034€" },
        { label: "Costuri (comision, taxe, curățenie)", value: "−5.900€" },
        { label: "Venit anual net", value: "7.134€", highlight: true },
      ],
      differenceLabel: "Diferența anuală",
      differenceValue: "+3.534€",
      differencePercent: "+98% mai mult",
      note: "* Estimări bazate pe date reale de piață 2025–2026. Rezultatele variază în funcție de locație, sezon și standard.",
      cta: "Calculează pentru proprietatea ta",
    },
    en: {
      badge: "Real Case Study",
      title: "Classic Rental vs.",
      titleHighlight: "ApArt Hotel System",
      subtitle: "A 2-room apartment, 50 m², central Timișoara — real annual comparison.",
      classicLabel: "Classic Rental",
      apartLabel: "ApArt Hotel System",
      classicItems: [
        { label: "Fixed monthly income", value: "€350" },
        { label: "Annual gross income", value: "€4,200" },
        { label: "Costs (taxes, repairs)", value: "−€600" },
        { label: "Annual net income", value: "€3,600", highlight: true },
      ],
      apartItems: [
        { label: "Average ADR", value: "€55/night" },
        { label: "Average occupancy", value: "65%" },
        { label: "Annual gross income", value: "€13,034" },
        { label: "Costs (commission, taxes, cleaning)", value: "−€5,900" },
        { label: "Annual net income", value: "€7,134", highlight: true },
      ],
      differenceLabel: "Annual difference",
      differenceValue: "+€3,534",
      differencePercent: "+98% more",
      note: "* Estimates based on real market data 2025–2026. Results vary by location, season, and standard.",
      cta: "Calculate for your property",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  // Animated bar widths (percentage of max)
  const classicBarWidth = chartVisible ? 50 : 0; // 3600/7134 ≈ 50%
  const apartBarWidth = chartVisible ? 100 : 0;

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} className="dark py-16 md:py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-3">
            {t.title} <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        {/* Comparison */}
        <div
          ref={chartRef}
          className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto mb-8"
        >
          {/* Classic Rental Card */}
          <div
            className={`rounded-2xl border border-border bg-card p-6 md:p-8 transition-all duration-500 ${
              chartVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Home className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">{t.classicLabel}</h3>
            </div>
            <ul className="space-y-3">
              {t.classicItems.map((item, i) => (
                <li key={i} className={`flex justify-between items-center text-sm ${item.highlight ? "pt-3 border-t border-border" : ""}`}>
                  <span className={item.highlight ? "font-bold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  <span className={item.highlight ? "text-lg font-bold text-foreground" : "font-medium text-foreground"}>{item.value}</span>
                </li>
              ))}
            </ul>
            {/* Bar */}
            <div className="mt-6 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/40 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${classicBarWidth}%` }}
              />
            </div>
          </div>

          {/* ApArt Hotel Card */}
          <div
            className={`rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 to-card p-6 md:p-8 transition-all duration-500 shadow-lg shadow-primary/5 ${
              chartVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: chartVisible ? "150ms" : "0ms" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{t.apartLabel}</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {t.differencePercent}
                </span>
              </div>
            </div>
            <ul className="space-y-3">
              {t.apartItems.map((item, i) => (
                <li key={i} className={`flex justify-between items-center text-sm ${item.highlight ? "pt-3 border-t border-primary/20" : ""}`}>
                  <span className={item.highlight ? "font-bold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  <span className={item.highlight ? "text-lg font-bold text-primary" : "font-medium text-foreground"}>{item.value}</span>
                </li>
              ))}
            </ul>
            {/* Bar */}
            <div className="mt-6 h-3 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${apartBarWidth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Difference highlight */}
        <div
          className={`text-center mb-6 transition-all duration-700 delay-300 ${
            chartVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20">
            <span className="text-foreground font-medium">{t.differenceLabel}:</span>
            <span className="text-2xl md:text-3xl font-serif font-bold text-primary">{t.differenceValue}</span>
            <span className="text-primary font-semibold text-sm">/an</span>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto mb-8">{t.note}</p>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="lg" onClick={scrollToContact} className="group">
            {t.cta}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ROICaseStudy;
