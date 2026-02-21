import { Building2, TrendingUp, Shield, BarChart3, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import HubSection from "@/components/HubSection";
import TeaserCard from "@/components/TeaserCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const OwnersTeaser = () => {
  const { language } = useLanguage();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: bannerRef, isVisible: bannerVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Pentru Proprietari",
      title: "Maximizează Randamentul",
      titleHighlight: "Proprietății Tale",
      subtitle: "Administrare profesională în regim hotelier cu tehnologie avansată și echipă dedicată. Transformă apartamentul tău într-o sursă constantă de venit.",
      cta: "Calculează Potențialul",
      features: [
        {
          icon: TrendingUp,
          title: "Randament +40%",
          description: "Venituri superioare față de chiria pe termen lung",
        },
        {
          icon: Shield,
          title: "Zero Stress",
          description: "Ne ocupăm de tot: oaspeți, curățenie, mentenanță",
        },
        {
          icon: BarChart3,
          title: "Transparență Totală",
          description: "Dashboard și rapoarte financiare în timp real",
        },
        {
          icon: Building2,
          title: "Comision 15-20%",
          description: "Comision transparent din încasările nete, fără costuri ascunse",
        },
      ],
      quickValue: {
        badge: "În 24h primești",
        items: ["Estimare venit personalizată", "Recomandări optimizare", "Plan clar colaborare"],
      },
    },
    en: {
      badge: "For Owners",
      title: "Maximize Your Property",
      titleHighlight: "Returns",
      subtitle: "Professional short-term rental management with advanced technology and a dedicated team. Turn your apartment into a consistent income source.",
      cta: "Calculate Potential",
      features: [
        {
          icon: TrendingUp,
          title: "+40% Returns",
          description: "Higher income compared to long-term rentals",
        },
        {
          icon: Shield,
          title: "Zero Stress",
          description: "We handle everything: guests, cleaning, maintenance",
        },
        {
          icon: BarChart3,
          title: "Full Transparency",
          description: "Real-time dashboard and financial reports",
        },
        {
          icon: Building2,
          title: "15-20% Commission",
          description: "Transparent commission of net income, no hidden fees",
        },
      ],
      quickValue: {
        badge: "Within 24h you get",
        items: ["Personalized income estimate", "Optimization tips", "Clear partnership plan"],
      },
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <HubSection
      badge={t.badge}
      badgeIcon={Building2}
      title={t.title}
      titleHighlight={t.titleHighlight}
      subtitle={t.subtitle}
      ctaText={t.cta}
      ctaLink="/pentru-proprietari"
      secondaryCta={{
        text: language === "ro" ? "Cum Funcționează" : "How It Works",
        onClick: () => {
          const section = document.getElementById("cum-functioneaza");
          section?.scrollIntoView({ behavior: "smooth" });
        },
      }}
      variant="alternate"
    >
      {/* Quick Value Banner Teaser */}
      <div
        ref={bannerRef}
        className={`mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 max-w-3xl mx-auto transition-all duration-500 ${
          bannerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <span className="font-semibold text-primary text-sm">{t.quickValue.badge}</span>
          </div>
          {t.quickValue.items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-sm text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto"
      >
        {t.features.map((feature, index) => (
          <TeaserCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            index={index}
            isVisible={gridVisible}
            variant="compact"
          />
        ))}
      </div>

      {/* See More Link */}
      <div className="text-center mt-8">
        <Button asChild variant="heroOutline" size="lg" className="group">
          <Link to="/pentru-proprietari">
            {language === "ro" ? "Vezi Toate Beneficiile" : "View All Benefits"}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </HubSection>
  );
};

export default OwnersTeaser;
