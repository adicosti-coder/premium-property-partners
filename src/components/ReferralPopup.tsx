import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { getSessionStorage, setSessionStorage, isBrowser } from "@/utils/browserStorage";

const ReferralPopup = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  const t = {
    ro: {
      wow: "WOW!",
      title: "Recomanzi și câștigi:",
      highlight: "Cazare Gratis sau Comision!",
      description:
        "Recomandă-ne la un prieten cu apartament pentru a-i administra și lui apartamentul și poți câștiga 1 noapte de cazare gratis la unul dintre apartamentele noastre sau un Comision!",
      cta: "Află cum funcționează",
      noThanks: "Nu acum",
      badge: "Nou",
    },
    en: {
      wow: "WOW!",
      title: "Refer & Earn:",
      highlight: "Free Stay or Commission!",
      description:
        "Refer a friend with an apartment for us to manage and you can win 1 free night at one of our apartments or a Commission!",
      cta: "Learn how it works",
      noThanks: "Not now",
      badge: "New",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    if (!isBrowser()) return;
    const dismissed = getSessionStorage("referralPopupDismissed");
    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setSessionStorage("referralPopupDismissed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md mx-4"
          >
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              {/* Gradient background matching the screenshot style */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500" />

              {/* Sparkles decoration */}
              <Sparkles className="absolute top-4 right-12 w-6 h-6 text-white/30 animate-pulse" />
              <Sparkles className="absolute bottom-8 left-6 w-4 h-4 text-white/20 animate-pulse" style={{ animationDelay: "0.5s" }} />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>

              <div className="relative p-8 pt-10 text-white">
                {/* Badge */}
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4">
                  {text.badge}
                </span>

                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Gift className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold leading-tight">{text.wow}</p>
                    <p className="text-xl font-bold leading-tight">{text.title}</p>
                    <p className="text-xl font-bold text-yellow-200 leading-tight">
                      {text.highlight}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-white/85 text-sm leading-relaxed mb-6">
                  {text.description}
                </p>

                {/* CTA */}
                <Button
                  asChild
                  className="w-full bg-white text-orange-600 hover:bg-white/90 font-bold h-12 text-base gap-2"
                  onClick={handleClose}
                >
                  <Link to="/recomanda-proprietar">
                    {text.cta}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full text-sm text-white/60 hover:text-white transition-colors py-3 mt-1"
                >
                  {text.noThanks}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReferralPopup;
