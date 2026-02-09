import { Phone, Users, Building, MessageCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";

const MobileCTABar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackCall, trackWhatsApp } = useCtaAnalytics();
  const { lightTap } = useHapticFeedback();
  
  
  const translations = {
    ro: { call: "Sună", whatsapp: "WhatsApp", guests: "OASPEȚI", owners: "Proprietari" },
    en: { call: "Call", whatsapp: "WhatsApp", guests: "GUESTS", owners: "Owners" }
  };
  
  const t = translations[language as keyof typeof translations] || translations.ro;

  const handleCall = () => {
    lightTap();
    trackCall();
    window.location.href = "tel:+40723154520";
  };

  const handleWhatsApp = () => {
    lightTap();
    trackWhatsApp();
    const message = encodeURIComponent(language === 'ro' 
      ? "Bună! Sunt interesat de serviciile RealTrust." 
      : "Hello! I'm interested in RealTrust services.");
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  const scrollToGuests = () => {
    lightTap();
    if (location.pathname === '/') {
      const section = document.getElementById('oaspeti');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate('/pentru-oaspeti');
  };

  const scrollToOwners = () => {
    lightTap();
    if (location.pathname === '/') {
      const section = document.getElementById('contact');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate('/pentru-proprietari');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="grid grid-cols-4">
        {/* Call Button */}
        <button
          onClick={handleCall}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-1 bg-primary",
            "active:scale-95 transition-all duration-150",
            "hover:bg-primary/90"
          )}
        >
          <Phone className="w-4 h-4 text-primary-foreground mb-0.5" />
          <span className="text-[10px] font-semibold text-primary-foreground">{t.call}</span>
        </button>
        
        {/* WhatsApp Button - Key conversion CTA */}
        <button
          onClick={handleWhatsApp}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-1 bg-[#25D366]",
            "active:scale-95 transition-all duration-150",
            "hover:bg-[#20BD5A]"
          )}
        >
          <MessageCircle className="w-4 h-4 text-white mb-0.5" />
          <span className="text-[10px] font-bold text-white">{t.whatsapp}</span>
        </button>
        
        {/* Guests Button */}
        <button
          onClick={scrollToGuests}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-1 bg-accent",
            "active:scale-95 transition-all duration-150",
            "hover:bg-accent/80 border-l border-border"
          )}
        >
          <Users className="w-4 h-4 text-accent-foreground mb-0.5" />
          <span className="text-[10px] font-bold text-accent-foreground">{t.guests}</span>
        </button>
        
        {/* Owners Button */}
        <button
          onClick={scrollToOwners}
          className={cn(
            "flex flex-col items-center justify-center py-2.5 px-1 bg-card border-l border-border",
            "active:scale-95 transition-all duration-150",
            "hover:bg-muted"
          )}
        >
          <Building className="w-4 h-4 text-foreground mb-0.5" />
          <span className="text-[10px] font-semibold text-foreground">{t.owners}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileCTABar;
