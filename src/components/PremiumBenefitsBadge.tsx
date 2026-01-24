import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, 
  MapPin, 
  History, 
  Heart, 
  Share2, 
  Bell, 
  Calculator, 
  FileText,
  Star,
  Sparkles,
  ChevronDown,
  Lock
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PremiumBenefitsBadgeProps {
  variant?: "inline" | "expanded" | "compact";
  className?: string;
  showTooltip?: boolean;
}

const PremiumBenefitsBadge = ({ 
  variant = "inline", 
  className = "",
  showTooltip = true 
}: PremiumBenefitsBadgeProps) => {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const t = {
    ro: {
      premium: "Premium",
      unlock: "Deblochează acces complet",
      benefits: [
        { icon: MapPin, text: "50+ locații exclusive City Guide", category: "city-guide" },
        { icon: History, text: "Istoric simulări salvate", category: "calculator" },
        { icon: Heart, text: "Favorite sincronizate", category: "favorites" },
        { icon: Share2, text: "Partajare locații cu prietenii", category: "sharing" },
        { icon: Bell, text: "Notificări personalizate", category: "notifications" },
        { icon: Calculator, text: "Estimări detaliate randament", category: "calculator" },
        { icon: FileText, text: "Export PDF personalizat", category: "export" },
        { icon: Star, text: "Suport prioritar", category: "support" },
      ],
      tooltip: "Creează cont gratuit pentru acces complet",
      freeAccount: "Cont gratuit",
    },
    en: {
      premium: "Premium",
      unlock: "Unlock full access",
      benefits: [
        { icon: MapPin, text: "50+ exclusive City Guide locations", category: "city-guide" },
        { icon: History, text: "Saved simulation history", category: "calculator" },
        { icon: Heart, text: "Synced favorites", category: "favorites" },
        { icon: Share2, text: "Share locations with friends", category: "sharing" },
        { icon: Bell, text: "Personalized notifications", category: "notifications" },
        { icon: Calculator, text: "Detailed yield estimates", category: "calculator" },
        { icon: FileText, text: "Custom PDF export", category: "export" },
        { icon: Star, text: "Priority support", category: "support" },
      ],
      tooltip: "Create a free account for full access",
      freeAccount: "Free account",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  // Compact badge with tooltip
  if (variant === "compact") {
    const badge = (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
          "bg-gradient-to-r from-gold/20 to-gold/10",
          "border border-gold/30",
          "cursor-pointer select-none",
          "transition-all duration-300",
          "hover:border-gold/50 hover:shadow-[0_0_15px_hsl(var(--gold)/0.3)]",
          className
        )}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatDelay: 3 
          }}
        >
          <Crown className="w-3.5 h-3.5 text-gold" />
        </motion.div>
        <span className="text-xs font-semibold text-gold">{text.premium}</span>
      </motion.div>
    );

    if (!showTooltip) return badge;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="max-w-xs p-3 bg-card border border-gold/20"
          >
            <div className="space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                {text.unlock}
              </p>
              <ul className="space-y-1">
                {text.benefits.slice(0, 4).map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <benefit.icon className="w-3 h-3 text-gold" />
                    {benefit.text}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                + {text.benefits.length - 4} {language === "ro" ? "beneficii în plus" : "more benefits"}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline badge with expandable list
  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "inline-flex flex-col",
          className
        )}
      >
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl",
            "bg-gradient-to-r from-gold/15 via-gold/10 to-gold/15",
            "border border-gold/30",
            "transition-all duration-300",
            "hover:border-gold/50 hover:shadow-[0_0_20px_hsl(var(--gold)/0.2)]",
            "focus:outline-none focus:ring-2 focus:ring-gold/30"
          )}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatDelay: 2 
            }}
          >
            <Crown className="w-4 h-4 text-gold" />
          </motion.div>
          <span className="text-sm font-semibold text-gold">{text.premium}</span>
          <span className="text-xs text-gold/70">•</span>
          <span className="text-xs text-gold/80">{text.freeAccount}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gold/70" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-3 pb-1 px-1">
                <div className="grid grid-cols-2 gap-2">
                  {text.benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="w-3 h-3 text-gold" />
                      </div>
                      <span className="line-clamp-1">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Expanded full list
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl",
        "bg-gradient-to-br from-gold/10 via-transparent to-gold/5",
        "border border-gold/20",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatDelay: 4 
          }}
          className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center"
        >
          <Crown className="w-4 h-4 text-gold" />
        </motion.div>
        <div>
          <h4 className="font-semibold text-foreground">{text.unlock}</h4>
          <p className="text-xs text-muted-foreground">{text.freeAccount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {text.benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ x: 5 }}
            className="flex items-center gap-3 group"
          >
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center transition-colors group-hover:bg-gold/20"
            >
              <benefit.icon className="w-4 h-4 text-gold" />
            </motion.div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {benefit.text}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default PremiumBenefitsBadge;
