import { useLanguage } from "@/i18n/LanguageContext";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ro' ? 'en' : 'ro');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-200 group"
      aria-label={language === 'ro' ? 'Switch to English' : 'Schimbă în Română'}
    >
      <span className="text-lg">{language === 'ro' ? '🇷🇴' : '🇬🇧'}</span>
      <span className="uppercase font-semibold text-sm text-primary group-hover:text-primary/80">
        {language === 'ro' ? 'RO' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;