import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, Translations } from './translations';
import { isBrowser, safeLocalStorage } from '@/utils/browserStorage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const saved = safeLocalStorage.getItem('language') as Language | null;
    if (saved && (saved === 'ro' || saved === 'en')) {
      return saved;
    }
    // Check browser language
    const browserLang = isBrowser() && typeof navigator !== 'undefined'
      ? navigator.language.split('-')[0]
      : 'ro';
    return browserLang === 'en' ? 'en' : 'ro';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    safeLocalStorage.setItem('language', lang);
    if (isBrowser() && typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (isBrowser() && typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};