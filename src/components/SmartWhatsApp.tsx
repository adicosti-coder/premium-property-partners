import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";

const SmartWhatsApp = () => {
  const { trackWhatsApp } = useCtaAnalytics();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isExpanded]);

  const isOfficeHours = () => {
    const bucharestNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
    const day = bucharestNow.getDay(); // 0=Sun
    const hour = bucharestNow.getHours();
    return day >= 1 && day <= 5 && hour >= 10 && hour < 18;
  };

  const openWa = (message: string) => {
    trackWhatsApp();
    window.open(
      `https://wa.me/40723154520?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setIsExpanded(false);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-6 right-4 z-40 hidden md:block transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-8 scale-75 pointer-events-none"
      )}
    >
      {/* Expanded card */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-72 bg-card border border-border rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">
              Contactați-ne pe WhatsApp
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() =>
              openWa(
                "Bună ziua, sunt interesat de administrarea apartamentului meu prin RealTrust."
              )
            }
            className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-sm text-foreground"
          >
            🏠 Vreau să îmi închiriez apartamentul
          </button>

          <button
            onClick={() =>
              openWa(
                "Bună ziua, caut o proprietate în Timișoara și aș vrea mai multe detalii."
              )
            }
            className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-sm text-foreground"
          >
            🔑 Caut o proprietate de cumpărat/închiriat
          </button>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Luni – Vineri, 10:00 – 18:00
              {!isOfficeHours() && (
                <span className="block text-xs italic mt-0.5">
                  Răspundem în câteva ore
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className={cn(
          "w-14 h-14 rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-200",
          isExpanded && "rotate-90"
        )}
        aria-label="WhatsApp"
      >
        {isExpanded ? (
          <X className="w-7 h-7" />
        ) : (
          <MessageCircle className="w-7 h-7" />
        )}
      </button>
    </div>
  );
};

export default SmartWhatsApp;
