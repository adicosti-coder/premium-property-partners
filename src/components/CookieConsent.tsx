import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "cookie_consent";

type ConsentStatus = "accepted" | "declined" | null;

const CookieConsent = () => {
  const { language } = useLanguage();
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored === "accepted" || stored === "declined") {
        setStatus(stored);
      } else {
        // Show banner after short delay for better UX
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleAccept = () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, "accepted"); } catch {}
    setStatus("accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, "declined"); } catch {}
    setStatus("declined");
    setVisible(false);
  };

  // Don't render if already decided or not yet visible
  if (status || !visible) return null;

  const t = language === "en"
    ? {
        message: "We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies.",
        accept: "Accept",
        decline: "Decline",
        privacy: "Privacy Policy",
      }
    : {
        message: "Folosim cookie-uri pentru a îmbunătăți experiența ta. Continuând navigarea, ești de acord cu utilizarea cookie-urilor.",
        accept: "Accept",
        decline: "Refuz",
        privacy: "Politica de confidențialitate",
      };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-foreground/80 flex-1">
          {t.message}
        </p>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDecline}
            className="flex-1 sm:flex-initial"
          >
            {t.decline}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="flex-1 sm:flex-initial"
          >
            {t.accept}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
