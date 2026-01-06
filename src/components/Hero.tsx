import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/apt-01.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import AvailabilitySearchWidget from "@/components/AvailabilitySearchWidget";

const Hero = () => {
  const { t } = useLanguage();
  const [videoError, setVideoError] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Video URL - can be replaced with actual hosted video
  const videoUrl = "https://www.realtrust.ro/video/apart-hotel-timisoara-hero.mp4";

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.4;
  const blurAmount = Math.min(scrollY * 0.02, 10); // Max 10px blur
  const contentOpacity = Math.max(1 - scrollY * 0.002, 0); // Fade out content
  const contentTranslate = scrollY * 0.3; // Move content up slightly

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Video or Fallback Image with Parallax */}
      <div 
        className="absolute inset-0 scale-110 transition-[filter] duration-300"
        style={{ 
          transform: `translateY(${parallaxOffset}px) scale(1.1)`,
          filter: `blur(${blurAmount}px)`,
          willChange: 'transform, filter'
        }}
      >
        {!videoError ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            onError={() => setVideoError(true)}
            poster={heroImage}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={heroImage}
            alt="Apartament de lux Timișoara"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div 
        className="container relative z-10 mx-auto px-6 py-20 lg:py-32 transition-opacity duration-100"
        style={{ 
          opacity: contentOpacity,
          transform: `translateY(-${contentTranslate}px)`,
          willChange: 'opacity, transform'
        }}
      >
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground/80 text-sm font-medium tracking-wide">{t.hero.badge}</span>
          </div>
          
          {/* Headline with typing animation */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <TypingTitle title={t.hero.title} highlight={t.hero.titleHighlight} />
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {t.hero.subtitle}
          </p>
          
          {/* CTAs - Differentiated like realtrust.ro */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Button 
              variant="hero" 
              size="xl" 
              className="relative animate-glow-pulse btn-shine"
              onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t.hero.ctaQuickStart || "Start rapid"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="heroOutline" 
              size="xl" 
              className="btn-shine hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-shadow duration-300"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t.hero.cta}
            </Button>
          </div>
          
          {/* Feature tags like realtrust.ro */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[t.hero.tags?.hotelManagement || "Administrare regim hotelier", 
              t.hero.tags?.dynamicPricing || "Prețuri dinamice", 
              t.hero.tags?.selfCheckIn || "Self check-in 24/7", 
              t.hero.tags?.cleaning || "Curățenie profesională"].map((tag, index) => (
              <span 
                key={index} 
                className="px-3 py-1.5 text-xs font-medium bg-card/50 border border-border/50 rounded-full text-foreground/80 cursor-default transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground opacity-0 animate-fade-up"
                style={{ animationDelay: `${0.5 + index * 0.1}s`, animationFillMode: 'forwards' }}
              >
                {tag}
              </span>
            ))}
          </div>
          
          {/* Availability Search Widget */}
          <div className="mt-10 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <AvailabilitySearchWidget variant="hero" />
          </div>
          
          {/* Trust indicators with counting animation */}
          <StatsSection t={t} />
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

// Typing title component
const TypingTitle = ({ title, highlight }: { title: string; highlight: string }) => {
  const { displayedText: titleText, isComplete: titleComplete } = useTypingAnimation({
    text: title,
    speed: 40,
    delay: 300
  });
  
  const { displayedText: highlightText, isComplete: highlightComplete } = useTypingAnimation({
    text: highlight,
    speed: 50,
    delay: 300 + title.length * 40 + 200
  });

  return (
    <>
      {titleText}
      {titleComplete && " "}
      <span className="text-gradient-gold">
        {highlightText}
        {!highlightComplete && <span className="animate-pulse">|</span>}
      </span>
    </>
  );
}

// Stats section component with counting animations
const StatsSection = ({ t }: { t: any }) => {
  const { count: propertiesCount, elementRef: propertiesRef } = useCountAnimation({ 
    end: 150, 
    duration: 2000,
    delay: 200 
  });
  
  const { count: occupancyCount, elementRef: occupancyRef } = useCountAnimation({ 
    end: 98, 
    duration: 2000,
    delay: 400 
  });
  
  const { count: ratingCount, elementRef: ratingRef } = useCountAnimation({ 
    end: 4.9, 
    duration: 2000,
    delay: 600,
    decimals: 1 
  });

  return (
    <div className="mt-16 pt-8 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
      <p className="text-muted-foreground text-sm mb-4 uppercase tracking-widest">{t.hero.trustTitle}</p>
      <div className="flex flex-wrap gap-8 md:gap-16">
        <div ref={propertiesRef}>
          <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">
            {propertiesCount}+
          </p>
          <p className="text-muted-foreground text-sm">{t.hero.stats.properties}</p>
        </div>
        <div ref={occupancyRef}>
          <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">
            {occupancyCount}%
          </p>
          <p className="text-muted-foreground text-sm">{t.hero.stats.occupancy}</p>
        </div>
        <div ref={ratingRef}>
          <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">
            {ratingCount}★
          </p>
          <p className="text-muted-foreground text-sm">{t.hero.stats.rating}</p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
