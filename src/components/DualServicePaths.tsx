import { Building2, TrendingUp, ArrowRight, Home, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";

const DualServicePaths = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Care e situația ta?",
      title: "Două Servicii,",
      titleHighlight: "Un Singur Standard",
      paths: [
        {
          icon: Building2,
          accent: "amber",
          question: "Ai deja un apartament?",
          subtitle: "Transformă-l în sursă de venit pasiv",
          description: "Administrăm proprietatea ta în regim hotelier — de la listare, optimizare prețuri și comunicare cu oaspeții, până la curățenie și mentenanță.",
          benefits: ["Randament +40% vs. chirie clasică", "Plăți directe în contul tău", "Raportare lunară transparentă"],
          cta: "Vreau administrare",
          link: "/pentru-proprietari",
        },
        {
          icon: TrendingUp,
          accent: "purple",
          question: "Vrei să investești?",
          subtitle: "Cumpără inteligent, profită de pe prima zi",
          description: "Te ghidăm de la achiziție la amenajare și operare — cu analize de randament reale, strategii de maximizare și acces la oferte premium.",
          benefits: ["ROI estimat 8-12% anual", "Analiză completă de piață", "Sistem all-inclusive de operare"],
          cta: "Vreau investiție profitabilă",
          link: "/investitii",
        },
      ],
    },
    en: {
      badge: "What's your situation?",
      title: "Two Services,",
      titleHighlight: "One Standard",
      paths: [
        {
          icon: Building2,
          accent: "amber",
          question: "Already own an apartment?",
          subtitle: "Turn it into passive income",
          description: "We manage your property as a hotel — from listing, price optimization, and guest communication, to cleaning and maintenance.",
          benefits: ["+40% returns vs. classic rental", "Direct payments to your account", "Transparent monthly reporting"],
          cta: "I want management",
          link: "/pentru-proprietari",
        },
        {
          icon: TrendingUp,
          accent: "purple",
          question: "Want to invest?",
          subtitle: "Buy smart, profit from day one",
          description: "We guide you from acquisition to setup and operation — with real yield analysis, maximization strategies, and premium deal access.",
          benefits: ["Estimated ROI 8-12% annually", "Complete market analysis", "All-inclusive operation system"],
          cta: "I want a profitable investment",
          link: "/investitii",
        },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const accentClasses = {
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30 hover:border-amber-500/50",
      iconBg: "bg-amber-500/15",
      iconText: "text-amber-500",
      dot: "bg-amber-500",
      gradient: "from-amber-500/10 via-transparent to-transparent",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30 hover:border-purple-500/50",
      iconBg: "bg-purple-500/15",
      iconText: "text-purple-500",
      dot: "bg-purple-500",
      gradient: "from-purple-500/10 via-transparent to-transparent",
    },
  };

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-4">
            {t.title} <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
        </div>

        {/* Two Path Cards */}
        <div
          ref={cardsRef}
          className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto"
        >
          {t.paths.map((path, index) => {
            const Icon = path.icon;
            const accent = accentClasses[path.accent as keyof typeof accentClasses];

            return (
              <div
                key={index}
                className={`group relative rounded-2xl border ${accent.border} bg-card p-6 md:p-8 transition-all duration-500 hover:shadow-lg ${
                  cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: cardsVisible ? `${index * 150}ms` : "0ms" }}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${accent.gradient} rounded-2xl opacity-50`} />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl ${accent.iconBg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-7 h-7 ${accent.iconText}`} />
                  </div>

                  {/* Question */}
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                    {path.question}
                  </h3>
                  <p className={`text-base font-medium ${accent.iconText} mb-4`}>
                    {path.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {path.description}
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2.5 mb-8">
                    {path.benefits.map((benefit, bIndex) => (
                      <li key={bIndex} className="flex items-center gap-2.5 text-sm text-foreground">
                        <span className={`w-2 h-2 rounded-full ${accent.dot} shrink-0`} />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button asChild variant="hero" size="lg" className="w-full group/btn">
                    <Link to={path.link}>
                      {path.cta}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DualServicePaths;
