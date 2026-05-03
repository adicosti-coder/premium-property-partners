import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Sparkles, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { getSessionStorage, setSessionStorage, isBrowser } from "@/utils/browserStorage";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const ExitIntentPopup = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Detect user type based on current page
  const isBuyerPath = ["/vanzare", "/investitii-active"].some(p => location.pathname.startsWith(p));
  const isOwnerPath = !isBuyerPath && ["/pentru-proprietari", "/investitii", "/preturi"].some(p => location.pathname.startsWith(p));

  const t = {
    ro: {
      guestTitle: "Înainte să pleci",
      guestSubtitle: "5% reducere la rezervare directă pe site",
      guestDescription: "Lasă-ne emailul și primești codul DIRECT5, valabil pentru rezervările făcute direct prin RealTrust.",
      guestBadge: "Beneficiu rezervare directă",
      ownerTitle: "Ghid pentru proprietari",
      ownerSubtitle: "Cum estimăm randamentul net de 9,4%",
      ownerDescription: "Primești pe email metodologia noastră: ipoteze de ocupare 75%, deducere 27% costuri și taxe, plus exemple reale din portofoliu.",
      ownerBadge: "Ghid proprietari 2026",
      buyerTitle: "Catalog de investiții",
      buyerSubtitle: "Apartamente analizate pentru regim hotelier",
      buyerDescription: "Primești catalogul cu proprietăți disponibile, randamentul net estimat și ipotezele folosite — fără presiune comercială.",
      buyerBadge: "Catalog investiții",
      placeholder: "email@exemplu.com",
      cta: isBuyerPath ? "Trimite-mi catalogul" : isOwnerPath ? "Trimite-mi ghidul" : "Trimite-mi codul",
      noThanks: "Nu acum, mulțumesc",
      successTitle: "Verifică-ți emailul",
      successMessage: isBuyerPath
        ? "Ți-am trimis catalogul de investiții. Ar trebui să ajungă în câteva minute."
        : isOwnerPath
        ? "Ți-am trimis ghidul. Ar trebui să ajungă în câteva minute."
        : "Ți-am trimis codul DIRECT5. Îl poți folosi la rezervările făcute direct pe site.",
      invalidEmail: "Te rugăm să introduci un email valid.",
      errorMessage: "Ceva nu a funcționat. Te rugăm să încerci din nou.",
    },
    en: {
      guestTitle: "Before you go",
      guestSubtitle: "5% off when you book directly on our site",
      guestDescription: "Leave your email and we'll send you the DIRECT5 code, valid for bookings made directly through RealTrust.",
      guestBadge: "Direct booking benefit",
      ownerTitle: "Owners' guide",
      ownerSubtitle: "How we estimate the 9.4% net yield",
      ownerDescription: "We'll email you our methodology: 75% occupancy assumption, 27% costs and taxes deduction, plus real examples from our portfolio.",
      ownerBadge: "Owners guide 2026",
      buyerTitle: "Investment catalog",
      buyerSubtitle: "Apartments analysed for short-term rental",
      buyerDescription: "Get the catalog with available properties, estimated net yield and the assumptions used — no sales pressure.",
      buyerBadge: "Investment catalog",
      placeholder: "email@example.com",
      cta: isBuyerPath ? "Send me the catalog" : isOwnerPath ? "Send me the guide" : "Send me the code",
      noThanks: "Not now, thanks",
      successTitle: "Please check your email",
      successMessage: isBuyerPath
        ? "We've sent you the investment catalog. It should arrive within a few minutes."
        : isOwnerPath
        ? "We've sent you the guide. It should arrive within a few minutes."
        : "We've sent you the DIRECT5 code. You can use it on bookings made directly through our site.",
      invalidEmail: "Please enter a valid email address.",
      errorMessage: "Something went wrong. Please try again.",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;
  const title = isBuyerPath ? text.buyerTitle : isOwnerPath ? text.ownerTitle : text.guestTitle;
  const subtitle = isBuyerPath ? text.buyerSubtitle : isOwnerPath ? text.ownerSubtitle : text.guestSubtitle;
  const description = isBuyerPath ? text.buyerDescription : isOwnerPath ? text.ownerDescription : text.guestDescription;
  const badge = isBuyerPath ? text.buyerBadge : isOwnerPath ? text.ownerBadge : text.guestBadge;

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (!isBrowser()) return;
    if (e.clientY <= 5 && !hasShown) {
      const dismissed = getSessionStorage("exitPopupDismissed");
      if (!dismissed) {
        setIsVisible(true);
        setHasShown(true);
      }
    }
  }, [hasShown]);

  // Listen for FAB menu trigger instead of auto exit-intent
  useEffect(() => {
    const handleOpen = () => {
      const dismissed = getSessionStorage("exitPopupDismissed");
      if (!dismissed && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
      }
    };
    window.addEventListener('open-exit-intent', handleOpen);
    return () => window.removeEventListener('open-exit-intent', handleOpen);
  }, [hasShown]);

  const handleClose = () => {
    setIsVisible(false);
    setSessionStorage("exitPopupDismissed", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(text.invalidEmail);
      return;
    }

    setIsSubmitting(true);

    try {
      const userType = isBuyerPath ? "buyer" : isOwnerPath ? "owner" : "guest";
      const { error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: { email, source: "exit_intent_popup", language, user_type: userType },
      });
      if (error) throw error;

      toast.success(text.successTitle, {
        description: text.successMessage,
      });

      if (isBuyerPath) {
        window.open(`/catalog-investitii?email=${encodeURIComponent(email)}&token=invest2026`, "_blank", "noopener,noreferrer");
      }
      
      setEmail("");
      handleClose();
    } catch (error) {
      console.error("Error submitting exit popup:", error);
      toast.error(text.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/20 to-transparent" />
              
              {/* Sparkles decoration */}
              <Sparkles className="absolute top-4 right-12 w-5 h-5 text-primary/40 animate-pulse" />
              <Sparkles className="absolute top-8 left-8 w-4 h-4 text-primary/30 animate-pulse" style={{ animationDelay: "0.5s" }} />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="relative p-8 pt-12">
                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                    {isBuyerPath ? <BookOpen className="w-4 h-4" /> : isOwnerPath ? <TrendingUp className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    {badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                    {isBuyerPath 
                      ? <BookOpen className="w-10 h-10 text-primary-foreground" />
                      : isOwnerPath 
                      ? <TrendingUp className="w-10 h-10 text-primary-foreground" />
                      : <Gift className="w-10 h-10 text-primary-foreground" />
                    }
                  </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                    {title}
                  </h2>
                  <p className="text-xl font-semibold text-primary mb-2">
                    {subtitle}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {description}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={text.placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-center text-lg"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="submit"
                    variant="premium"
                    size="xl"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                     {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        {text.cta}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {text.noThanks}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;