import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cinematic.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { supabase } from "@/lib/supabaseClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown } from "lucide-react";
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

  // Parallax effect on scroll – desktop only, throttled via rAF
  useEffect(() => {
    if (isMobile) return; // Skip entirely on mobile to save main thread

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Reduce parallax calculations on mobile for performance
  const parallaxOffset = isMobile ? 0 : scrollY * 0.4;
  const blurAmount = isMobile ? 0 : Math.min(scrollY * 0.02, 10);
  const contentOpacity = Math.max(1 - scrollY * 0.002, 0);
  const contentTranslate = isMobile ? 0 : scrollY * 0.3;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-44 md:pt-32">
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
      
      {/* Content gradient overlay - theme-aware for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/45 to-transparent dark:from-background/70 dark:via-background/30 z-[1]" />
      
      {/* Dramatic cinematic vignette – desktop only */}
      {!isMobile && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.20) 70%, rgba(0,0,0,0.45) 100%)",
          }}
        />
      )}
      
      {/* Film grain overlay – desktop only */}
      {!isMobile && <div className="absolute inset-0 pointer-events-none z-[2] film-grain opacity-[0.04]" />}
      
      {/* Warm golden color grading overlay – desktop only */}
      {!isMobile && (
        <div 
          className="absolute inset-0 pointer-events-none z-[1] mix-blend-overlay"
          style={{
            background: "linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(180, 140, 40, 0.05) 50%, rgba(139, 90, 43, 0.06) 100%)",
          }}
        />
      )}
      
      {/* Cinematic lens flare – desktop only */}
      {!isMobile && (
        <>
          <div 
            className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none z-[1] animate-lens-flare"
            style={{
              background: "radial-gradient(ellipse at 80% 20%, rgba(255, 215, 100, 0.15) 0%, rgba(255, 200, 80, 0.08) 25%, transparent 60%)",
              transform: "translate(20%, -30%)",
            }}
          />
          <div 
            className="absolute top-20 right-40 w-16 h-16 pointer-events-none z-[1] rounded-full animate-flare-orb"
            style={{
              background: "radial-gradient(circle, rgba(255, 230, 150, 0.4) 0%, rgba(255, 215, 100, 0.1) 40%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
        </>
      )}
      
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
      
      {/* KPI Overlay Badges - improved contrast */}
      <div className="absolute bottom-32 right-6 lg:right-12 z-20 hidden md:flex flex-col gap-3">
        <div className="kpi-badge px-5 py-3 bg-background/90 dark:bg-background/80 backdrop-blur-sm rounded-xl border border-primary/50 shadow-lg">
          <span className="text-primary font-bold text-xl">+40% Yield</span>
          <span className="text-xs text-muted-foreground block">vs Chirie clasică</span>
        </div>
        <div className="kpi-badge px-5 py-3 bg-background/90 dark:bg-background/80 backdrop-blur-sm rounded-xl border border-border shadow-lg">
          <span className="font-bold text-foreground text-lg">Zero Stress</span>
          <span className="text-xs text-muted-foreground block">Operare full</span>
        </div>
      </div>
      
      {/* Scroll Encouragement Indicator – desktop only, CSS animations to avoid framer-motion in critical path */}
      {!isMobile && (
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 cursor-pointer animate-fade-up"
          style={{ animationDelay: '3s', animationFillMode: 'backwards' }}
          onClick={() => {
            const nextSection = document.getElementById('calculator') || document.getElementById('benefits');
            nextSection?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="text-xs text-foreground/70 font-medium tracking-wider uppercase">
            {language === 'ro' ? 'Descoperă mai mult' : 'Discover more'}
          </span>
          <div className="w-8 h-12 rounded-full border-2 border-primary/50 flex items-start justify-center p-2 hover:border-primary transition-colors">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" />
          </div>
          <ChevronDown className="w-5 h-5 text-primary/70 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      )}
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
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
        <span className="block text-2xl md:text-3xl lg:text-4xl font-normal italic text-foreground/90 my-2">
          {titleMid}
        </span>
      )}

      {titleComplete && (
        <span className="block">
          <span className="inline-flex items-baseline gap-1 px-2 py-1 rounded-lg bg-background/35 backdrop-blur-sm border border-border/40">
            <span className="text-gradient-gold">{highlightText}</span>
            <span
              className={`inline-block w-0.5 h-[0.9em] bg-primary align-middle transition-opacity duration-300 ${
                highlightComplete ? "opacity-0" : "animate-pulse"
              }`}
            />
          </span>
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
      <p className="text-lg md:text-xl text-foreground max-w-2xl mb-8 leading-relaxed">
        {subtitleText}
        <span
          className={`inline-block w-0.5 h-[1em] bg-foreground/60 ml-0.5 align-middle transition-opacity duration-300 ${
            subtitleComplete ? "opacity-0" : "animate-pulse"
          }`}
        />
      </p>
      
      {/* CTAs */}
      <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
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
           asChild
           variant="heroOutline"
           size="xl"
           className={`btn-shine hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] w-full sm:w-auto transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
           style={{ transitionDelay: subtitleComplete ? '120ms' : '0ms' }}
         >
           <a href="/pentru-proprietari#service-options">{ctaSecondary}</a>
         </Button>
      </div>
      
      {/* Quick Contact Row - WhatsApp prominent */}
      <div 
        className={`flex items-center gap-4 mt-4 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '150ms' : '0ms' }}
      >
        <a
          href="https://wa.me/40723154520?text=Bună!%20Sunt%20interesat%20de%20serviciile%20RealTrust."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-lg font-medium text-sm transition-all hover:scale-105 shadow-md"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          WhatsApp
        </a>
        <a
          href="tel:+40723154520"
          className="inline-flex items-center gap-2 text-foreground/80 hover:text-primary text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          +40 723 154 520
        </a>
      </div>
      
      {/* Trust text */}
      <div 
        className={`mt-6 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '180ms' : '0ms' }}
      >
        <p className="text-foreground/90 text-sm">
          {t.hero.trustText} <span className="font-semibold text-foreground">24h</span>
        </p>
        <p className="text-foreground/80 text-sm mt-1">
          {t.hero.trustPrivacy}
        </p>
      </div>
      
      {/* Feature Cards */}
      <div 
        className={`grid grid-cols-1 gap-3 mt-8 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: subtitleComplete ? '250ms' : '0ms' }}
      >
        <div className="p-4 bg-card/90 border border-border/70 rounded-xl backdrop-blur-sm shadow-sm">
          <p className="text-foreground/80 text-sm">{t.hero.features?.payments || "Plăți"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.paymentsDesc || "Direct la proprietar"}</p>
        </div>
        <div className="p-4 bg-card/90 border border-border/70 rounded-xl backdrop-blur-sm shadow-sm">
          <p className="text-foreground/80 text-sm">{t.hero.features?.model || "Model"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.modelDesc || "Transparent, fără blocaje"}</p>
        </div>
        <div className="p-4 bg-card/90 border border-border/70 rounded-xl backdrop-blur-sm shadow-sm">
          <p className="text-foreground/80 text-sm">{t.hero.features?.response || "Răspuns"}</p>
          <p className="text-foreground font-medium">{t.hero.features?.responseDesc || "În aceeași zi"}</p>
        </div>
      </div>
    </>
  );
}

export default Hero;
