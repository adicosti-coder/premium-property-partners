import { CheckCircle, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Reassurance microcopy shown directly under a form's primary submit button.
 *
 * Placed below the CTA on purpose: the hesitation that costs conversions
 * ("what happens with my data?", "am I committing to anything?") peaks at the
 * moment of clicking, so the answer must sit where the eye already is.
 */
interface FormTrustBadgesProps {
  /** Extra classes for the wrapper. */
  className?: string;
  /** Show the compact badge row (response time, free, local coverage). */
  showBadges?: boolean;
  /** Override the privacy reassurance line. */
  privacyText?: string;
  /** Tone for dark backgrounds (hero sections). */
  tone?: "default" | "onDark";
}

const COPY = {
  ro: {
    badges: ["Răspuns în 24 de ore lucrătoare", "Gratuit, fără obligații", "Consultanți din Timișoara"],
    privacy:
      "Confidențialitate garantată. Fără obligații contractuale la analiză — datele tale nu ajung la terți.",
  },
  en: {
    badges: ["Reply within 24 business hours", "Free, no obligation", "Consultants based in Timișoara"],
    privacy:
      "Your privacy is guaranteed. No contract commitment for the analysis — we never share your data with third parties.",
  },
} as const;

const FormTrustBadges = ({
  className = "",
  showBadges = true,
  privacyText,
  tone = "default",
}: FormTrustBadgesProps) => {
  const { language } = useLanguage();
  const copy = language === "en" ? COPY.en : COPY.ro;

  const mutedClass = tone === "onDark" ? "text-white/70" : "text-muted-foreground";
  const iconClass = tone === "onDark" ? "text-amber-300" : "text-primary";

  return (
    <div className={`mt-4 space-y-2 ${className}`}>
      {showBadges && (
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {copy.badges.map((item) => (
            <li key={item} className={`flex items-center gap-1.5 text-xs ${mutedClass}`}>
              <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${iconClass}`} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
      <p className={`flex items-start justify-center gap-2 text-xs text-center ${mutedClass}`}>
        <ShieldCheck className={`w-4 h-4 shrink-0 mt-px ${iconClass}`} aria-hidden="true" />
        <span>{privacyText ?? copy.privacy}</span>
      </p>
    </div>
  );
};

export default FormTrustBadges;
