import { useState, useEffect } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePWA } from "@/hooks/usePWA";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

const PWAInstallPrompt = () => {
  const { language } = useLanguage();
  const { isInstallable, isInstalled, promptInstall, canPrompt } = usePWA();
  const { successFeedback } = useHapticFeedback();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const translations = {
    ro: {
      title: "Instaleaza aplicatia",
      description: "Adauga RealTrust pe ecranul principal pentru acces rapid",
      install: "Instaleaza",
      dismiss: "Mai tarziu",
      iosInstructions: "Apasa pe",
      iosThen: "apoi Adauga pe ecranul principal",
    },
    en: {
      title: "Install App",
      description: "Add RealTrust to your home screen for quick access",
      install: "Install",
      dismiss: "Later",
      iosInstructions: "Tap",
      iosThen: "then Add to Home Screen",
    },
  };

  const t = translations[language] || translations.ro;

  // Check if iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && isSafari;

  useEffect(() => {
    // Don't show if already dismissed or installed
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed || isInstalled) {
      setIsDismissed(true);
      return;
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      if ((isInstallable && canPrompt) || isIOSSafari) {
        setIsVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, canPrompt, isIOSSafari]);

  const handleInstall = async () => {
    if (canPrompt) {
      const installed = await promptInstall();
      if (installed) {
        successFeedback();
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (isDismissed || isInstalled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 relative overflow-hidden">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Smartphone className="w-7 h-7 text-primary-foreground" />
            </div>

            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-foreground mb-1">
                {t.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t.description}
              </p>

              {isIOSSafari && !canPrompt ? (
                // iOS Safari instructions
                <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  {t.iosInstructions}
                  <Share className="w-4 h-4 inline text-primary" />
                  {t.iosThen}
                </p>
              ) : (
                // Standard install button
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t.install}
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                  >
                    {t.dismiss}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
