import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, CheckCircle, Sparkles } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";

const emailSchema = z.string().trim().email().max(255);

const BlogNewsletterCTA = () => {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Turnstile site key on mount
  useEffect(() => {
    supabase.functions.invoke("get-turnstile-site-key").then(({ data }) => {
      if (data?.siteKey) setTurnstileSiteKey(data.siteKey);
    });
  }, []);

  const translations = {
    ro: {
      title: "Îți place ce citești?",
      subtitle: "Abonează-te la newsletter pentru articole exclusive despre administrarea proprietăților și tendințe în real estate.",
      placeholder: "Adresa ta de email",
      subscribe: "Abonează-te",
      subscribing: "Se procesează...",
      success: "Te-ai abonat cu succes!",
      successMessage: "Vei primi cele mai noi articole direct în inbox.",
      alreadySubscribed: "Ești deja abonat la newsletter!",
      invalidEmail: "Te rugăm să introduci o adresă de email validă.",
      error: "A apărut o eroare. Încearcă din nou.",
    },
    en: {
      title: "Enjoying this article?",
      subtitle: "Subscribe to our newsletter for exclusive insights on property management and real estate trends.",
      placeholder: "Your email address",
      subscribe: "Subscribe",
      subscribing: "Processing...",
      success: "Successfully subscribed!",
      successMessage: "You'll receive our latest articles directly in your inbox.",
      alreadySubscribed: "You're already subscribed to our newsletter!",
      invalidEmail: "Please enter a valid email address.",
      error: "An error occurred. Please try again.",
    },
  };

  const t = translations[language] || translations.ro;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(t.invalidEmail);
      return;
    }

    // Check if Turnstile verification is complete
    if (turnstileToken && turnstileSiteKey) {
      setIsLoading(true);
      await submitNewsletter(result.data, turnstileToken);
    } else {
      toast.error(language === "ro" ? "Te rugăm să aștepți verificarea de securitate" : "Please wait for security verification");
    }
  };

  const submitNewsletter = async (validatedEmail: string, captchaToken: string | null) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "subscribe-newsletter",
        { body: { email: validatedEmail, captchaToken, captchaType: "turnstile", formType: "newsletter_blog" } }
      );

      if (fnError) throw fnError;

      if (data?.duplicate) {
        toast.info(t.alreadySubscribed);
      } else {
        setIsSubscribed(true);
        toast.success(t.success);
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error(t.error);
    } finally {
      setIsLoading(false);
      setTurnstileToken(null);
    }
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  return (
    <div ref={containerRef} className="mt-12 mb-8">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8"
          >
            {/* Decorative elements - offset to prevent overflow */}
            <div className="absolute top-0 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              {isSubscribed ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t.success}
                  </h3>
                  <p className="text-muted-foreground">
                    {t.successMessage}
                  </p>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary uppercase tracking-wider">
                      Newsletter
                    </span>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {t.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-6 max-w-lg">
                    {t.subtitle}
                  </p>
                  
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder={t.placeholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary"
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 px-6 font-semibold"
                    >
                      {isLoading ? t.subscribing : t.subscribe}
                    </Button>
                    {turnstileSiteKey && (
                      <div className="flex justify-center mt-2">
                        <Turnstile
                          siteKey={turnstileSiteKey}
                          onSuccess={handleTurnstileSuccess}
                          onError={() => {
                            setIsLoading(false);
                            toast.error(language === "ro" ? "Eroare verificare" : "Verification error");
                          }}
                          options={{ theme: "auto", size: "invisible" }}
                        />
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlogNewsletterCTA;
