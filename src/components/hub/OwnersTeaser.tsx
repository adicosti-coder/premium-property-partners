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
      badge: "Pentru proprietari",
      title: "Randament net previzibil,",
      titleHighlight: "fără sarcini operaționale",
      subtitle: "Administrare în regim hotelier, gestionată integral de echipa noastră. Tu deții activul, noi construim operațiunea — cu raportare clară și ipoteze publice.",
      cta: "Calculează randamentul tău",
      features: [
        {
          icon: TrendingUp,
          title: "Randament net 9,4%",
          description: "Calculat pe ipoteze publice (ocupare 75%, deducere 27%)",
        },
        {
          icon: Shield,
          title: "Operațiuni la noi",
          description: "Oaspeți, curățenie, mentenanță — gestionate de echipa dedicată",
        },
        {
          icon: BarChart3,
          title: "Raportare clară",
          description: "Dashboard accesibil oricând și P&L lunar detaliat",
        },
        {
          icon: Building2,
          title: "Comision 15-25%",
          description: "Aplicat la încasările nete, fără costuri ascunse",
        },
      ],
      quickValue: {
        badge: "În 24 de ore primești",
        items: ["Estimare de venit personalizată", "Recomandări de optimizare", "Plan clar de colaborare"],
      },
    },
    en: {
      badge: "For owners",
      title: "Predictable net returns,",
      titleHighlight: "no operational tasks",
      subtitle: "Hotel-grade management handled end-to-end by our team. You own the asset, we run the operation — with clear reporting and public assumptions.",
      cta: "Calculate your return",
      features: [
        {
          icon: TrendingUp,
          title: "9.4% net return",
          description: "On public assumptions (75% occupancy, 27% deduction)",
        },
        {
          icon: Shield,
          title: "Operations on us",
          description: "Guests, cleaning, maintenance — handled by a dedicated team",
        },
        {
          icon: BarChart3,
          title: "Clear reporting",
          description: "Dashboard available anytime and detailed monthly P&L",
        },
        {
          icon: Building2,
          title: "15-25% commission",
          description: "Applied to net income, no hidden fees",
        },
      ],
      quickValue: {
        badge: "Within 24h you receive",
        items: ["Personalized income estimate", "Optimization recommendations", "Clear partnership plan"],
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

      {/* Conversion block — primary action stays on-page (free estimate form),
          secondary goes to the full owners landing page */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            size="lg"
            className="group font-semibold"
            onClick={() => {
              document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {language === "ro" ? "Estimare gratuită în 24 de ore" : "Free estimate within 24h"}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button asChild variant="heroOutline" size="lg" className="group">
            <Link to="/pentru-proprietari">
              {language === "ro" ? "Vezi Toate Beneficiile" : "View All Benefits"}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {(language === "ro"
            ? ["Fără obligații", "Comision doar din încasări", "9,7/10 rating oaspeți (Booking)"]
            : ["No obligation", "Commission only on income", "9.7/10 guest rating (Booking)"]
          ).map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </HubSection>
  );
};

export default OwnersTeaser;
