import { useLanguage } from "@/i18n/LanguageContext";
import { forwardRef, useState } from "react";

const LanguageSwitcher = forwardRef<HTMLButtonElement>((_props, ref) => {
  const { language, setLanguage } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleLanguage = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setLanguage(language === 'ro' ? 'en' : 'ro');
      setTimeout(() => setIsAnimating(false), 200);
    }, 150);
  };

  return (
    <button
      ref={ref}
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] min-w-[44px] rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-200 group overflow-hidden"
      aria-label={language === 'ro' ? 'RO — Switch to English' : 'EN — Schimbă în Română'}
    >
      <span
        className={`text-base sm:text-lg transition-all duration-300 ${
          isAnimating ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
        }`}
      >
        {language === 'ro' ? '🇷🇴' : '🇬🇧'}
      </span>
      <span
        className={`uppercase font-semibold text-xs sm:text-sm text-foreground group-hover:text-foreground/80 transition-all duration-300 ${
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {language === 'ro' ? 'RO' : 'EN'}
      </span>
    </button>
  );
});

LanguageSwitcher.displayName = "LanguageSwitcher";

export default LanguageSwitcher;