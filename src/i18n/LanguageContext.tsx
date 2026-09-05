import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ro, loadEnglish, Language, Translations } from './translations';
import { isBrowser, safeLocalStorage } from '@/utils/browserStorage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Cached once loaded so switching back to English is instant.
let englishDict: Translations | null = null;

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const saved = safeLocalStorage.getItem('language') as Language | null;
    if (saved && (saved === 'ro' || saved === 'en')) {
      return saved;
    }
    // Default to Romanian — primary audience is Romanian
    return 'ro';
  });

  // Romanian ships in the initial bundle; English is fetched on demand so the
  // second dictionary never weighs on first paint.
  const [dict, setDict] = useState<Translations>(() =>
    language === 'en' && englishDict ? englishDict : ro,
  );

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

  useEffect(() => {
    let cancelled = false;
    if (language !== 'en') {
      setDict(ro);
      return;
    }
    if (englishDict) {
      setDict(englishDict);
      return;
    }
    loadEnglish()
      .then((en) => {
        englishDict = en;
        if (!cancelled) setDict(en);
      })
      .catch(() => {
        // Fallback: keep Romanian copy rather than breaking the page.
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: dict }}>
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
