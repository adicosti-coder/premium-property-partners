import { useState, useEffect } from "react";
import { Phone, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StickyPropertyCTAProps {
  propertyName: string;
  price: number;
  onBookClick: () => void;
}

const StickyPropertyCTA = ({ propertyName, price, onBookClick }: StickyPropertyCTAProps) => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const t = {
    ro: {
      from: "de la",
      night: "noapte",
      book: "Rezervă Acum",
      call: "Sună",
      whatsapp: "WhatsApp",
    },
    en: {
      from: "from",
      night: "night",
      book: "Book Now",
      call: "Call",
      whatsapp: "WhatsApp",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero/gallery (approx 600px)
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCall = () => {
    window.location.href = "tel:+40723154520";
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      language === "ro"
        ? `Bună! Sunt interesat de proprietatea "${propertyName}". Aș dori mai multe detalii.`
        : `Hello! I'm interested in the property "${propertyName}". I'd like more details.`
    );
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl",
            isMobile ? "bottom-0 left-0 right-0" : "bottom-6 left-1/2 -translate-x-1/2 rounded-2xl border max-w-2xl w-full mx-6"
          )}
        >
          <div className={cn(
            "flex items-center justify-between gap-4",
            isMobile ? "p-3" : "p-4"
          )}>
            {/* Price info */}
            <div className="flex-shrink-0">
              <p className="text-xs text-muted-foreground">{text.from}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-bold text-primary">{price}€</span>
                <span className="text-sm text-muted-foreground">/{text.night}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Call button - always visible */}
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={handleCall}
                className="gap-1.5"
              >
                <Phone className="w-4 h-4" />
                {!isMobile && text.call}
              </Button>

              {/* WhatsApp - desktop only */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleWhatsApp}
                  className="gap-1.5 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10"
                >
                  <MessageCircle className="w-4 h-4" />
                  {text.whatsapp}
                </Button>
              )}

              {/* Book button - primary CTA */}
              <Button
                variant="premium"
                size={isMobile ? "sm" : "lg"}
                onClick={onBookClick}
                className="gap-1.5 shadow-lg"
              >
                <Calendar className="w-4 h-4" />
                {text.book}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyPropertyCTA;
