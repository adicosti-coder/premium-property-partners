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
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Hero video - custom uploaded video
  const videoUrl = "/hero-video.mp4";

  // Check connection speed for lazy loading
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g'];
      setIsSlowConnection(slowTypes.includes(connection.effectiveType) || connection.saveData);
    }
  }, []);

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
        {!videoError && !isSlowConnection ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={`w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoLoaded(true)}
            poster={heroImage}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : null}
        {/* Fallback image - always rendered for instant display, hidden when video loads */}
        <img
          src={heroImage}
          alt="Apartament de lux"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded && !videoError && !isSlowConnection ? 'opacity-0' : 'opacity-100'}`}
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
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
          
          {/* Subheadline with typing animation + CTAs + Tags + Widget */}
          <HeroContent 
            subtitle={t.hero.subtitle}
            titleLength={t.hero.title.length}
            highlightLength={t.hero.titleHighlight.length}
            ctaQuickStart={t.hero.ctaQuickStart || "Start rapid"}
            cta={t.hero.cta}
            tags={[
              t.hero.tags?.hotelManagement || "Administrare regim hotelier", 
              t.hero.tags?.dynamicPricing || "Prețuri dinamice", 
              t.hero.tags?.selfCheckIn || "Self check-in 24/7", 
              t.hero.tags?.cleaning || "Curățenie profesională"
            ]}
            t={t}
          />
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
    speed: 30, // Faster typing (was 40)
    delay: 200 // Shorter initial delay (was 300)
  });
  
  const { displayedText: highlightText, isComplete: highlightComplete } = useTypingAnimation({
    text: highlight,
    speed: 35, // Faster typing (was 50)
    delay: 200 + title.length * 30 + 100 // Reduced buffer (was 200)
  });

  return (
    <>
      {titleText}
      <span className={`inline-block w-0.5 h-[0.9em] bg-primary ml-1 align-middle transition-opacity duration-300 ${titleComplete ? 'opacity-0' : 'animate-pulse'}`} />
      {titleComplete && " "}
      <span className="text-gradient-gold">
        {highlightText}
        <span className={`inline-block w-0.5 h-[0.9em] bg-primary ml-1 align-middle transition-opacity duration-300 ${highlightComplete || !titleComplete ? 'opacity-0' : 'animate-pulse'}`} />
      </span>
    </>
  );
}

// HeroContent component with typing subtitle and sequential fade-in for all elements
const HeroContent = ({ 
  subtitle, 
  titleLength, 
  highlightLength,
  ctaQuickStart,
  cta,
  tags,
  t
}: { 
  subtitle: string; 
  titleLength: number; 
  highlightLength: number;
  ctaQuickStart: string;
  cta: string;
  tags: string[];
  t: any;
}) => {
  // Optimized timing: faster typing and shorter delays for mobile
  const titleDuration = 200 + titleLength * 30 + 100 + highlightLength * 35 + 150;
  
  const { displayedText: subtitleText, isComplete: subtitleComplete } = useTypingAnimation({
    text: subtitle,
    speed: 18, // Faster subtitle typing (was 25)
    delay: titleDuration
  });

  return (
    <>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
        {subtitleText}
        <span className={`inline-block w-0.5 h-[1em] bg-muted-foreground/50 ml-0.5 align-middle transition-opacity duration-300 ${subtitleComplete ? 'opacity-0' : 'animate-pulse'}`} />
      </p>
      
      {/* CTAs with sequential fade-in - optimized timing */}
      <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <Button 
          variant="hero" 
          size="xl" 
          className={`relative animate-glow-pulse btn-shine transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: subtitleComplete ? '50ms' : '0ms' }}
          onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {ctaQuickStart}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button 
          variant="heroOutline" 
          size="xl" 
          className={`btn-shine hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: subtitleComplete ? '120ms' : '0ms' }}
          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {cta}
        </Button>
      </div>
      
      {/* Feature tags with sequential fade-in - optimized timing */}
      <div className="flex flex-wrap gap-2 mt-8">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className={`px-3 py-1.5 text-xs font-medium bg-card/50 border border-border/50 rounded-full text-foreground/80 cursor-default transition-all duration-250 hover:scale-110 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: subtitleComplete ? `${180 + index * 40}ms` : '0ms' }}
          >
            {tag}
          </span>
        ))}
      </div>
      
      {/* Availability Search Widget with fade-in - optimized */}
      <div 
        className={`mt-10 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '350ms' : '0ms' }}
      >
        <AvailabilitySearchWidget variant="hero" />
      </div>
      
      {/* Trust indicators with fade-in - optimized */}
      <div 
        className={`transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '450ms' : '0ms' }}
      >
        <StatsSection t={t} />
      </div>
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
