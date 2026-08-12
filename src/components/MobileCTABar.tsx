import { useEffect, useState } from "react";
import { Phone, MessageCircle, Calculator } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";
import { trackCriticalConversion } from "@/lib/conversionTracking";
import { COOKIE_BANNER_STATE_EVENT } from "@/components/CookieConsent";

/**
 * Sticky bottom CTA bar (mobile only).
 *
 * Rules:
 *  - appears only after the user scrolls past the hero (~80% of the viewport),
 *    so it never competes with the LCP hero CTA;
 *  - hides while the cookie consent banner is on screen (that banner sits at
 *    z-[9999] bottom and must stay fully readable/tappable);
 *  - one tap to the two highest-intent actions: yield calculator and talking
 *    to a consultant (WhatsApp / phone).
 */
const MobileCTABar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackCall, trackWhatsApp } = useCtaAnalytics();
  const { lightTap } = useHapticFeedback();

  const [pastHero, setPastHero] = useState(false);
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false);

  const translations = {
    ro: { call: "Sună", whatsapp: "WhatsApp", calc: "Calculează Randament" },
    en: { call: "Call", whatsapp: "WhatsApp", calc: "Calculate yield" },
  };
  const t = translations[language as keyof typeof translations] || translations.ro;

  // Scroll gate — show only below the hero fold.
  useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > window.innerHeight * 0.8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Never overlap the GDPR consent banner.
  useEffect(() => {
    const onBanner = (e: Event) => {
      const detail = (e as CustomEvent<{ visible?: boolean }>).detail;
      setCookieBannerVisible(Boolean(detail?.visible));
    };
    window.addEventListener(COOKIE_BANNER_STATE_EVENT, onBanner);
    return () => window.removeEventListener(COOKIE_BANNER_STATE_EVENT, onBanner);
  }, []);

  const fireContactClick = (method: string) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "contact_click", { method, page_path: window.location.pathname });
    }
  };

  const handleCall = () => {
    lightTap();
    trackCall();
    fireContactClick("phone");
    window.location.href = "tel:+40799069256";
  };

  const handleWhatsApp = () => {
    lightTap();
    trackWhatsApp();
    fireContactClick("whatsapp");
    trackCriticalConversion("WhatsApp_Click", { source: "mobile_cta_bar" });
    const message = encodeURIComponent(
      language === "ro"
        ? "Bună ziua, aș dori o estimare de randament pentru apartamentul meu."
        : "Hello, I'd like a yield estimate for my apartment.",
    );
    window.open(`https://wa.me/40799069256?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleCalculator = () => {
    lightTap();
    if (typeof window.gtag === "function") {
      window.gtag("event", "calculator_open", { source: "mobile_cta_bar" });
    }
    const calculator = document.getElementById("calculator");
    if (calculator) {
      window.dispatchEvent(new Event("force-show-calculator"));
      calculator.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/pentru-proprietari#calculator");
  };

  const hidden = !pastHero || cookieBannerVisible;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom",
        "transition-transform duration-300 ease-out",
        hidden ? "translate-y-full pointer-events-none" : "translate-y-0",
      )}
      aria-hidden={hidden}
    >
      <div className="grid grid-cols-[1.6fr_1fr_1fr]">
        {/* Primary intent: yield calculator */}
        <button
          onClick={handleCalculator}
          aria-label={language === "ro" ? "Calculează randamentul apartamentului" : "Calculate your apartment yield"}
          className={cn(
            "flex items-center justify-center gap-2 min-h-[52px] py-3 px-2 bg-primary",
            "active:scale-95 transition-all duration-150 hover:bg-primary/90",
          )}
        >
          <Calculator className="w-5 h-5 text-primary-foreground shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-bold text-primary-foreground leading-tight text-left">{t.calc}</span>
        </button>

        {/* WhatsApp consultant */}
        <button
          onClick={handleWhatsApp}
          aria-label={language === "ro" ? "Scrie unui consultant pe WhatsApp" : "Message a consultant on WhatsApp"}
          className={cn(
            "flex flex-col items-center justify-center min-h-[52px] py-3 px-1 bg-whatsapp",
            "active:scale-95 transition-all duration-150 hover:bg-whatsapp-hover",
          )}
        >
          <MessageCircle className="w-5 h-5 text-white mb-0.5" aria-hidden="true" />
          <span className="text-[10px] font-bold text-white">{t.whatsapp}</span>
        </button>

        {/* Phone consultant */}
        <button
          onClick={handleCall}
          aria-label={language === "ro" ? "Sună un consultant RealTrust" : "Call a RealTrust consultant"}
          className={cn(
            "flex flex-col items-center justify-center min-h-[52px] py-3 px-1 bg-card border-l border-border",
            "active:scale-95 transition-all duration-150 hover:bg-muted",
          )}
        >
          <Phone className="w-5 h-5 text-foreground mb-0.5" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-foreground">{t.call}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileCTABar;
