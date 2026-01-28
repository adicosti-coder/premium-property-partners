import { Phone, Users, Building } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";

const MobileCTABar = () => {
  const { language } = useLanguage();
  const { trackCall } = useCtaAnalytics();
  const { lightTap } = useHapticFeedback();
  
  const translations = {
    ro: { call: "Suna", guests: "OASPETI", owners: "Proprietari" },
    en: { call: "Call", guests: "GUESTS", owners: "Owners" }
  };
  
  const t = translations[language];

  const handleCall = () => {
    lightTap();
    trackCall();
    window.location.href = "tel:+40723154520";
  };

  const scrollToGuests = () => {
    lightTap();
    document.getElementById('oaspeti')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToOwners = () => {
    lightTap();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="grid grid-cols-3">
        {/* Call Button */}
        <button
          onClick={handleCall}
          className={cn(
            "flex flex-col items-center justify-center py-3 px-2 bg-primary",
            "active:scale-95 transition-all duration-150",
            "hover:bg-primary/90"
          )}
        >
          <Phone className="w-5 h-5 text-primary-foreground mb-1" />
          <span className="text-xs font-semibold text-primary-foreground">{t.call}</span>
        </button>
        
        {/* Guests Button */}
        <button
          onClick={scrollToGuests}
          className={cn(
            "flex flex-col items-center justify-center py-3 px-2 bg-blue-600",
            "active:scale-95 transition-all duration-150",
            "hover:bg-blue-700"
          )}
        >
          <Users className="w-5 h-5 text-white mb-1" />
          <span className="text-xs font-bold text-white">{t.guests}</span>
        </button>
        
        {/* Owners Button */}
        <button
          onClick={scrollToOwners}
          className={cn(
            "flex flex-col items-center justify-center py-3 px-2 bg-card border-l border-border",
            "active:scale-95 transition-all duration-150",
            "hover:bg-muted"
          )}
        >
          <Building className="w-5 h-5 text-foreground mb-1" />
          <span className="text-xs font-semibold text-foreground">{t.owners}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileCTABar;
