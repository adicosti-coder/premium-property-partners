import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-foreground">{t.notFound.title}</h1>
        <p className="mb-6 text-xl text-muted-foreground">{t.notFound.message}</p>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-primary underline hover:text-primary/90 transition-colors"
        >
          {t.notFound.backHome}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
