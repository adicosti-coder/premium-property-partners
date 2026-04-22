import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { Download, FileDown, TrendingUp, Phone } from "lucide-react";
import { trackConversion } from "@/lib/conversionTracking";
import { trackPdfFunnel } from "@/lib/pdfFunnelTracking";

const TRACKING_TAG = "articol_investitii_2026";
const STORAGE_KEY = "investment_guide_modal_seen_v1";
const DELAY_MS = 30_000;

interface InvestmentGuideLeadModalProps {
  /** Trigger source for analytics — e.g. "scroll_end", "cta_button". */
  triggerOrigin?: string;
}

const InvestmentGuideLeadModal = ({ triggerOrigin = "auto" }: InvestmentGuideLeadModalProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isRo = language !== "en";

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, isRo ? "Numele trebuie să aibă minim 2 caractere" : "Name must be at least 2 characters")
      .max(80, isRo ? "Maxim 80 de caractere" : "Max 80 characters"),
    email: z
      .string()
      .trim()
      .email(isRo ? "Adresă de email invalidă" : "Invalid email address")
      .max(200),
    phone: z
      .string()
      .trim()
      .min(8, isRo ? "Introdu un număr de telefon valid (min. 8 cifre)" : "Enter a valid phone (min 8 digits)")
      .max(30),
    budget: z.string().min(1, isRo ? "Selectează bugetul" : "Select a budget"),
  });

  // Auto-trigger after DELAY_MS, once per session
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, DELAY_MS);

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

  const t = isRo
    ? {
        title: "Descarcă Analiza Detaliată PDF",
        desc: "Completează datele și îți trimitem pe email Ghidul Investițiilor Timișoara 2026 (PDF, 24 pagini, grafice ROI).",
        name: "Nume complet",
        namePlaceholder: "ex: Adrian Popescu",
        email: "Email",
        emailPlaceholder: "nume@exemplu.ro",
        phone: "Telefon / WhatsApp",
        phonePlaceholder: "ex: 0722 123 456",
        budget: "Buget investiție",
        submit: "Trimite-mi PDF-ul",
        sending: "Se trimite...",
        success: "Mulțumim! Te redirecționăm...",
        error: "Nu am putut trimite. Reîncearcă sau sună-ne.",
        budgets: [
          { v: "<50k", l: "Sub 50.000 €" },
          { v: "50-100k", l: "50.000 – 100.000 €" },
          { v: "100-200k", l: "100.000 – 200.000 €" },
          { v: "200k+", l: "Peste 200.000 €" },
        ],
      }
    : {
        title: "Download the detailed PDF analysis",
        desc: "Enter your details and we'll email the 2026 Timișoara Investment Guide (PDF, 24 pages, ROI charts).",
        name: "Full name",
        namePlaceholder: "e.g. Adrian Popescu",
        email: "Email",
        emailPlaceholder: "name@example.com",
        phone: "Phone / WhatsApp",
        phonePlaceholder: "e.g. +40 722 123 456",
        budget: "Investment budget",
        submit: "Send me the PDF",
        sending: "Sending...",
        success: "Thank you! Redirecting...",
        error: "Could not send. Please try again or call us.",
        budgets: [
          { v: "<50k", l: "Under €50,000" },
          { v: "50-100k", l: "€50,000 – €100,000" },
          { v: "100-200k", l: "€100,000 – €200,000" },
          { v: "200k+", l: "Over €200,000" },
        ],
      };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ name, email, phone, budget });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      // Use submit-lead edge function (bypasses RLS via service role)
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: parsed.data.name,
          whatsapp_number: parsed.data.phone,
          email: parsed.data.email,
          property_type: "cerere_rapida",
          property_area: 0,
          message: `Lead Magnet PDF — Buget: ${parsed.data.budget}`,
          source: "lead_capture_form",
          simulation_data: {
            provenienta: TRACKING_TAG,
            trigger_origin: triggerOrigin,
            buget_investitie: parsed.data.budget,
            guide: "ghid-investitii-imobiliare-timisoara-2026",
            language,
          },
        },
      });

      if (error || (data && (data as { error?: string }).error)) {
        throw new Error((data as { error?: string })?.error || error?.message || "submit failed");
      }

      // Send investor guide email to the user (non-blocking — UX must not wait)
      void supabase.functions
        .invoke("send-investor-guide-email", {
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            language,
            budget: parsed.data.budget,
          },
        })
        .then(({ error: mailErr }) => {
          if (mailErr) console.error("Investor guide email failed:", mailErr);
        });

      // Track conversion in GA4 / dataLayer
      trackConversion({
        event: "lead_magnet_pdf",
        source: TRACKING_TAG,
        budget: parsed.data.budget,
        trigger_origin: triggerOrigin,
      });

      // Funnel step 1: lead submitted (and implicit "PDF unlocked")
      void trackPdfFunnel("lead_submitted", {
        source: TRACKING_TAG,
        email: parsed.data.email,
        metadata: { budget: parsed.data.budget, trigger_origin: triggerOrigin },
      });
      void trackPdfFunnel("pdf_downloaded", {
        source: TRACKING_TAG,
        email: parsed.data.email,
      });

      toast.success(t.success);
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setBudget("");

      // Redirect to thank-you page
      setTimeout(() => navigate("/multumim"), 400);
    } catch (err) {
      console.error("Lead magnet submit error:", err);
      toast.error(t.error);
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
        <form onSubmit={onSubmit} className="space-y-4 mt-2" noValidate>
          <div>
            <Label htmlFor="ig-name">{t.name}</Label>
            <Input
              id="ig-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={t.namePlaceholder}
              autoComplete="name"
              aria-invalid={!!errors.name}
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
              placeholder={t.emailPlaceholder}
              autoComplete="email"
              aria-invalid={!!errors.email}
              required
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="ig-phone">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {t.phone}
              </span>
            </Label>
            <Input
              id="ig-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder={t.phonePlaceholder}
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              required
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="ig-budget">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {t.budget}
              </span>
            </Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger id="ig-budget" aria-invalid={!!errors.budget}>
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
