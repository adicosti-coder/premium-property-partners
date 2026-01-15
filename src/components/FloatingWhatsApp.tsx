import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const FloatingWhatsApp = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial position
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const handleClick = () => {
    const message = encodeURIComponent(t.floatingWhatsapp.message);
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-24 md:bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center animate-pulse-glow",
        "transition-all duration-500 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-8 scale-75 pointer-events-none"
      )}
      aria-label={t.floatingWhatsapp.ariaLabel}
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
};

export default FloatingWhatsApp;
