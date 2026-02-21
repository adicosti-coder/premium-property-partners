import { Link } from "react-router-dom";
import { Key, Wifi, Sparkles, ShieldCheck, Clock, MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";

const GuestsTeaser = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: benefitsRef, isVisible: benefitsVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Pentru Oaspeți",
      title: "Experiență de",
      titleHighlight: "5 Stele",
      subtitle: "Apartamente premium cu toate facilitățile pentru o ședere perfectă. Self check-in, curățenie profesională și suport dedicat.",
      cta: "Explorează Apartamentele",
      ctaSecondary: "De ce să rezervi direct?",
      benefits: [
        { icon: Key, title: "Self Check-in 24/7", desc: "Acces non-stop cu cod digital" },
        { icon: Wifi, title: "WiFi Ultra-Rapid", desc: "Internet de mare viteză" },
        { icon: Sparkles, title: "Curățenie Premium", desc: "Standard hotelier garantat" },
        { icon: ShieldCheck, title: "Rezervare Sigură", desc: "Politică flexibilă de anulare" },
        { icon: Clock, title: "Check-in Flexibil", desc: "Program adaptat nevoilor tale" },
        { icon: MapPin, title: "Locații Premium", desc: "În centrul atracțiilor" },
      ],
    },
    en: {
      badge: "For Guests",
      title: "A",
      titleHighlight: "5-Star Experience",
      subtitle: "Premium apartments with all the amenities for a perfect stay. Self check-in, professional cleaning, and dedicated support.",
      cta: "Explore Apartments",
      ctaSecondary: "Why book direct?",
      benefits: [
        { icon: Key, title: "24/7 Self Check-in", desc: "Non-stop access with digital code" },
        { icon: Wifi, title: "Ultra-Fast WiFi", desc: "High-speed internet" },
        { icon: Sparkles, title: "Premium Cleaning", desc: "Hotel-grade standard guaranteed" },
        { icon: ShieldCheck, title: "Secure Booking", desc: "Flexible cancellation policy" },
        { icon: Clock, title: "Flexible Check-in", desc: "Schedule adapted to your needs" },
        { icon: MapPin, title: "Prime Locations", desc: "In the heart of attractions" },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-20 bg-card relative overflow-hidden"
    >
      {/* Background decoration - hidden on mobile to prevent edge shadows */}
      <div className="absolute top-20 left-[20%] w-96 h-96 bg-primary/5 rounded-full blur-3xl hidden md:block" />
      <div className="absolute bottom-20 right-[20%] w-64 h-64 bg-primary/5 rounded-full blur-3xl hidden md:block" />

      <div className="container mx-auto px-6 relative z-10">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Key className="w-4 h-4 text-primary" />
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

        {/* Benefits Grid */}
        <div
          ref={benefitsRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 max-w-4xl mx-auto mb-10"
        >
          {t.benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className={`group p-4 md:p-5 rounded-xl bg-background/50 border border-border hover:border-primary/20 transition-all duration-500 text-center ${
                  benefitsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: benefitsVisible ? `${index * 75}ms` : "0ms" }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm md:text-base mb-1">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  {benefit.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Button asChild variant="hero" size="xl" className="group">
            <Link to="/pentru-oaspeti">
              {t.cta}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button 
            variant="heroOutline" 
            size="xl"
            onClick={() => {
              const portfolioSection = document.getElementById('portofoliu');
              portfolioSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t.ctaSecondary}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GuestsTeaser;
