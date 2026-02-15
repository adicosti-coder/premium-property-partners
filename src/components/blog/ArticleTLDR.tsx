import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles } from "lucide-react";

interface ArticleTLDRProps {
  excerpt: string;
  readingTime: number;
}

const translations = {
  ro: { label: "Rezumat rapid", time: "min citire" },
  en: { label: "Quick Summary", time: "min read" },
};

const ArticleTLDR = ({ excerpt, readingTime }: ArticleTLDRProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ro;

  return (
    <aside
      className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-5"
      role="note"
      aria-label={t.label}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {t.label} · {readingTime} {t.time}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{excerpt}</p>
    </aside>
  );
};

export default ArticleTLDR;
