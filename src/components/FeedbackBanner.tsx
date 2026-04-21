import { useState, useEffect } from "react";
import { X, MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { withProvenientaTracking } from "@/lib/investmentReferralTracking";

const DISMISSED_KEY = "feedback_banner_dismissed";

const FeedbackBanner = () => {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const t = {
    ro: {
      text: "Ajută-ne să îmbunătățim experiența ta pe RealTrust.",
      cta: "Trimite Feedback",
      placeholder: "Ce ți-ar plăcea să fie mai bine?",
      send: "Trimite",
      thanks: "Mulțumim pentru feedback!",
    },
    en: {
      text: "Help us improve your RealTrust experience.",
      cta: "Give Feedback",
      placeholder: "What could we do better?",
      send: "Send",
      thanks: "Thank you for your feedback!",
    },
  };

  const txt = t[language as keyof typeof t] || t.ro;

  const handleSend = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await supabase.from("leads").insert({
        name: "Feedback Banner",
        whatsapp_number: "-",
        property_type: "feedback",
        property_area: 0,
        message: feedback.trim(),
        source: "feedback_banner",
        simulation_data: withProvenientaTracking(null),
      });
      toast({ title: txt.thanks });
      setFeedback("");
      dismiss();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50",
        "animate-in slide-in-from-bottom-4 fade-in duration-500"
      )}
    >
      <div className="relative rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
        {/* Accent top line */}
        <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="p-5">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!open ? (
            <div className="flex items-center gap-3 pr-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquarePlus className="w-4.5 h-4.5 text-primary" />
              </div>
              <p className="text-sm text-foreground/80 leading-snug flex-1">
                {txt.text}
              </p>
              <Button
                size="sm"
                variant="premium"
                className="shrink-0 text-xs px-4"
                onClick={() => setOpen(true)}
              >
                {txt.cta}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pr-6">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{txt.cta}</span>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={txt.placeholder}
                rows={3}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                autoFocus
              />
              <Button
                size="sm"
                variant="premium"
                className="w-full gap-2"
                onClick={handleSend}
                disabled={!feedback.trim() || sending}
              >
                <Send className="w-3.5 h-3.5" />
                {txt.send}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackBanner;
