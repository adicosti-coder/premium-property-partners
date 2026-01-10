import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Users, Home } from "lucide-react";
import heroImage from "@/assets/apt-01.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import AvailabilitySearchWidget from "@/components/AvailabilitySearchWidget";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

interface HeroSettings {
  videoUrl: string;
  customFallbackImage: string | null;
  customTitle: string | null;
  customHighlight: string | null;
  customSubtitle: string | null;
  customBadge: string | null;
  customTags: string[] | null;
  customCtaPrimary: string | null;
  customCtaSecondary: string | null;
}

const Hero = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    videoUrl: "/hero-video.mp4",
    customFallbackImage: null,
    customTitle: null,
    customHighlight: null,
    customSubtitle: null,
    customBadge: null,
    customTags: null,
    customCtaPrimary: null,
    customCtaSecondary: null,
  });

  // Defer video loading for better LCP - load after initial paint
  useEffect(() => {
    // On mobile with slow connection, skip video entirely
    if (isMobile && isSlowConnection) {
      setShouldLoadVideo(false);
      return;
    }
    
    // Defer video loading to after initial content paint
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, isMobile ? 1500 : 500); // Longer delay on mobile
    
    return () => clearTimeout(timer);
  }, [isMobile, isSlowConnection]);

  // Fetch hero settings from database
  useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("hero_video_url, hero_image_url, hero_title_ro, hero_title_en, hero_highlight_ro, hero_highlight_en, hero_subtitle_ro, hero_subtitle_en, hero_badge_ro, hero_badge_en, hero_tags_ro, hero_tags_en, hero_cta_primary_ro, hero_cta_primary_en, hero_cta_secondary_ro, hero_cta_secondary_en")
          .eq("id", "default")
          .single();
        
        if (!error && data) {
          setHeroSettings({
            videoUrl: data.hero_video_url || "/hero-video.mp4",
            customFallbackImage: data.hero_image_url,
            customTitle: language === "ro" ? data.hero_title_ro : data.hero_title_en,
            customHighlight: language === "ro" ? data.hero_highlight_ro : data.hero_highlight_en,
            customSubtitle: language === "ro" ? data.hero_subtitle_ro : data.hero_subtitle_en,
            customBadge: language === "ro" ? data.hero_badge_ro : data.hero_badge_en,
            customTags: language === "ro" ? data.hero_tags_ro : data.hero_tags_en,
            customCtaPrimary: language === "ro" ? data.hero_cta_primary_ro : data.hero_cta_primary_en,
            customCtaSecondary: language === "ro" ? data.hero_cta_secondary_ro : data.hero_cta_secondary_en,
          });
        }
      } catch (err) {
        console.error("Error fetching hero settings:", err);
      }
    };
    
    fetchHeroSettings();
  }, [language]);

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

  // Reduce parallax calculations on mobile for performance
  const parallaxOffset = isMobile ? 0 : scrollY * 0.4;
  const blurAmount = isMobile ? 0 : Math.min(scrollY * 0.02, 10);
  const contentOpacity = Math.max(1 - scrollY * 0.002, 0);
  const contentTranslate = isMobile ? 0 : scrollY * 0.3;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Video or Fallback Image with Parallax */}
      <div 
        className="absolute inset-0 scale-110 transition-[filter] duration-300"
        style={{ 
          transform: isMobile ? 'scale(1.1)' : `translateY(${parallaxOffset}px) scale(1.1)`,
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
          willChange: isMobile ? 'auto' : 'transform, filter'
        }}
      >
        {/* Video - only load when shouldLoadVideo is true and conditions are met */}
        {shouldLoadVideo && !videoError && !isSlowConnection && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className={`w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoLoaded(true)}
            poster={heroSettings.customFallbackImage || heroImage}
          >
            <source src={heroSettings.videoUrl} type="video/mp4" />
          </video>
        )}
        {/* Fallback image - always rendered for instant LCP, hidden when video loads */}
        <img
          src={heroSettings.customFallbackImage || heroImage}
          alt="Apartament de lux"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded && !videoError && !isSlowConnection && shouldLoadVideo ? 'opacity-0' : 'opacity-100'}`}
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          loading="eager"
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
            <span className="text-foreground/80 text-sm font-medium tracking-wide">{heroSettings.customBadge || t.hero.badge}</span>
          </div>
          
          {/* Headline with typing animation */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <TypingTitle 
              title={heroSettings.customTitle || t.hero.title} 
              highlight={heroSettings.customHighlight || t.hero.titleHighlight} 
            />
          </h1>
          
          {/* Subheadline with typing animation + CTAs + Tags + Widget */}
          <HeroContent 
            subtitle={heroSettings.customSubtitle || t.hero.subtitle}
            titleLength={(heroSettings.customTitle || t.hero.title).length}
            highlightLength={(heroSettings.customHighlight || t.hero.titleHighlight).length}
            ctaQuickStart={heroSettings.customCtaPrimary || t.hero.ctaQuickStart || "Start rapid"}
            cta={heroSettings.customCtaSecondary || t.hero.cta}
            tags={heroSettings.customTags && heroSettings.customTags.length > 0 
              ? heroSettings.customTags 
              : [
                  t.hero.tags?.hotelManagement || "Dynamic pricing", 
                  t.hero.tags?.dynamicPricing || "Self check-in 24/7", 
                  t.hero.tags?.selfCheckIn || "Curățenie hotel", 
                  t.hero.tags?.cleaning || "Mentenanță",
                  t.hero.tags?.reviews || "Recenzii & suport",
                  t.hero.tags?.reporting || "Raportare"
                ]
            }
            t={t}
          />
        </div>
      </div>
      
      {/* KPI Overlay Badges */}
      <div className="absolute bottom-32 right-6 lg:right-12 z-20 hidden md:flex flex-col gap-3">
        <div className="kpi-badge px-5 py-3 bg-background/80 backdrop-blur-sm rounded-xl border border-primary/40 shadow-lg">
          <span className="text-primary font-bold text-xl">+40% Yield</span>
          <span className="text-xs text-muted-foreground block">vs Chirie clasică</span>
        </div>
        <div className="kpi-badge px-5 py-3 bg-background/80 backdrop-blur-sm rounded-xl border border-border shadow-lg">
          <span className="font-bold text-foreground text-lg">Zero Stress</span>
          <span className="text-xs text-muted-foreground block">Operare full</span>
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
      
      {/* Direction Selector - compact cards */}
      <div 
        className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '180ms' : '0ms' }}
      >
        <Link 
          to="/imobiliare" 
          className="dir-item group p-4 bg-card/50 border border-border rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 text-center"
        >
          <Building2 className="w-5 h-5 mx-auto mb-2 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-foreground block">Imobiliare</span>
          <span className="text-xs text-muted-foreground">Vânzare & închiriere</span>
        </Link>
        <a 
          href="#calculator" 
          className="dir-item dir-cta relative p-4 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/15 transition-all duration-300 text-center overflow-hidden"
        >
          <div className="dir-shimmer" />
          <Home className="w-5 h-5 mx-auto mb-2 text-primary" />
          <span className="text-sm font-semibold text-primary block">Proprietari</span>
          <span className="text-xs text-muted-foreground">Administrare hotelieră</span>
        </a>
        <Link 
          to="/oaspeti" 
          className="dir-item group p-4 bg-card/50 border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 text-center"
        >
          <Users className="w-5 h-5 mx-auto mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-foreground block">Oaspeți</span>
          <span className="text-xs text-muted-foreground">Apartamente premium</span>
        </Link>
      </div>
      
      {/* Feature tags with sequential fade-in - optimized timing */}
      <div className="flex flex-wrap gap-2 mt-6">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className={`px-3 py-1.5 text-xs font-medium bg-card/50 border border-border/50 rounded-full text-foreground/80 cursor-default transition-all duration-250 hover:scale-110 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: subtitleComplete ? `${280 + index * 40}ms` : '0ms' }}
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
