import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles } from "lucide-react";

/**
 * AI-friendly summary block for key landing pages.
 * CSS class `.page-summary` is targeted by Speakable schema.
 */

interface PageSummaryProps {
  summaryRo: string;
  summaryEn: string;
}

const PageSummary = ({ summaryRo, summaryEn }: PageSummaryProps) => {
  const { language } = useLanguage();
  const summary = language === "en" ? summaryEn : summaryRo;
  const label = language === "en" ? "Page Summary" : "Rezumat pagină";

  return (
    <aside
      className="page-summary my-6 rounded-xl border border-primary/20 bg-primary/5 p-5"
      role="note"
      aria-label={label}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
    </aside>
  );
};

export default PageSummary;
