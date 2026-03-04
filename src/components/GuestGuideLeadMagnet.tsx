import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, X, Mail, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { getSessionStorage, setSessionStorage, isBrowser } from "@/utils/browserStorage";

const emailSchema = z.string().trim().email().max(255);

const GUIDE_SLUG = "ghid-turistic-timisoara-atractii-activitati";

const GuestGuideLeadMagnet = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [alreadyAccessed, setAlreadyAccessed] = useState(false);

  const t = {
    ro: {
      floatingLabel: "Ghid Turistic Gratuit",
      modalTitle: "Ghid Turistic Timișoara",
      modalSubtitle: "Descoperă cele mai bune atracții, restaurante și activități din Timișoara — ghid complet gratuit!",
      emailPlaceholder: "Adresa ta de email",
      cta: "Primește Ghidul Gratuit",
      loading: "Se procesează...",
      successTitle: "Ghidul este al tău! 🎉",
      successMessage: "Vei primi și un link pe email. Te redirecționăm către ghid...",
      alreadySubscribed: "Ești deja abonat! Te redirecționăm...",
      invalidEmail: "Introdu o adresă de email validă.",
      error: "A apărut o eroare. Încearcă din nou.",
      securityWait: "Te rugăm să aștepți verificarea de securitate.",
      badge: "Gratuit",
      highlights: ["50+ atracții", "Restaurante top", "Activități unice"],
    },
    en: {
      floatingLabel: "Free Tourist Guide",
      modalTitle: "Timișoara Tourist Guide",
      modalSubtitle: "Discover the best attractions, restaurants and activities in Timișoara — complete free guide!",
      emailPlaceholder: "Your email address",
      cta: "Get Free Guide",
      loading: "Processing...",
      successTitle: "The guide is yours! 🎉",
      successMessage: "You'll also receive a link via email. Redirecting to the guide...",
      alreadySubscribed: "Already subscribed! Redirecting...",
      invalidEmail: "Please enter a valid email address.",
      error: "An error occurred. Please try again.",
      securityWait: "Please wait for security verification.",
      badge: "Free",
      highlights: ["50+ attractions", "Top restaurants", "Unique activities"],
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    if (isBrowser() && getSessionStorage("guestGuideAccessed")) {
      setAlreadyAccessed(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    supabase.functions.invoke("get-turnstile-site-key").then(({ data }) => {
      if (data?.siteKey) setTurnstileSiteKey(data.siteKey);
    });
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(text.invalidEmail);
      return;
    }
    if (turnstileSiteKey && !turnstileToken) {
      toast.error(text.securityWait);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: {
          email: result.data,
          captchaToken: turnstileToken,
          captchaType: "turnstile",
          formType: "guest_guide_lead_magnet",
        },
      });
      if (error) throw error;

      if (data?.duplicate) {
        toast.info(text.alreadySubscribed);
      } else {
        toast.success(text.successTitle);
      }

      // Send guide email (fire-and-forget)
      supabase.functions.invoke("send-guest-guide-email", {
        body: { email: result.data, language },
      }).catch((emailErr) => console.error("Guide email error:", emailErr));

      setIsSuccess(true);
      setSessionStorage("guestGuideAccessed", "true");

      // Redirect after short delay
      setTimeout(() => {
        window.open(`/blog/${GUIDE_SLUG}`, "_blank");
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Guide lead magnet error:", err);
      toast.error(text.error);
    } finally {
      setIsLoading(false);
      setTurnstileToken(null);
    }
  };

  if (alreadyAccessed) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
            aria-label={text.floatingLabel}
          >
            <Map className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">{text.floatingLabel}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase bg-white/20 rounded-full">
              {text.badge}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" />
                <Sparkles className="absolute top-4 right-12 w-6 h-6 text-white/30 animate-pulse" />
                <Sparkles className="absolute bottom-8 left-6 w-4 h-4 text-white/20 animate-pulse" style={{ animationDelay: "0.5s" }} />

                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>

                <div className="relative p-8 pt-10 text-white">
                  <AnimatePresence mode="wait">
                    {isSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-4"
                      >
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-white" />
                        <h3 className="text-2xl font-bold mb-2">{text.successTitle}</h3>
                        <p className="text-white/80">{text.successMessage}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="form" exit={{ opacity: 0 }}>
                        {/* Badge */}
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-4">
                          {text.badge}
                        </span>

                        {/* Icon + Title */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Map className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-2xl font-extrabold leading-tight">{text.modalTitle}</p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-white/85 text-sm leading-relaxed mb-4">
                          {text.modalSubtitle}
                        </p>

                        {/* Highlights */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {text.highlights.map((h, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              {h}
                            </span>
                          ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-800/50" />
                            <Input
                              type="email"
                              placeholder={text.emailPlaceholder}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10 h-12 bg-white text-foreground border-0 placeholder:text-muted-foreground"
                              disabled={isLoading}
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-white text-emerald-700 hover:bg-white/90 font-bold text-base gap-2"
                          >
                            {isLoading ? text.loading : text.cta}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                          </Button>
                          {turnstileSiteKey && (
                            <div className="flex justify-center">
                              <Turnstile
                                siteKey={turnstileSiteKey}
                                onSuccess={(token) => setTurnstileToken(token)}
                                onError={() => toast.error(language === "ro" ? "Eroare verificare" : "Verification error")}
                                options={{ theme: "auto", size: "invisible" }}
                              />
                            </div>
                          )}
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GuestGuideLeadMagnet;
