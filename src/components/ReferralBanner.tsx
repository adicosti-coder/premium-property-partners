import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReferralBannerProps {
  variant?: "inline" | "floating" | "hero";
  className?: string;
}

const ReferralBanner = ({ variant = "inline", className }: ReferralBannerProps) => {
  const { language } = useLanguage();

  const t = {
    ro: {
      title: "Weekend Gratuit!",
      subtitle: "Recomandă un prieten cu apartament și câștigi 2 nopți gratis",
      cta: "Află cum",
      badge: "Nou",
    },
    en: {
      title: "Free Weekend!",
      subtitle: "Refer a friend with an apartment and win 2 free nights",
      cta: "Learn how",
      badge: "New",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  if (variant === "floating") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
        className={cn(
          "fixed bottom-24 right-4 z-40 max-w-xs hidden md:block",
          className
        )}
      >
        <Link to="/recomanda-proprietar">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{text.title}</p>
                <p className="text-xs text-white/80 line-clamp-2">{text.subtitle}</p>
              </div>
              <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "hero") {
    return (
      <Link to="/recomanda-proprietar" className={cn("block", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white group hover:shadow-xl transition-all"
        >
          {/* Decorative sparkles */}
          <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/30" />
          <Sparkles className="absolute bottom-4 left-4 w-4 h-4 text-white/20" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Gift className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium mb-1">
                  {text.badge}
                </span>
                <h3 className="text-2xl font-bold">{text.title}</h3>
                <p className="text-white/80">{text.subtitle}</p>
              </div>
            </div>
            
            <Button 
              variant="secondary" 
              className="bg-white text-orange-600 hover:bg-white/90 gap-2 group-hover:scale-105 transition-transform"
            >
              {text.cta}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Default inline variant
  return (
    <Link to="/recomanda-proprietar" className={cn("block", className)}>
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 rounded-xl p-4 hover:shadow-md transition-all group">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{text.title}</p>
              <p className="text-sm text-muted-foreground">{text.subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-amber-600 hover:text-amber-700">
            {text.cta}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ReferralBanner;