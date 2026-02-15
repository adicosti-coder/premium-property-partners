import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const FloatingReferralButton = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const t = {
    ro: {
      title: "Weekend Gratuit!",
      subtitle: "Cazare Gratis sau Comision!",
      cta: "Află cum",
    },
    en: {
      title: "Free Weekend!",
      subtitle: "Free Stay or Commission!",
      cta: "Learn how",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-expand after 3 seconds if visible
  useEffect(() => {
    if (isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed]);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-[264px] right-4 z-40 hidden md:block"
        >
          <div className="relative">
            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>

            <Link to="/recomanda-proprietar">
              <motion.div
                layout
                className={cn(
                  "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden",
                  isExpanded ? "rounded-2xl" : "rounded-full"
                )}
                onMouseEnter={() => setIsExpanded(true)}
              >
                <AnimatePresence mode="wait">
                  {isExpanded ? (
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, width: 56 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 56 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 flex items-center gap-3 min-w-[240px]"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm whitespace-nowrap">{text.title}</p>
                        <p className="text-xs text-white/80 whitespace-nowrap">{text.subtitle}</p>
                      </div>
                      <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">
                        {text.cta} →
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-14 h-14 flex items-center justify-center"
                    >
                      <Gift className="w-6 h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>

            {/* Pulsing ring animation when collapsed */}
            {!isExpanded && (
              <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping pointer-events-none" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingReferralButton;
