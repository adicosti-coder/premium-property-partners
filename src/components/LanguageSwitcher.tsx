import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";

const LanguageSwitcher = () => {
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
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-200 group overflow-hidden"
      aria-label={language === 'ro' ? 'Switch to English' : 'Schimbă în Română'}
    >
      <span
        className={`text-base sm:text-lg transition-all duration-300 ${
          isAnimating ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
        }`}
      >
        {language === 'ro' ? '🇷🇴' : '🇬🇧'}
      </span>
      <span
        className={`uppercase font-semibold text-xs sm:text-sm text-primary group-hover:text-primary/80 transition-all duration-300 ${
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {language === 'ro' ? 'RO' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;