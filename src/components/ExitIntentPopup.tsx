import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";
import { getSessionStorage, setSessionStorage, isBrowser } from "@/utils/browserStorage";
import { useLocation } from "react-router-dom";

const ExitIntentPopup = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Detect if user is on owner/investment pages
  const isOwnerPath = ["/pentru-proprietari", "/investitii", "/preturi"].some(p => location.pathname.startsWith(p));

  // Fetch Turnstile site key on mount
  useEffect(() => {
    supabase.functions.invoke("get-turnstile-site-key").then(({ data }) => {
      if (data?.siteKey) setTurnstileSiteKey(data.siteKey);
    });
  }, []);

  const t = {
    ro: {
      // Guest variant
      guestTitle: "Stai! Nu pleca încă...",
      guestSubtitle: "Primește 10% reducere la prima rezervare",
      guestDescription: "Lasă-ne emailul și îți trimitem codul de discount exclusiv, valabil 48 de ore.",
      guestBadge: "Ofertă Exclusivă",
      // Owner variant
      ownerTitle: "Ghid Gratuit pentru Proprietari",
      ownerSubtitle: "ROI 9.4% — Cum îți maximizezi venitul?",
      ownerDescription: "Primești analiza completă de piață + strategii dovedite pentru apartamentul tău din Timișoara.",
      ownerBadge: "Ghid Proprietari 2026",
      // Common
      placeholder: "email@exemplu.com",
      cta: isOwnerPath ? "Vreau Ghidul Gratuit!" : "Vreau reducerea!",
      noThanks: "Nu, mulțumesc",
      successTitle: "🎉 Verifică-ți emailul!",
      successMessage: isOwnerPath
        ? "Ți-am trimis ghidul gratuit. Îl găsești în inbox în câteva minute!"
        : "Ți-am trimis codul de reducere. Folosește-l în următoarele 48 de ore!",
    },
    en: {
      guestTitle: "Wait! Don't leave yet...",
      guestSubtitle: "Get 10% off your first booking",
      guestDescription: "Leave your email and we'll send you an exclusive discount code, valid for 48 hours.",
      guestBadge: "Exclusive Offer",
      ownerTitle: "Free Guide for Property Owners",
      ownerSubtitle: "9.4% ROI — How to maximize your income?",
      ownerDescription: "Get the complete market analysis + proven strategies for your Timișoara apartment.",
      ownerBadge: "Owners Guide 2026",
      placeholder: "email@example.com",
      cta: isOwnerPath ? "I want the Free Guide!" : "I want the discount!",
      noThanks: "No, thanks",
      successTitle: "🎉 Check your email!",
      successMessage: isOwnerPath
        ? "We've sent you the free guide. You'll find it in your inbox in a few minutes!"
        : "We've sent you the discount code. Use it within the next 48 hours!",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;
  const title = isOwnerPath ? text.ownerTitle : text.guestTitle;
  const subtitle = isOwnerPath ? text.ownerSubtitle : text.guestSubtitle;
  const description = isOwnerPath ? text.ownerDescription : text.guestDescription;
  const badge = isOwnerPath ? text.ownerBadge : text.guestBadge;

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (!isBrowser()) return;

    // Only trigger when mouse leaves from the top
    if (e.clientY <= 5 && !hasShown) {
      const dismissed = getSessionStorage("exitPopupDismissed");
      if (!dismissed) {
        setIsVisible(true);
        setHasShown(true);
      }
    }
  }, [hasShown]);

  useEffect(() => {
    // Add delay before enabling exit intent (don't show immediately)
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  const handleClose = () => {
    setIsVisible(false);
    setSessionStorage("exitPopupDismissed", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(language === "ro" ? "Te rugăm să introduci un email valid" : "Please enter a valid email");
      return;
    }

    // Check if Turnstile verification is complete
    if (turnstileToken && turnstileSiteKey) {
      setIsSubmitting(true);
      await submitExitIntent(turnstileToken);
    } else {
      toast.error(language === "ro" ? "Te rugăm să aștepți verificarea de securitate" : "Please wait for security verification");
    }
  };

  const submitExitIntent = async (captchaToken: string | null) => {
    setIsSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "subscribe-newsletter",
        { body: { email, captchaToken, captchaType: "turnstile", formType: "newsletter_exit_popup" } }
      );

      if (fnError) throw fnError;

      // Send discount email via edge function
      await supabase.functions.invoke("send-exit-discount", {
        body: { email, language },
      });

      toast.success(text.successTitle, {
        description: text.successMessage,
      });
      
      handleClose();
    } catch (error) {
      console.error("Error submitting exit popup:", error);
      toast.error(language === "ro" ? "A apărut o eroare. Încearcă din nou." : "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setTurnstileToken(null);
    }
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
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
                    {isOwnerPath ? <TrendingUp className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    {badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                    {isOwnerPath 
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
                  {turnstileSiteKey && (
                    <div className="flex justify-center">
                      <Turnstile
                        siteKey={turnstileSiteKey}
                        onSuccess={handleTurnstileSuccess}
                        onError={() => {
                          setIsSubmitting(false);
                          toast.error(language === "ro" ? "Eroare verificare" : "Verification error");
                        }}
                        options={{ theme: "auto", size: "invisible" }}
                      />
                    </div>
                  )}
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
