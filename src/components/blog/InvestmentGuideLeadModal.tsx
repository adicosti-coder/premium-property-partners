import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Download, FileDown, TrendingUp } from "lucide-react";

const TRACKING_TAG = "articol_investitii_2026";
const STORAGE_KEY = "investment_guide_modal_seen_v1";
const DELAY_MS = 30_000;

const schema = z.object({
  name: z.string().trim().min(2, "Nume minim 2 caractere").max(80),
  email: z.string().trim().email("Email invalid").max(200),
  budget: z.string().min(1, "Selectează bugetul"),
});

interface InvestmentGuideLeadModalProps {
  /** Trigger source for analytics — e.g. "scroll_end", "cta_button". */
  triggerOrigin?: string;
}

const InvestmentGuideLeadModal = ({ triggerOrigin = "auto" }: InvestmentGuideLeadModalProps) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-trigger after DELAY_MS, once per session
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, DELAY_MS);

    // also open when user reaches near bottom of article
    const onScroll = () => {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled >= total * 0.85) {
        setOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
        clearTimeout(t);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Listen to manual triggers (e.g. lead-magnet button)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-investment-guide-modal", handler);
    return () => window.removeEventListener("open-investment-guide-modal", handler);
  }, []);

  const t =
    language === "en"
      ? {
          title: "Download the detailed PDF analysis",
          desc: "Enter your details and we'll email the 2026 Timișoara Investment Guide (PDF, 24 pages, ROI charts).",
          name: "Full name",
          email: "Email",
          budget: "Investment budget",
          submit: "Send me the PDF",
          sending: "Sending...",
          success: "Check your inbox — the PDF is on its way.",
          error: "Could not send. Please try again or call us.",
          budgets: [
            { v: "<50k", l: "Under €50,000" },
            { v: "50-100k", l: "€50,000 – €100,000" },
            { v: "100-200k", l: "€100,000 – €200,000" },
            { v: "200k+", l: "Over €200,000" },
          ],
        }
      : {
          title: "Descarcă Analiza Detaliată PDF",
          desc: "Completează datele și îți trimitem pe email Ghidul Investițiilor Timișoara 2026 (PDF, 24 pagini, grafice ROI).",
          name: "Nume complet",
          email: "Email",
          budget: "Buget investiție",
          submit: "Trimite-mi PDF-ul",
          sending: "Se trimite...",
          success: "Verifică emailul — PDF-ul este pe drum.",
          error: "Nu am putut trimite. Reîncearcă sau sună-ne.",
          budgets: [
            { v: "<50k", l: "Sub 50.000 €" },
            { v: "50-100k", l: "50.000 – 100.000 €" },
            { v: "100-200k", l: "100.000 – 200.000 €" },
            { v: "200k+", l: "Peste 200.000 €" },
          ],
        };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ name, email, budget });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      // Save into the existing leads table — uses tracked source tag
      const { error } = await supabase.from("leads").insert({
        name: parsed.data.name,
        whatsapp_number: "n/a",
        email: parsed.data.email,
        property_type: "investitie",
        property_area: 0,
        message: `Lead Magnet PDF — Buget: ${parsed.data.budget}`,
        source: TRACKING_TAG,
        simulation_data: {
          provenienta: TRACKING_TAG,
          trigger_origin: triggerOrigin,
          buget_investitie: parsed.data.budget,
          guide: "ghid-investitii-imobiliare-timisoara-2026",
          language,
        },
      });
      if (error) throw error;
      toast({ title: t.success });
      setOpen(false);
      setName("");
      setEmail("");
      setBudget("");
    } catch (err) {
      console.error(err);
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mb-2">
            <FileDown className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">{t.title}</DialogTitle>
          <DialogDescription className="text-center">{t.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="ig-name">{t.name}</Label>
            <Input
              id="ig-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="ig-email">{t.email}</Label>
            <Input
              id="ig-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="ig-budget">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {t.budget}
              </span>
            </Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger id="ig-budget">
                <SelectValue placeholder={t.budget} />
              </SelectTrigger>
              <SelectContent>
                {t.budgets.map((b) => (
                  <SelectItem key={b.v} value={b.v}>
                    {b.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.budget && <p className="text-xs text-destructive mt-1">{errors.budget}</p>}
          </div>
          <Button type="submit" disabled={submitting} className="w-full" variant="hero" size="lg">
            <Download className="w-4 h-4 mr-2" />
            {submitting ? t.sending : t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentGuideLeadModal;
