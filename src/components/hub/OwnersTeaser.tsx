import { Building2, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import HubSection from "@/components/HubSection";
import TeaserCard from "@/components/TeaserCard";

const OwnersTeaser = () => {
  const { language } = useLanguage();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

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
          title: "Comision 15%",
          description: "Cel mai mic comision din piață, fără costuri ascunse",
        },
      ],
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
          title: "15% Commission",
          description: "Lowest commission in the market, no hidden fees",
        },
      ],
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
      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
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
    </HubSection>
  );
};

export default OwnersTeaser;
