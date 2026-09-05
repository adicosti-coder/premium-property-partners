import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Hero image served from public/ — single 800w variant (mobile-first, ~35KB).
// Desktop CSS scales it. Avoids the 150KB 1920w fetch that PageSpeed mobile penalises.
const HERO_IMAGE_PUBLIC = "/images/hero-optimized-800w.webp";

const fireHeroAnalyticsEvent = (eventName: string, params: Record<string, string>) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
};

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

  // Defer video loading for better LCP - DESKTOP ONLY
  useEffect(() => {
    if (isMobile || isSlowConnection) {
      setShouldLoadVideo(false);
      return;
    }
    const timer = setTimeout(() => setShouldLoadVideo(true), 2500);
    return () => clearTimeout(timer);
  }, [isMobile, isSlowConnection]);

  // Fetch hero settings from database only after real interaction.
  // No timer fallback here: Lighthouse would otherwise include it in the critical path.
  useEffect(() => {
    let cancelled = false;
    let triggered = false;
    const events = ["scroll", "click", "touchstart"] as const;

    const load = async () => {
      if (triggered || cancelled) return;
      triggered = true;
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data, error } = await (supabase
          .from("public_site_settings" as any)
          .select("hero_video_url, hero_image_url, hero_title_ro, hero_title_en, hero_highlight_ro, hero_highlight_en, hero_subtitle_ro, hero_subtitle_en, hero_badge_ro, hero_badge_en, hero_tags_ro, hero_tags_en, hero_cta_primary_ro, hero_cta_primary_en, hero_cta_secondary_ro, hero_cta_secondary_en")
          .single() as any);
        if (cancelled || error || !data) return;
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
      } catch {
        // silent: fallback to static text
      }
    };

    const trigger = () => {
      events.forEach(e => document.removeEventListener(e, trigger as EventListener));
      window.requestIdleCallback?.(() => load()) ?? window.setTimeout(load, 1);
    };

    events.forEach(e => document.addEventListener(e, trigger as EventListener, { once: true, passive: true }));

    return () => {
      cancelled = true;
      events.forEach(e => document.removeEventListener(e, trigger as EventListener));
    };
  }, [language]);

  // No skeleton delay — React Hero renders directly as LCP element

  // Check connection speed
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const slowTypes = ['slow-2g', '2g', '3g'];
      setIsSlowConnection(slowTypes.includes(connection.effectiveType) || connection.saveData);
    }
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-28 md:pt-32">
      {/* Background: static image + video (desktop only) */}
      <div className="absolute inset-0 overflow-hidden">
        {heroSettings.customFallbackImage ? (
          <img
            src={heroSettings.customFallbackImage}
            alt="RealTrust Imobiliare Timișoara — apartamente premium regim hotelier, ROI 9.4% net verificat."
            className="w-full h-full object-cover hero-kenburns"
            width={1600}
            height={894}
            // React <18.3 doesn't whitelist camelCase fetchPriority — emits a
            // dev warning. Pass the DOM-spec attribute (lowercase) via spread
            // so the warning is silenced while the browser still gets the hint.
            {...({ fetchpriority: "high" } as Record<string, string>)}
            decoding="async"
            loading="eager"
          />
        ) : (
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet="/images/hero-cinematic-1600w.webp"
              type="image/webp"
            />
            <img
              src={HERO_IMAGE_PUBLIC}
              alt="RealTrust Imobiliare Timișoara — apartament premium regim hotelier cu design cinematic, ROI 9.4% net verificat."
              className="w-full h-full object-cover object-center hero-kenburns"
              width={800}
              height={447}
              {...({ fetchpriority: "high" } as Record<string, string>)}
              decoding="async"
              loading="eager"
            />
          </picture>
        )}
        {/* Video — desktop only */}
        {!isMobile && shouldLoadVideo && !videoError && !isSlowConnection && heroSettings.videoUrl && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            onError={() => setVideoError(true)}
            onLoadedData={() => setVideoLoaded(true)}
            onAbort={() => setVideoError(true)}
          >
            <source src={heroSettings.videoUrl} type="video/mp4" />
          </video>
        )}
      </div>
      
      {/* Cinematic multi-layer overlay — depth + readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/60 to-background/10 dark:from-background/85 dark:via-background/40 dark:to-transparent z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20 z-[1] pointer-events-none" />
      {/* Subtle vignette for editorial feel */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.45)' }} />
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-[2]" />
      
      <div className="container relative z-10 mx-auto px-6 py-20 lg:py-32 min-h-[60vh] md:min-h-[50vh]">
        <div className="max-w-4xl">
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-foreground leading-tight mb-6">
            <StaticTitle 
              title={heroSettings.customTitle || t.hero.title} 
              titleMid={t.hero.titleMid}
              highlight={heroSettings.customHighlight || t.hero.titleHighlight} 
            />
          </h1>
          
          {/* Subheadline + CTAs + Features */}
          <HeroContent 
            subtitle={heroSettings.customSubtitle || t.hero.subtitle}
            ctaPrimary={heroSettings.customCtaPrimary || t.hero.cta}
            ctaSecondary={heroSettings.customCtaSecondary || t.hero.ctaSecondary}
            t={t}
            isMobile={isMobile}
            language={language}
          />
        </div>
      </div>
      
      {/* KPI Overlay Badges - desktop only, positioned above scroll indicator */}
      {!isMobile && (
        <div className="absolute bottom-44 right-6 lg:right-12 z-20 flex flex-col gap-3">
          <div className="px-5 py-3 bg-background/90 dark:bg-background/80 backdrop-blur-sm rounded-xl border border-primary/50 shadow-lg">
            <span className="text-primary font-bold text-xl">{language === 'ro' ? 'Randament net 9,4%' : '9.4% net yield'}</span>
            <span className="text-xs text-muted-foreground block">{language === 'ro' ? 'Ipoteze transparente: ocupare 75%, deducere 27%' : 'Transparent assumptions: 75% occupancy, 27% costs'}</span>
          </div>
          <div className="px-5 py-3 bg-background/90 dark:bg-background/80 backdrop-blur-sm rounded-xl border border-border shadow-lg">
            <span className="font-bold text-foreground text-lg">{language === 'ro' ? 'Tu încasezi, noi operăm' : 'You earn, we operate'}</span>
            <span className="text-xs text-muted-foreground block">{language === 'ro' ? 'Operare hotelieră completă' : 'Full hotel-style operations'}</span>
          </div>
        </div>
      )}
      
      {/* Scroll indicator – desktop only */}
      {!isMobile && (
        <button 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 cursor-pointer bg-transparent border-0 min-w-[48px] min-h-[48px] p-2"
          onClick={() => {
            const nextSection = document.getElementById('calculator') || document.getElementById('benefits');
            nextSection?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label={language === 'ro' ? 'Vezi cât poate produce apartamentul tău — derulează la calculator' : 'See your apartment’s monthly potential — scroll to calculator'}
        >
          <span className="text-sm md:text-base font-bold text-primary-foreground tracking-wide uppercase px-4 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm shadow-lg">
            {language === 'ro' ? 'Vezi cât poate produce apartamentul tău' : 'See your apartment’s monthly potential'}
          </span>
          <div className="w-9 h-14 rounded-full border-2 border-primary flex items-start justify-center p-2 shadow-[0_0_16px_hsl(var(--primary)/0.3)]">
            <div className="w-2 h-3.5 bg-primary rounded-full animate-bounce" />
          </div>
        </button>
      )}
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

// Static title — renders instantly for fast LCP
const StaticTitle = ({ title, titleMid, highlight }: { title: string; titleMid: string; highlight: string }) => (
  <span className="block">
    <span className="block">{title}</span>
    <span className="block text-2xl md:text-3xl lg:text-4xl font-normal italic text-foreground/90 my-2">
      {titleMid}
    </span>
    <span className="block">
      <span className="inline-flex items-baseline gap-1 px-2 py-1 rounded-lg bg-background/35 backdrop-blur-sm border border-border/40">
        <span className="text-gradient-gold">{highlight}</span>
      </span>
    </span>
  </span>
);

// HeroContent — compact layout
const HeroContent = ({ 
  subtitle, 
  ctaPrimary,
  ctaSecondary,
  t,
  isMobile,
  language,
}: { 
  subtitle: string; 
  ctaPrimary: string;
  ctaSecondary: string;
  t: any;
  isMobile: boolean;
  language: string;
}) => {
  const trackManagement = () => fireHeroAnalyticsEvent("lead_administrare", { page_path: "/" });

  const trackInvestment = () =>
    fireHeroAnalyticsEvent("interes_imobiliar", {
      interes_imobil: "investitie",
      buget_client: "estimat",
      page_path: "/",
    });
  return (
    <>
      <div className="max-w-2xl mb-8 min-h-[5.5rem] md:min-h-[6rem]">
        <p className="text-lg md:text-xl text-foreground leading-relaxed">
          {subtitle.split('\n').map((line, i) => (
            <span key={i}>{line}{i < subtitle.split('\n').length - 1 && <br />}</span>
          ))}
        </p>
      </div>
      
      {/* CTAs — gap-8 (32px) for WCAG AAA touch-target spacing on mobile */}
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-4">
        <Button 
          variant="hero" 
          size="xl" 
          className="relative animate-glow-pulse btn-shine w-full sm:w-auto whitespace-normal text-center leading-snug min-h-[56px] h-auto py-3"
          onClick={() => { trackManagement(); window.dispatchEvent(new Event("force-show-calculator")); }}
        >
          {ctaPrimary}
        </Button>
         <a
           href="/investitii"
           onClick={() => trackInvestment()}
           className="btn-shine w-full sm:w-auto whitespace-normal text-center leading-snug min-h-[56px] h-auto py-3 px-10 text-base rounded-xl inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 bg-foreground text-background border border-foreground"
         >
           {ctaSecondary}
         </a>
      </div>
      
      {/* Trust text */}
      <div className="mt-6">
         <p className="text-foreground/90 text-sm">
           {t.hero.trustText}
         </p>
         <p className="text-foreground/90 text-sm mt-1">
           {t.hero.trustPrivacy}
         </p>
      </div>
      
      {/* Compact Feature Strip — single row instead of 3 cards */}
      {!isMobile && (
        <div className="flex items-center gap-6 mt-8 py-4 px-6 bg-card/80 border border-border/50 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground font-medium">{t.hero.features?.paymentsDesc || "Randament calculat transparent"}</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground font-medium">{t.hero.features?.modelDesc || "Tu încasezi, noi operăm"}</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground font-medium">{t.hero.features?.responseDesc || "Răspuns în aceeași zi"}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default Hero;
