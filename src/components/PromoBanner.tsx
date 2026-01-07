import { useState } from "react";
import { X, Tag, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

const PromoBanner = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground relative z-50">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm md:text-base">
        <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="font-medium">
          {t.promoBanner.text}{" "}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded font-bold">
            <Tag className="w-3.5 h-3.5" />
            DIRECT5
          </span>{" "}
          {t.promoBanner.discount}
        </span>
        <Link 
          to="/rezerva-direct" 
          className="hidden sm:inline-flex items-center gap-1 ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-semibold transition-colors"
        >
          {t.whyBookDirect?.ctaButton || "Află mai mult"}
          <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;
