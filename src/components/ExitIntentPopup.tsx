import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ExitIntentPopup = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const t = {
    ro: {
      title: "Stai! Nu pleca încă...",
      subtitle: "Primește 10% reducere la prima rezervare",
      description: "Lasă-ne emailul și îți trimitem codul de discount exclusiv, valabil 48 de ore.",
      placeholder: "email@exemplu.com",
      cta: "Vreau reducerea!",
      noThanks: "Nu, mulțumesc",
      successTitle: "🎉 Verifică-ți emailul!",
      successMessage: "Ți-am trimis codul de reducere. Folosește-l în următoarele 48 de ore!",
      badge: "Ofertă Exclusivă",
    },
    en: {
      title: "Wait! Don't leave yet...",
      subtitle: "Get 10% off your first booking",
      description: "Leave your email and we'll send you an exclusive discount code, valid for 48 hours.",
      placeholder: "email@example.com",
      cta: "I want the discount!",
      noThanks: "No, thanks",
      successTitle: "🎉 Check your email!",
      successMessage: "We've sent you the discount code. Use it within the next 48 hours!",
      badge: "Exclusive Offer",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse leaves from the top
    if (e.clientY <= 5 && !hasShown) {
      const dismissed = sessionStorage.getItem("exitPopupDismissed");
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
    sessionStorage.setItem("exitPopupDismissed", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(language === "ro" ? "Te rugăm să introduci un email valid" : "Please enter a valid email");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to newsletter subscribers
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email, is_active: true });

      if (error && error.code !== "23505") { // Ignore duplicate key error
        throw error;
      }

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
                    <Gift className="w-4 h-4" />
                    {text.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Gift className="w-10 h-10 text-primary-foreground" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                    {text.title}
                  </h2>
                  <p className="text-xl font-semibold text-gradient-gold mb-2">
                    {text.subtitle}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {text.description}
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
