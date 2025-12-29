import { Phone, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";

const MobileCTABar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const translations = {
    ro: { call: "Sună", guests: "OASPEȚI", owners: "Proprietari" },
    en: { call: "Call", guests: "GUESTS", owners: "Owners" }
  };
  
  const t = translations[language];

  const handleCall = () => {
    window.location.href = "tel:+40723154520";
  };

  const scrollToGuests = () => {
    document.getElementById('oaspeti')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToOwners = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border animate-slide-up">
      <div className="grid grid-cols-3">
        {/* Call Button */}
        <button
          onClick={handleCall}
          className="flex flex-col items-center justify-center py-3 px-2 bg-primary hover:bg-primary/90 transition-colors"
        >
          <Phone className="w-5 h-5 text-primary-foreground mb-1" />
          <span className="text-xs font-semibold text-primary-foreground">{t.call}</span>
        </button>
        
        {/* Guests Button */}
        <button
          onClick={scrollToGuests}
          className="flex flex-col items-center justify-center py-3 px-2 bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Users className="w-5 h-5 text-white mb-1" />
          <span className="text-xs font-bold text-white">{t.guests}</span>
        </button>
        
        {/* Owners Button */}
        <button
          onClick={scrollToOwners}
          className="flex flex-col items-center justify-center py-3 px-2 bg-card hover:bg-muted transition-colors border-l border-border"
        >
          <Building className="w-5 h-5 text-foreground mb-1" />
          <span className="text-xs font-semibold text-foreground">{t.owners}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileCTABar;
