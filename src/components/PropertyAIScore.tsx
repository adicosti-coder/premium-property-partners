import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PropertyAIScoreProps {
  propertyName: string;
  location?: string;
  basePrice?: number | null;
  bookingRating?: number | null;
  reviewCount?: number | null;
  bedrooms?: number | null;
  capacity?: number | null;
  amenities?: string[] | null;
  size?: number | null;
  tag?: string;
  className?: string;
}

/**
 * AI Score Widget — calculates a deterministic property score
 * based on available data (no API call needed).
 * Score: 0-140 across Location(30), Quality(25), Amenities(25), Reviews(25), Pricing(20), Size(15)
 */
const PropertyAIScore = ({
  propertyName,
  location,
  basePrice,
  bookingRating,
  reviewCount,
  bedrooms,
  capacity,
  amenities,
  size,
  tag,
  className,
}: PropertyAIScoreProps) => {
  const { language } = useLanguage();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const score = useMemo(() => {
    let total = 0;

    // Location score (max 30)
    const premiumZones = ["ISHO", "Paltim", "Centru", "Iulius", "City of Mara"];
    const locLower = (location || "").toLowerCase();
    if (premiumZones.some(z => locLower.includes(z.toLowerCase()))) total += 28;
    else if (locLower.includes("timișoara") || locLower.includes("timisoara")) total += 22;
    else total += 15;

    // Quality / Rating (max 25)
    if (bookingRating) {
      if (bookingRating >= 9.5) total += 25;
      else if (bookingRating >= 9.0) total += 22;
      else if (bookingRating >= 8.5) total += 18;
      else if (bookingRating >= 8.0) total += 15;
      else total += 10;
    } else total += 12;

    // Amenities (max 25)
    const amenityCount = amenities?.length || 0;
    total += Math.min(25, Math.round(amenityCount * 2.5));

    // Reviews volume (max 25)
    if (reviewCount) {
      if (reviewCount >= 100) total += 25;
      else if (reviewCount >= 50) total += 20;
      else if (reviewCount >= 20) total += 15;
      else total += 10;
    } else total += 8;

    // Pricing competitiveness (max 20)
    if (basePrice) {
      if (basePrice >= 80 && basePrice <= 150) total += 20;
      else if (basePrice >= 60) total += 15;
      else total += 10;
    } else total += 10;

    // Size bonus (max 15)
    if (size) {
      if (size >= 60) total += 15;
      else if (size >= 40) total += 12;
      else total += 8;
    } else total += 8;

    return Math.min(140, total);
  }, [location, bookingRating, reviewCount, amenities, basePrice, size]);

  const percentage = (score / 140) * 100;
  const category = score >= 120 ? "Premium" : score >= 90 ? "Superior" : score >= 60 ? "Standard" : "Basic";
  const categoryColor = score >= 120 ? "text-accent" : score >= 90 ? "text-primary" : score >= 60 ? "text-muted-foreground" : "text-destructive";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={animate ? { opacity: 1, scale: 1 } : {}}
            className={cn(
              "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 shadow-sm cursor-default",
              className
            )}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">AI Score</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-foreground">{score}</span>
              <span className="text-xs text-muted-foreground">/140</span>
            </div>
            <div className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-background/50", categoryColor)}>
              {category}
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-4 space-y-3">
          <p className="font-bold text-sm">{propertyName}</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1 }}
              className={cn(
                "h-full rounded-full",
                score >= 100 ? "bg-accent" : score >= 70 ? "bg-primary" : "bg-destructive"
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {language === "ro"
              ? "Scor calculat pe baza locației, rating-ului, facilităților, recenziilor și prețului."
              : "Score based on location, rating, amenities, reviews and pricing."}
          </p>
          <a href="/analiza-proprietate" className="text-xs text-primary hover:underline font-medium">
            {language === "ro" ? "Analiză completă →" : "Full analysis →"}
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PropertyAIScore;
