import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Settings, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie_consent_v2";

type ConsentChoice = "all" | "analytics_only" | "declined" | null;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const updateConsent = (choice: ConsentChoice) => {
  if (!window.gtag) return;
  const granted = choice === "all";
  const analyticsOnly = choice === "analytics_only";
  window.gtag("consent", "update", {
    analytics_storage: granted || analyticsOnly ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentChoice;
      if (stored) {
        updateConsent(stored);
      } else {
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const save = useCallback((choice: ConsentChoice) => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, choice!); } catch {}
    updateConsent(choice);
    setVisible(false);
  }, []);

  const handleAcceptAll = () => save("all");
  const handleDecline = () => save("declined");
  const handleSaveSettings = () => {
    if (analyticsEnabled && adsEnabled) save("all");
    else if (analyticsEnabled) save("analytics_only");
    else save("declined");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 animate-in slide-in-from-bottom duration-500"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="max-w-lg mx-auto sm:mx-0 sm:ml-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              Confidențialitatea ta este importantă
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Folosim cookie-uri pentru a îmbunătăți experiența de navigare și pentru a analiza traficul pe realtrust.ro. Apăsând &ldquo;Acceptă Tot&rdquo;, ești de acord cu utilizarea acestora.
            </p>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="px-5 pb-2 space-y-2.5 animate-in fade-in duration-200">
            <div className="border border-border rounded-lg p-3 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-foreground font-medium">Cookie-uri esențiale</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Obligatoriu</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-foreground">Analiză trafic</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsEnabled}
                  onClick={() => setAnalyticsEnabled(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${analyticsEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${analyticsEnabled ? "translate-x-4" : ""}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-foreground">Publicitate</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adsEnabled}
                  onClick={() => setAdsEnabled(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${adsEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${adsEnabled ? "translate-x-4" : ""}`} />
                </button>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-2">
          <button
            onClick={handleDecline}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 mr-auto"
          >
            Refuză
          </button>
          {showSettings ? (
            <Button size="sm" onClick={handleSaveSettings} className="text-xs h-8 px-4">
              Salvează
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-xs h-8 px-3 gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Setări
              </Button>
              <Button size="sm" onClick={handleAcceptAll} className="text-xs h-8 px-4">
                Acceptă Tot
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
