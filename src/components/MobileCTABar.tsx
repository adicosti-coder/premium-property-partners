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
    ro: { call: "Sună", whatsapp: "WhatsApp", guests: "Rezervă Cazare", owners: "Câștigă" },
    en: { call: "Call", whatsapp: "WhatsApp", guests: "Book Stay", owners: "Earn" }
  };
  
  const t = translations[language as keyof typeof translations] || translations.ro;

  const fireContactClick = (method: string) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "contact_click", { method, page_path: window.location.pathname });
    }
  };

  const handleCall = () => {
    lightTap();
    trackCall();
    fireContactClick("phone");
    window.location.href = "tel:+40723154520";
  };

  const handleWhatsApp = () => {
    lightTap();
    trackWhatsApp();
    fireContactClick("whatsapp");
    const message = encodeURIComponent(language === 'ro' 
      ? "Bună! Sunt interesat de serviciile RealTrust." 
      : "Hello! I'm interested in RealTrust services.");
    window.open(`https://wa.me/40723154520?text=${message}`, '_blank', 'noopener,noreferrer');
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
          aria-label={language === 'ro' ? 'Sună la RealTrust' : 'Call RealTrust'}
          className={cn(
            "flex flex-col items-center justify-center min-h-[48px] py-3 px-1 bg-card border-r border-border",
            "active:scale-95 transition-all duration-150",
            "hover:bg-muted"
          )}
        >
          <Phone className="w-5 h-5 text-foreground mb-0.5" />
          <span className="text-[10px] font-semibold text-foreground">{t.call}</span>
        </button>
        
        {/* WhatsApp Button - Key conversion CTA */}
        <button
          onClick={handleWhatsApp}
          aria-label={language === 'ro' ? 'Contactează pe WhatsApp' : 'Contact on WhatsApp'}
          className={cn(
            "flex flex-col items-center justify-center min-h-[48px] py-3 px-1 bg-whatsapp",
            "active:scale-95 transition-all duration-150",
            "hover:bg-whatsapp-hover"
          )}
        >
          <MessageCircle className="w-5 h-5 text-white mb-0.5" />
          <span className="text-[10px] font-bold text-white">{t.whatsapp}</span>
        </button>
        
        {/* Guests Button */}
        <button
          onClick={scrollToGuests}
          aria-label={language === 'ro' ? 'Rezervă cazare în regim hotelier' : 'Book hotel accommodation'}
          className={cn(
            "flex flex-col items-center justify-center min-h-[48px] py-3 px-1 bg-booking-blue",
            "active:scale-95 transition-all duration-150",
            "hover:bg-booking-blue-hover border-l border-border"
          )}
        >
          <Users className="w-5 h-5 text-white mb-0.5" />
          <span className="text-[10px] font-bold text-white">{t.guests}</span>
        </button>
        
        {/* Owners Button */}
        <button
          onClick={scrollToOwners}
          aria-label={language === 'ro' ? 'Câștigă din proprietatea ta' : 'Earn from your property'}
          className={cn(
            "flex flex-col items-center justify-center min-h-[48px] py-3 px-1 bg-primary",
            "active:scale-95 transition-all duration-150",
            "hover:bg-primary/90 border-l border-border"
          )}
        >
          <Building className="w-5 h-5 text-primary-foreground mb-0.5" />
          <span className="text-[10px] font-semibold text-primary-foreground">{t.owners}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileCTABar;
