import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";
import { useIsMobile } from "@/hooks/use-mobile";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState, useRef } from "react";

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
    name: "Maria T.",
    role: "Recenzie verificată · Airbnb",
    content: "Locație perfectă în centrul orașului! Apartamentul arată exact ca în poze, foarte curat și bine dotat. Gazda a fost foarte amabilă și ne-a oferit recomandări excelente.",
    rating: 5,
    source: "Airbnb",
    sourceIcon: "A",
  },
  {
    id: 3,
    name: "Oaspete",
    role: "Recenzie verificată · Booking.com",
    content: "Check-in self-check-in foarte ușor și comod, apartament foarte curat, iar comunicarea a fost rapidă și prietenoasă. Recomand!",
    rating: 5,
    source: "Booking.com",
    sourceIcon: "B",
  },
  {
    id: 4,
    name: "Stefan & Ana",
    role: "Recenzie verificată · Airbnb",
    content: "Am stat 5 nopți și a fost perfect! Vederea de la balcon este superbă, patul foarte confortabil, și bucătăria complet echipată. Vom reveni cu siguranță!",
    rating: 5,
    source: "Airbnb",
    sourceIcon: "A",
  },
  {
    id: 5,
    name: "Laura M.",
    role: "Recenzie verificată · Google",
    content: "Apartament superb, exact ca în poze! Curățenia impecabilă și comunicarea excelentă. Check-in-ul a fost foarte simplu, iar locația perfectă pentru a explora orașul.",
    rating: 5,
    source: "Google Reviews",
    sourceIcon: "G",
  },
  {
    id: 6,
    name: "Andrei P.",
    role: "Recenzie verificată · Airbnb",
    content: "Experiență de 5 stele! Apartament modern și spațios, parfect pentru o familie. Curățenia impecabilă și comunicarea excelentă cu gazda.",
    rating: 5,
    source: "Airbnb",
    sourceIcon: "A",
  },
];

const TestimonialCard = ({ testimonial, isVisible, index }: { testimonial: Testimonial; isVisible: boolean; index: number }) => (
  <div
    className={`bg-card rounded-2xl p-8 md:p-10 lg:p-12 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant relative h-full ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}
    style={{ transitionDelay: isVisible ? `${index * 100}ms` : '0ms' }}
  >
    {/* Quote icon */}
    <Quote className="absolute top-6 right-6 md:top-8 md:right-8 w-8 h-8 md:w-10 md:h-10 text-primary/20" />
    
    {/* Rating */}
    <div className="flex gap-1 mb-4 md:mb-6">
      {Array.from({ length: testimonial.rating }).map((_, i) => (
        <Star key={i} className="w-4 h-4 md:w-5 md:h-5 fill-primary text-primary" />
      ))}
    </div>

    {/* Content */}
    <p className="text-foreground/70 dark:text-muted-foreground mb-6 md:mb-8 text-base md:text-lg text-premium">
      "{testimonial.content}"
    </p>

    {/* Author */}
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {/* Platform badge icon */}
        {testimonial.source === "Booking.com" && (
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md">
            B
          </div>
        )}
        {testimonial.source === "Airbnb" && (
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 fill-white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
        )}
        {testimonial.source === "Google Reviews" && (
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border border-border flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground text-sm md:text-base">{testimonial.name}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
      
      {/* Source badge - verified style - improved contrast */}
      <div className="flex items-center gap-2 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium">Verificat</span>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  const { t } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.15, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.1, direction: 'down' });
  const isMobile = useIsMobile();
  
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })
  );
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    containScroll: 'trimSnaps'
  }, [autoplayPlugin.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Background decorations with parallax - centered to prevent edge overflow */}
      <div 
        className="absolute top-0 left-[15%] w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 right-[15%] w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-6">{t.testimonials.label}</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.testimonials.title} <span className="text-gradient-gold">{t.testimonials.titleHighlight}</span>
          </h2>
          <p className="text-foreground/70 dark:text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.testimonials.subtitle}
          </p>
        </div>

        {/* Mobile Carousel */}
        {isMobile ? (
          <div ref={gridRef} className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {testimonials.map((testimonial) => (
                  <div 
                    key={testimonial.id} 
                    className="flex-[0_0_100%] min-w-0 px-2"
                  >
                    <TestimonialCard 
                      testimonial={testimonial} 
                      isVisible={gridVisible} 
                      index={0}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={scrollPrev}
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Dots */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === selectedIndex 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
              
              <button
                onClick={scrollNext}
                className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Grid */
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard 
                key={testimonial.id}
                testimonial={testimonial} 
                isVisible={gridVisible} 
                index={index}
              />
            ))}
          </div>
        )}

        {/* Aggregated Platform Reviews Widget */}
        <div 
          ref={statsRef}
          className={`mt-20 lg:mt-24 transition-all duration-700 ${
            statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Main stats banner */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-10 lg:p-12 border border-primary/20 mb-10">
            <div className="text-center mb-8">
              <p className="text-primary uppercase tracking-widest text-xs font-semibold mb-3">
                {t.testimonials.platformReviewsLabel || 'Recenzii de pe Platforme'}
              </p>
              <h3 className="text-2xl md:text-3xl lg:text-4xl heading-premium text-foreground">
                {t.testimonials.platformReviewsTitle || 'Peste 500 de recenzii de 5 stele'}
              </h3>
              <p className="text-foreground/60 dark:text-muted-foreground text-sm mt-3 text-premium">
                {t.testimonials.platformReviewsSubtitle || 'de la oaspeții noștri pe toate platformele'}
              </p>
            </div>
            
            {/* Platform badges */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {/* Booking.com */}
              <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-border">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">B</div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">9.4</span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Booking.com</p>
                </div>
              </div>
              
              {/* Airbnb */}
              <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-border">
                <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center text-white font-bold text-lg">A</div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">4.9</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Airbnb</p>
                </div>
              </div>
              
              {/* Google */}
              <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-border">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 flex items-center justify-center text-white font-bold text-lg">G</div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">4.8</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Google Reviews</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust stats row */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">4.9/5</p>
              <p className="text-foreground/60 dark:text-muted-foreground text-sm">{t.testimonials.avgRating}</p>
            </div>
            <div className="text-center" style={{ transitionDelay: '100ms' }}>
              <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">500+</p>
              <p className="text-foreground/60 dark:text-muted-foreground text-sm">{t.testimonials.verifiedReviews}</p>
            </div>
            <div className="text-center" style={{ transitionDelay: '200ms' }}>
              <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">98%</p>
              <p className="text-foreground/60 dark:text-muted-foreground text-sm">{t.testimonials.happyClients}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
