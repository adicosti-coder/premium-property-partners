import { WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
import { useLanguage } from "@/i18n/LanguageContext";

const OfflineIndicator = () => {
  const { isOnline } = usePWA();
  const { language } = useLanguage();

  const translations = {
    ro: {
      offline: "Esti offline",
      description: "Unele functionalitati pot fi indisponibile",
      retry: "Reincearca",
    },
    en: {
      offline: "You are offline",
      description: "Some features may be unavailable",
      retry: "Retry",
    },
  };

  const t = translations[language] || translations.ro;

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2"
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{t.offline}</p>
                <p className="text-xs opacity-80">{t.description}</p>
              </div>
            </div>
            
            <Button
              onClick={handleRetry}
              size="sm"
              variant="secondary"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t.retry}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
