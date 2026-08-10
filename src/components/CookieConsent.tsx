import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, SlidersHorizontal } from "lucide-react";
import { initMetaPixel } from "@/lib/conversionTracking";

const COOKIE_CONSENT_KEY = "cookie_consent_v2";
/** GDPR best practice: consent must be re-asked at least once a year. */
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Stored shape: {"choice":"all","ts":1690000000000}; bare strings from older builds still parse. */
const readStoredConsent = (): ConsentChoice | null => {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { choice?: string; ts?: number };
      if (!parsed.choice) return null;
      if (typeof parsed.ts === "number" && Date.now() - parsed.ts > CONSENT_TTL_MS) return null;
      return parsed.choice as ConsentChoice;
    }
    const value = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
    return value === "all" || value === "analytics_only" || value === "declined" ? value : null;
  } catch {
    return null;
  }
};

/** Fire this on window to reopen the preferences panel (e.g. from the footer). */
export const OPEN_COOKIE_PREFERENCES_EVENT = "realtrust:open-cookie-preferences";

type ConsentChoice = "all" | "analytics_only" | "declined";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const updateConsent = (choice: ConsentChoice) => {
  const adsGranted = choice === "all";
  const analyticsGranted = choice === "all" || choice === "analytics_only";

  // Consent Mode v2 — the default state (denied) is set in index.html before any tag loads.
  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: adsGranted ? "granted" : "denied",
      ad_user_data: adsGranted ? "granted" : "denied",
      ad_personalization: adsGranted ? "granted" : "denied",
    });
    window.gtag("set", "ads_data_redaction", !adsGranted);
  }

  // Meta Pixel is an advertising vendor → only loads after full consent.
  if (adsGranted) initMetaPixel();
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const stored = readStoredConsent();
      if (stored) {
        updateConsent(stored);
        setAnalyticsEnabled(stored === "all" || stored === "analytics_only");
        setAdsEnabled(stored === "all");
      } else {
        timer = setTimeout(() => setVisible(true), 1200);
      }
    } catch {
      // localStorage unavailable → keep everything denied and show the banner.
      timer = setTimeout(() => setVisible(true), 1200);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  // Allow revisiting the choice at any time (GDPR: consent must be withdrawable).
  useEffect(() => {
    const reopen = () => { setShowSettings(true); setVisible(true); };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, reopen);
  }, []);

  const save = useCallback((choice: ConsentChoice) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ choice, ts: Date.now() }));
    } catch { /* ignore */ }
    updateConsent(choice);
    setVisible(false);
    setShowSettings(false);
  }, []);

  const handleSaveSettings = () => {
    if (analyticsEnabled && adsEnabled) save("all");
    else if (analyticsEnabled || adsEnabled) save(adsEnabled ? "all" : "analytics_only");
    else save("declined");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 animate-in slide-in-from-bottom duration-500"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      aria-modal="false"
    >
      <div className="max-w-lg mx-auto sm:mx-0 sm:ml-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="cookie-consent-title" className="text-sm font-semibold text-foreground leading-tight">
              Îți respectăm datele personale
            </h2>
            <p id="cookie-consent-desc" className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Folosim cookie-uri esențiale pentru funcționarea site-ului și, doar cu acordul tău,
              cookie-uri de analiză și publicitate. Poți accepta tot, păstra doar strictul necesar sau
              alege în detaliu. Îți poți schimba oricând opțiunea.{" "}
              <Link to="/politica-confidentialitate" className="underline underline-offset-2 hover:text-foreground">
                Politica de confidențialitate
              </Link>
            </p>
          </div>
        </div>

        {showSettings && (
          <div className="px-5 pb-2 space-y-2.5 animate-in fade-in duration-200">
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-foreground font-medium">
                  Cookie-uri esențiale
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    Necesare pentru navigare, securitate și formulare.
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                  Mereu active
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-foreground" id="cookie-analytics-label">
                  Analiză trafic (GA4)
                  <span className="block text-[11px] text-muted-foreground">
                    Statistici anonime despre paginile vizitate.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsEnabled}
                  aria-labelledby="cookie-analytics-label"
                  onClick={() => setAnalyticsEnabled((v) => !v)}
                  className={`relative w-9 h-5 shrink-0 rounded-full transition-colors ${analyticsEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${analyticsEnabled ? "translate-x-4" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-foreground" id="cookie-ads-label">
                  Publicitate (Meta Pixel, Google Ads)
                  <span className="block text-[11px] text-muted-foreground">
                    Măsurarea campaniilor și remarketing.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adsEnabled}
                  aria-labelledby="cookie-ads-label"
                  onClick={() => setAdsEnabled((v) => !v)}
                  className={`relative w-9 h-5 shrink-0 rounded-full transition-colors ${adsEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${adsEnabled ? "translate-x-4" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Equal prominence for accept / reject — required by GDPR guidance. */}
        <div className="px-5 pb-4 pt-2 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
          {showSettings ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="text-xs h-9 sm:mr-auto"
              >
                Înapoi
              </Button>
              <Button size="sm" onClick={handleSaveSettings} className="text-xs h-9 px-4">
                Salvează preferințele
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-xs h-9 px-3 gap-1.5 sm:mr-auto"
                aria-label="Deschide preferințele pentru cookie-uri"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                Preferințe
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => save("declined")}
                className="text-xs h-9 px-4"
              >
                Doar esențiale
              </Button>
              <Button size="sm" onClick={() => save("all")} className="text-xs h-9 px-4">
                Accept toate
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
