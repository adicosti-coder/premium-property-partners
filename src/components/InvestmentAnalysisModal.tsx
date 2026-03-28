import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { Turnstile } from "@marsidev/react-turnstile";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Send } from "lucide-react";

interface InvestmentAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
}

const TURNSTILE_SITE_KEY = "0x4AAAAAACVr6kBkA3M3K723";
const WEBHOOK_URL = "https://hook.eu1.make.com/swcd8yafsc17xlrys9w2ivlfnhukay4p";

const InvestmentAnalysisModal = ({ open, onOpenChange, propertyId, propertyName }: InvestmentAnalysisModalProps) => {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const turnstileRef = useRef<any>(null);

  const t = {
    ro: {
      title: "Solicită Analiză ROI",
      description: `Primești analiza detaliată pentru ${propertyName} direct pe email.`,
      name: "Nume complet",
      email: "Adresa de email",
      submit: "Trimite Solicitarea",
      submitting: "Se trimite...",
      success: "Analiza ROI și mesajul audio personalizat sunt în drum spre email-ul tău!",
      errorName: "Introduceți numele",
      errorEmail: "Introduceți un email valid",
      errorTurnstile: "Vă rugăm completați verificarea de securitate",
      errorGeneric: "A apărut o eroare. Vă rugăm încercați din nou.",
    },
    en: {
      title: "Request ROI Analysis",
      description: `Get the detailed analysis for ${propertyName} directly to your email.`,
      name: "Full name",
      email: "Email address",
      submit: "Send Request",
      submitting: "Sending...",
      success: "The ROI analysis and personalized audio message are on their way to your email!",
      errorName: "Please enter your name",
      errorEmail: "Please enter a valid email",
      errorTurnstile: "Please complete the security verification",
      errorGeneric: "An error occurred. Please try again.",
    },
  };
  const txt = t[language as keyof typeof t] || t.ro;

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast({ title: txt.errorName, variant: "destructive" });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: txt.errorEmail, variant: "destructive" });
      return;
    }
    if (!turnstileToken) {
      toast({ title: txt.errorTurnstile, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nume: name.trim(),
          property_id: propertyId,
          "cf-turnstile-response": turnstileToken,
          sursa: "Pagina Investitii RealTrust",
        }),
      });

      if (!res.ok) throw new Error("Webhook error");

      setIsSuccess(true);
      toast({ title: txt.success });
    } catch {
      toast({ title: txt.errorGeneric, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, turnstileToken, propertyId, txt]);

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setEmail("");
      setTurnstileToken(null);
      setIsSuccess(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-amber-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-amber-400">{txt.title}</DialogTitle>
          <DialogDescription className="text-slate-400">{txt.description}</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-center text-slate-300 text-sm max-w-xs">{txt.success}</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="analysis-name" className="text-slate-300 text-sm">{txt.name}</Label>
              <Input
                id="analysis-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                placeholder="Ion Popescu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analysis-email" className="text-slate-300 text-sm">{txt.email}</Label>
              <Input
                id="analysis-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                placeholder="email@exemplu.com"
              />
            </div>

            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: "dark", size: "normal" }}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !turnstileToken}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {txt.submitting}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {txt.submit}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentAnalysisModal;
