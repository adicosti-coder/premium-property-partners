import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cinematic.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

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
        className="absolute inset-0 transition-[filter] duration-300"
        style={{ 
          transform: isMobile ? 'scale(1.05)' : `translateY(${parallaxOffset}px) scale(1.05)`,
          filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
          willChange: isMobile ? 'auto' : 'transform, filter'
        }}
      >
        {/* Fallback image - always rendered for instant LCP */}
        <img
          src={heroSettings.customFallbackImage || heroImage}
          alt="Apartament de lux"
          className={`w-full h-full object-cover transition-opacity duration-700 animate-hero-zoom ${videoLoaded && !videoError && !isSlowConnection && shouldLoadVideo ? 'opacity-0' : 'opacity-100'}`}
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          loading="eager"
        />
        {/* Video - only load when shouldLoadVideo is true and conditions are met */}
        {shouldLoadVideo && !videoError && !isSlowConnection && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoLoaded(true)}
            poster={heroSettings.customFallbackImage || heroImage}
          >
            <source src={heroSettings.videoUrl} type="video/mp4" />
          </video>
        )}
      </div>
      
      {/* Content gradient overlay - subtle for text readability while keeping image visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/20 to-transparent z-[1]" />
      
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)",
        }}
      />
      
      {/* Film grain overlay */}
      <div className="absolute inset-0 pointer-events-none z-[2] film-grain opacity-[0.04]" />
      
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
          <div 
            className="inline-flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 mb-8 animate-fade-up text-center animate-badge-glow backdrop-blur-sm" 
            style={{ animationDelay: '0.1s' }}
          >
            <span className="text-foreground/80 text-sm font-medium tracking-wide">Vânzare · Administrare · Cazare</span>
            <span className="text-primary text-sm font-semibold">1 singur sistem</span>
          </div>
          
          {/* Headline with typing animation - 3 lines layout */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <TypingTitle 
              title={heroSettings.customTitle || t.hero.title} 
              titleMid={t.hero.titleMid}
              highlight={heroSettings.customHighlight || t.hero.titleHighlight} 
            />
          </h1>
          
          {/* Subheadline with typing animation + CTAs + Feature Cards */}
          <HeroContent 
            subtitle={heroSettings.customSubtitle || t.hero.subtitle}
            titleLength={(heroSettings.customTitle || t.hero.title).length}
            highlightLength={(heroSettings.customHighlight || t.hero.titleHighlight).length}
            ctaPrimary={heroSettings.customCtaPrimary || t.hero.cta}
            ctaSecondary={heroSettings.customCtaSecondary || t.hero.ctaSecondary}
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

// Typing title component - 3 lines layout
const TypingTitle = ({ title, titleMid, highlight }: { title: string; titleMid: string; highlight: string }) => {
  const { displayedText: titleText, isComplete: titleComplete } = useTypingAnimation({
    text: title,
    speed: 30,
    delay: 200
  });
  
  const { displayedText: highlightText, isComplete: highlightComplete } = useTypingAnimation({
    text: highlight,
    speed: 35,
    delay: 200 + title.length * 30 + 300
  });

  return (
    <span className="block">
      <span className="block">{titleText}</span>
      {titleComplete && (
        <span className="block text-2xl md:text-3xl lg:text-4xl font-normal italic text-muted-foreground my-2">
          {titleMid}
        </span>
      )}
      {titleComplete && (
        <span className="block text-gradient-gold">
          {highlightText}
          <span className={`inline-block w-0.5 h-[0.9em] bg-primary ml-1 align-middle transition-opacity duration-300 ${highlightComplete ? 'opacity-0' : 'animate-pulse'}`} />
        </span>
      )}
    </span>
  );
}

// HeroContent component with typing subtitle and feature cards
const HeroContent = ({ 
  subtitle, 
  titleLength, 
  highlightLength,
  ctaPrimary,
  ctaSecondary,
  t
}: { 
  subtitle: string; 
  titleLength: number; 
  highlightLength: number;
  ctaPrimary: string;
  ctaSecondary: string;
  t: any;
}) => {
  const titleDuration = 200 + titleLength * 30 + 300 + highlightLength * 35 + 150;
  
  const { displayedText: subtitleText, isComplete: subtitleComplete } = useTypingAnimation({
    text: subtitle,
    speed: 18,
    delay: titleDuration
  });

  return (
    <>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
        {subtitleText}
        <span className={`inline-block w-0.5 h-[1em] bg-muted-foreground/50 ml-0.5 align-middle transition-opacity duration-300 ${subtitleComplete ? 'opacity-0' : 'animate-pulse'}`} />
      </p>
      
      {/* CTAs */}
      <div className={`flex flex-col gap-3 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <Button 
          variant="hero" 
          size="xl" 
          className={`relative animate-glow-pulse btn-shine w-full sm:w-auto transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: subtitleComplete ? '50ms' : '0ms' }}
          onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {ctaPrimary}
        </Button>
        <Button 
          variant="heroOutline" 
          size="xl" 
          className={`btn-shine hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] w-full sm:w-auto transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: subtitleComplete ? '120ms' : '0ms' }}
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {ctaSecondary}
        </Button>
      </div>
      
      {/* Trust text */}
      <div 
        className={`mt-6 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '180ms' : '0ms' }}
      >
        <p className="text-muted-foreground text-sm">
          {t.hero.trustText} <span className="font-semibold text-foreground">24h</span>
        </p>
        <p className="text-muted-foreground/70 text-sm mt-1">
          {t.hero.trustPrivacy}
        </p>
      </div>
      
      {/* Feature Cards */}
      <div 
        className={`grid grid-cols-1 gap-3 mt-8 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '250ms' : '0ms' }}
      >
        <div className="p-4 bg-card/60 border border-border/50 rounded-xl backdrop-blur-sm">
          <p className="text-muted-foreground text-sm">{t.hero.features?.payments || "Plăți"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.paymentsDesc || "Direct la proprietar"}</p>
        </div>
        <div className="p-4 bg-card/60 border border-border/50 rounded-xl backdrop-blur-sm">
          <p className="text-muted-foreground text-sm">{t.hero.features?.model || "Model"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.modelDesc || "Transparent, fără blocaje"}</p>
        </div>
        <div className="p-4 bg-card/60 border border-border/50 rounded-xl backdrop-blur-sm">
          <p className="text-muted-foreground text-sm">{t.hero.features?.response || "Răspuns"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.responseDesc || "În aceeași zi"}</p>
        </div>
      </div>
    </>
  );
}

export default Hero;
