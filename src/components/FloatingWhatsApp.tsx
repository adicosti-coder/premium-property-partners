import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const FloatingWhatsApp = () => {
  const { t } = useLanguage();
  
  const handleClick = () => {
    const message = encodeURIComponent(t.floatingWhatsapp.message);
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 md:bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center animate-pulse-glow"
      aria-label={t.floatingWhatsapp.ariaLabel}
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
};

export default FloatingWhatsApp;
