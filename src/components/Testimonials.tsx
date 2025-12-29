import { Star, Quote } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  source: string;
  sourceIcon: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Oaspete",
    role: "Recenzie verificată · Booking.com",
    content: "Apartament complet nou, spațios și foarte confortabil. Totul este impecabil, iar gazda a fost extrem de promptă și atentă la detalii.",
    rating: 5,
    source: "Booking.com",
    sourceIcon: "B",
  },
  {
    id: 2,
    name: "Oaspete",
    role: "Recenzie verificată · Booking.com",
    content: "Check-in self-check-in foarte ușor și comod, apartament foarte curat, iar comunicarea a fost rapidă și prietenoasă. Recomand!",
    rating: 5,
    source: "Booking.com",
    sourceIcon: "B",
  },
  {
    id: 3,
    name: "Proprietar",
    role: "Recenzie verificată · Google",
    content: "Am primit o estimare realistă + plan clar. Exact ce aveam nevoie ca să decid. Colaborarea a fost excelentă de la început.",
    rating: 5,
    source: "Google Reviews",
    sourceIcon: "G",
  },
  {
    id: 4,
    name: "Alexandru M.",
    role: "Proprietar · 2 apartamente",
    content: "De când colaborez cu echipa, veniturile mele au crescut cu 45%. Se ocupă de absolut tot, de la comunicare cu oaspeții până la curățenie.",
    rating: 5,
    source: "Google Reviews",
    sourceIcon: "G",
  },
];

const Testimonials = () => {
  const { t } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.15, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.1, direction: 'down' });

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations with parallax */}
      <div 
        className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">{t.testimonials.label}</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.testimonials.title} <span className="text-gradient-gold">{t.testimonials.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.testimonials.subtitle}
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`bg-card rounded-2xl p-8 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant relative ${
                gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
                
                {/* Source badge - verified style like realtrust */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">Recenzie verificată</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust stats */}
        <div 
          ref={statsRef}
          className={`mt-16 flex flex-wrap justify-center gap-8 md:gap-16 transition-all duration-700 ${
            statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">4.9/5</p>
            <p className="text-muted-foreground text-sm">{t.testimonials.avgRating}</p>
          </div>
          <div className="text-center" style={{ transitionDelay: '100ms' }}>
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">200+</p>
            <p className="text-muted-foreground text-sm">{t.testimonials.verifiedReviews}</p>
          </div>
          <div className="text-center" style={{ transitionDelay: '200ms' }}>
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">98%</p>
            <p className="text-muted-foreground text-sm">{t.testimonials.happyClients}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;