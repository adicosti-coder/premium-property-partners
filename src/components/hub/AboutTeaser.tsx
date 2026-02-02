import { Link } from "react-router-dom";
import { Users, Award, Building, ArrowRight, MapPin, Star, Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";

const AboutTeaser = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Despre Noi",
      title: "Doi Branduri,",
      titleHighlight: "O Viziune",
      subtitle: "RealTrust pentru proprietari și ApArt Hotel pentru oaspeți. Împreună, creăm experiențe de cazare premium în Timișoara.",
      cta: "Află Povestea Noastră",
      stats: [
        { icon: Building, value: "15+", label: "Proprietăți Administrate" },
        { icon: Star, value: "4.9", label: "Rating Mediu" },
        { icon: Clock, value: "25+", label: "Ani Experiență" },
        { icon: MapPin, value: "3", label: "Zone Premium" },
      ],
    },
    en: {
      badge: "About Us",
      title: "Two Brands,",
      titleHighlight: "One Vision",
      subtitle: "RealTrust for owners and ApArt Hotel for guests. Together, we create premium accommodation experiences in Timișoara.",
      cta: "Discover Our Story",
      stats: [
        { icon: Building, value: "15+", label: "Properties Managed" },
        { icon: Star, value: "4.9", label: "Average Rating" },
        { icon: Clock, value: "25+", label: "Years Experience" },
        { icon: MapPin, value: "3", label: "Premium Areas" },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-20 bg-card relative overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Decorative elements - offset to prevent edge overflow */}
      <div className="absolute top-20 -right-36 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -left-36 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.badge}</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.title} <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10"
        >
          {t.stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`text-center p-6 rounded-2xl bg-background/50 border border-border transition-all duration-500 ${
                  statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: statsVisible ? `${index * 100}ms` : "0ms" }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-serif font-bold text-gradient-gold mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Button asChild variant="hero" size="xl" className="group">
            <Link to="/despre-noi">
              {t.cta}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AboutTeaser;
