import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { trackConversion } from "@/lib/conversionTracking";
import {
  generateYieldReportPdf,
  yieldReportFileName,
  type YieldReportInput,
} from "@/utils/exportYieldReportPdf";

interface YieldReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Live calculator state + derived values, without the owner name / language. */
  report: Omit<YieldReportInput, "ownerName" | "language">;
}

const copy = {
  ro: {
    title: "Raportul tău de randament (PDF)",
    description:
      "Îți generăm instant un PDF cu venitul brut, deducerile operaționale și proiecția pe 12 luni. Emailul e opțional — îl folosim doar pentru a-ți trimite raportul.",
    name: "Numele tău",
    namePh: "Ex: Adrian Popescu",
    email: "Email (opțional)",
    emailPh: "nume@exemplu.ro",
    download: "Descarcă PDF",
    sendEmail: "Trimite pe email",
    working: "Se generează…",
    ok: "Raport descărcat!",
    sent: "Ți-am trimis raportul pe email.",
    err: "Nu am putut genera raportul. Încearcă din nou.",
    mailErr: "Raportul s-a descărcat, dar emailul nu a putut fi trimis.",
    invalidEmail: "Introdu o adresă de email validă.",
    privacy: "Fără spam. Datele nu sunt vândute și le poți șterge oricând.",
  },
  en: {
    title: "Your yield report (PDF)",
    description:
      "We instantly generate a PDF with gross revenue, operating deductions and the 12-month projection. Email is optional — used only to send you the report.",
    name: "Your name",
    namePh: "E.g. Adrian Popescu",
    email: "Email (optional)",
    emailPh: "name@example.com",
    download: "Download PDF",
    sendEmail: "Send by email",
    working: "Generating…",
    ok: "Report downloaded!",
    sent: "We emailed you the report.",
    err: "Could not generate the report. Please try again.",
    mailErr: "The report downloaded, but the email could not be sent.",
    invalidEmail: "Please enter a valid email address.",
    privacy: "No spam. We never sell your data and you can delete it anytime.",
  },
} as const;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());

const YieldReportDialog = ({ isOpen, onClose, report }: YieldReportDialogProps) => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";
  const t = copy[lang];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const handleGenerate = async (withEmail: boolean) => {
    if (withEmail && !isValidEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }
    setIsWorking(true);
    try {
      const doc = await generateYieldReportPdf({
        ...report,
        ownerName: name.trim() || undefined,
        language: lang,
      });

      doc.save(yieldReportFileName(lang));

      trackConversion({
        event: "download_yield_report",
        source: withEmail ? "yield_report_email" : "yield_report_download",
        value: report.yearlyNet,
        currency: "EUR",
        name: name.trim() || undefined,
        email: withEmail ? email.trim() : undefined,
      });

      if (withEmail) {
        const pdfBase64 = doc.output("datauristring").split(",")[1] ?? "";
        const { error } = await supabase.functions.invoke("send-yield-report", {
          body: {
            name: name.trim() || (lang === "ro" ? "Investitor" : "Investor"),
            email: email.trim(),
            language: lang,
            pdfBase64,
            fileName: yieldReportFileName(lang),
            summary: {
              netProfit: report.netProfit,
              yearlyNet: report.yearlyNet,
              occupancy: report.occupancy,
              adr: report.adr,
            },
          },
        });
        if (error) throw new Error("mail");
        toast.success(t.sent);
      } else {
        toast.success(t.ok);
      }
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "mail") {
        toast.error(t.mailErr);
        onClose();
      } else {
        toast.error(t.err);
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isWorking && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yield-report-name">{t.name}</Label>
            <Input
              id="yield-report-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePh}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yield-report-email">{t.email}</Label>
            <Input
              id="yield-report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPh}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => handleGenerate(false)}
              disabled={isWorking}
              className="flex-1"
              aria-label={t.download}
            >
              {isWorking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              {isWorking ? t.working : t.download}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={isWorking || !email.trim()}
              className="flex-1"
              aria-label={t.sendEmail}
            >
              <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
              {t.sendEmail}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">{t.privacy}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YieldReportDialog;
