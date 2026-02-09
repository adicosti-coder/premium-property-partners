import { Link } from "react-router-dom";
import {
  Building2,
  Key,
  Home,
  TrendingUp,
  BookOpen,
  Users,
  Phone,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface NavCard {
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  link: string;
  accent: string;
}

const MainNavigationCards = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: grid2Ref, isVisible: grid2Visible } = useScrollAnimation({ threshold: 0.05 });

  const content = {
    ro: {
      badge: "Explorează Serviciile Noastre",
      title: "Tot Ce Ai Nevoie,",
      titleHighlight: "Într-un Singur Loc",
      subtitle: "Navighează rapid către serviciul care te interesează",
      primaryCards: [
        {
          icon: Building2,
          title: "Administrare Proprietăți",
          description: "Management complet în regim hotelier.\nMaximizează veniturile fără efort.",
          cta: "Află Mai Multe",
          link: "/pentru-proprietari",
          accent: "from-amber-500/20 to-amber-600/5",
        },
        {
          icon: Key,
          title: "Închiriere & Cazare",
          description: "Apartamente premium, complet echipate.\nRezervi direct, fără comision extra.",
          cta: "Vezi Apartamente",
          link: "/oaspeti",
          accent: "from-blue-500/20 to-blue-600/5",
        },
        {
          icon: Home,
          title: "Imobiliare — Vânzări",
          description: "Consultanță și intermediere profesională.\nTranzacții sigure, transparente.",
          cta: "Explorează Oferte",
          link: "/imobiliare",
          accent: "from-green-500/20 to-green-600/5",
        },
        {
          icon: TrendingUp,
          title: "Investiții Premium",
          description: "Randamente reale și analize de piață.\nInvestește inteligent în Timișoara.",
          cta: "Vezi Oportunități",
          link: "/investitii",
          accent: "from-purple-500/20 to-purple-600/5",
        },
      ] as NavCard[],
      secondaryCards: [
        {
          icon: MapPin,
          title: "Ansambluri Rezidențiale",
          description: "Complexuri noi cu potențial ridicat",
          cta: "Vezi Complexuri",
          link: "/complexe",
          accent: "from-teal-500/20 to-teal-600/5",
        },
        {
          icon: BookOpen,
          title: "Blog & Ghiduri",
          description: "Sfaturi practice pentru proprietari",
          cta: "Citește Articole",
          link: "/blog",
          accent: "from-orange-500/20 to-orange-600/5",
        },
        {
          icon: Users,
          title: "Despre Noi",
          description: "Echipa, valorile și povestea noastră",
          cta: "Află Povestea",
          link: "/despre-noi",
          accent: "from-rose-500/20 to-rose-600/5",
        },
        {
          icon: Phone,
          title: "Contact",
          description: "Vorbește direct cu un consultant",
          cta: "Contactează-ne",
          link: "/#contact",
          accent: "from-cyan-500/20 to-cyan-600/5",
        },
      ] as NavCard[],
    },
    en: {
      badge: "Explore Our Services",
      title: "Everything You Need,",
      titleHighlight: "In One Place",
      subtitle: "Quickly navigate to the service you're interested in",
      primaryCards: [
        {
          icon: Building2,
          title: "Property Management",
          description: "Complete short-term rental management.\nMaximize revenue effortlessly.",
          cta: "Learn More",
          link: "/pentru-proprietari",
          accent: "from-amber-500/20 to-amber-600/5",
        },
        {
          icon: Key,
          title: "Rental & Accommodation",
          description: "Premium fully-equipped apartments.\nBook directly, no extra fees.",
          cta: "View Apartments",
          link: "/oaspeti",
          accent: "from-blue-500/20 to-blue-600/5",
        },
        {
          icon: Home,
          title: "Real Estate — Sales",
          description: "Professional consulting and brokerage.\nSecure, transparent transactions.",
          cta: "Explore Listings",
          link: "/imobiliare",
          accent: "from-green-500/20 to-green-600/5",
        },
        {
          icon: TrendingUp,
          title: "Premium Investments",
          description: "Real yields and market analysis.\nInvest smart in Timișoara.",
          cta: "View Opportunities",
          link: "/investitii",
          accent: "from-purple-500/20 to-purple-600/5",
        },
      ] as NavCard[],
      secondaryCards: [
        {
          icon: MapPin,
          title: "Residential Complexes",
          description: "New complexes with high potential",
          cta: "View Complexes",
          link: "/complexe",
          accent: "from-teal-500/20 to-teal-600/5",
        },
        {
          icon: BookOpen,
          title: "Blog & Guides",
          description: "Practical tips for owners",
          cta: "Read Articles",
          link: "/blog",
          accent: "from-orange-500/20 to-orange-600/5",
        },
        {
          icon: Users,
          title: "About Us",
          description: "Our team, values, and story",
          cta: "Our Story",
          link: "/despre-noi",
          accent: "from-rose-500/20 to-rose-600/5",
        },
        {
          icon: Phone,
          title: "Contact",
          description: "Speak directly with a consultant",
          cta: "Contact Us",
          link: "/#contact",
          accent: "from-cyan-500/20 to-cyan-600/5",
        },
      ] as NavCard[],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const handleClick = (link: string) => {
    if (link.includes("#")) {
      const hash = link.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
  };

  const renderCard = (card: NavCard, index: number, visible: boolean, size: "lg" | "sm") => {
    const Icon = card.icon;
    const isAnchor = card.link.includes("#");
    const isLarge = size === "lg";

    const inner = (
      <div
        className={`group relative h-full bg-card rounded-2xl border border-border hover:border-primary/40 transition-all duration-500 hover:shadow-gold hover:-translate-y-1 overflow-hidden ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: visible ? `${index * 100}ms` : "0ms" }}
      >
        {/* Gradient overlay on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />

        <div className={`relative flex flex-col h-full ${isLarge ? "p-6 md:p-8" : "p-5 md:p-6"}`}>
          {/* Icon */}
          <div
            className={`rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 ${
              isLarge ? "w-14 h-14 md:w-16 md:h-16 mb-5" : "w-12 h-12 mb-4"
            }`}
          >
            <Icon className={`text-primary ${isLarge ? "w-7 h-7 md:w-8 md:h-8" : "w-6 h-6"}`} />
          </div>

          {/* Title */}
          <h3
            className={`font-semibold text-foreground mb-2 ${
              isLarge ? "text-lg md:text-xl" : "text-base md:text-lg"
            }`}
          >
            {card.title}
          </h3>

          {/* Description */}
          <p
            className={`text-muted-foreground leading-relaxed whitespace-pre-line flex-grow ${
              isLarge ? "text-sm md:text-base mb-6" : "text-xs md:text-sm mb-4"
            }`}
          >
            {card.description}
          </p>

          {/* CTA Button */}
          <div className="flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all duration-300">
            <span>{card.cta}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>
    );

    if (isAnchor) {
      return (
        <button
          key={index}
          onClick={() => handleClick(card.link)}
          className="block h-full text-left w-full"
        >
          {inner}
        </button>
      );
    }

    return (
      <Link key={index} to={card.link} className="block h-full">
        {inner}
      </Link>
    );
  };

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-secondary/30 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl hidden md:block pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.badge}</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground mb-4">
            {t.title}{" "}
            <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Primary Cards — 4 columns */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-7xl mx-auto mb-8 md:mb-10"
        >
          {t.primaryCards.map((card, i) => renderCard(card, i, gridVisible, "lg"))}
        </div>

        {/* Secondary Cards — 4 columns, smaller */}
        <div
          ref={grid2Ref}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-7xl mx-auto"
        >
          {t.secondaryCards.map((card, i) => renderCard(card, i, grid2Visible, "sm"))}
        </div>
      </div>
    </section>
  );
};

export default MainNavigationCards;
