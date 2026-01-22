import { Link } from "react-router-dom";
import { Key, Star, MapPin, Wifi, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { properties } from "@/data/properties";

const GuestsTeaser = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.1 });

  // Get top 3 properties by rating
  const topProperties = [...properties]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const content = {
    ro: {
      badge: "Pentru Oaspeți",
      title: "Descoperă",
      titleHighlight: "Apartamentul Perfect",
      subtitle: "Apartamente premium în cele mai căutate zone. Self check-in, WiFi rapid, și tot ce ai nevoie pentru o ședere de vis.",
      cta: "Vezi Toate Proprietățile",
      bookDirect: "De ce să rezervi direct?",
      perNight: "/noapte",
      reviews: "recenzii",
    },
    en: {
      badge: "For Guests",
      title: "Discover",
      titleHighlight: "Your Perfect Stay",
      subtitle: "Premium apartments in the most sought-after locations. Self check-in, fast WiFi, and everything you need for a perfect stay.",
      cta: "View All Properties",
      bookDirect: "Why book direct?",
      perNight: "/night",
      reviews: "reviews",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-20 bg-background relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

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

        {/* Property Preview Cards */}
        <div
          ref={cardsRef}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10"
        >
          {topProperties.map((property, index) => (
            <Link
              key={property.id}
              to={`/proprietate/${property.slug}`}
              className={`group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant ${
                cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: cardsVisible ? `${index * 100}ms` : "0ms" }}
            >
              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={property.images[0]}
                  alt={property.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary-foreground text-primary-foreground" />
                  <span className="text-xs font-bold text-primary-foreground">
                    {property.rating}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {property.location}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {property.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wifi className="w-3 h-3" />
                    <span>{property.reviews} {t.reviews}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-primary">
                      €{property.pricePerNight}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.perNight}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
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
          <Button asChild variant="heroOutline" size="xl">
            <Link to="/oaspeti">{t.bookDirect}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GuestsTeaser;
