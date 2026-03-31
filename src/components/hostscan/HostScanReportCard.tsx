import { motion } from "framer-motion";
import { TrendingUp, MapPin, CheckCircle2, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyReport {
  scor: number;
  max_scor: number;
  zona: string;
  roi_estimat: string;
  tarif_noapte: number;
  note_consultant: string;
  recomandari: string[];
  categorie?: string;
}

interface Props {
  report: PropertyReport;
  language: string;
  onSendEmail?: () => void;
  isSendingEmail?: boolean;
  emailSent?: boolean;
  ownerName?: string;
  ownerPhone?: string;
}

const HostScanReportCard = ({ report, language, onSendEmail, isSendingEmail, emailSent, ownerName, ownerPhone }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/30 shadow-xl space-y-4"
    >
      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
            {language === "ro" ? "Raport Finalizat" : "Report Complete"}
          </span>
        </div>
        <div>
          <span className="text-3xl font-bold text-foreground">{report.scor}</span>
          <span className="text-sm text-muted-foreground">/{report.max_scor}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(report.scor / report.max_scor) * 100}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            report.scor >= 100 ? "bg-accent" : report.scor >= 70 ? "bg-primary" : "bg-destructive"
          )}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-background/50 rounded-xl p-3 border border-border/30">
          <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-bold text-foreground">{report.zona}</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 border border-border/30">
          <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
          <p className="text-sm font-bold text-foreground">{report.roi_estimat}</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 border border-border/30">
          <span className="text-lg">€</span>
          <p className="text-sm font-bold text-foreground">{report.tarif_noapte}€</p>
        </div>
      </div>

      {/* Consultant note */}
      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
        "{report.note_consultant}"
      </p>

      {/* Recommendations */}
      {report.recomandari?.length > 0 && (
        <div className="space-y-1.5">
          {report.recomandari.map((rec, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {rec}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          variant="whatsapp"
          size="lg"
          className="w-full gap-2"
          onClick={() =>
            window.open(
              `https://wa.me/40723154520?text=${encodeURIComponent(
                `Scor HostScan: ${report.scor}/${report.max_scor} | ${report.zona} | ROI: ${report.roi_estimat}${ownerName ? ` | ${ownerName}` : ""}${ownerPhone ? ` - ${ownerPhone}` : ""}`
              )}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        >
          <Phone className="w-4 h-4" />
          {language === "ro" ? "CONTACTEAZĂ CONSULTANT" : "CONTACT CONSULTANT"}
        </Button>

        {onSendEmail && (
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={onSendEmail}
            disabled={isSendingEmail || emailSent}
          >
            {isSendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : emailSent ? (
              <CheckCircle2 className="w-4 h-4 text-accent" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {emailSent
              ? language === "ro" ? "Raport trimis ✓" : "Report sent ✓"
              : language === "ro" ? "Trimite raportul pe email" : "Send report via email"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default HostScanReportCard;
