import { Check, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface PriceCompareWidgetProps {
  basePrice: number;
  discountPercent?: number;
  className?: string;
}

const PriceCompareWidget = ({ 
  basePrice, 
  discountPercent = 8,
  className = ""
}: PriceCompareWidgetProps) => {
  const { t } = useLanguage();
  const directPrice = Math.round(basePrice * (1 - discountPercent / 100));
  const savings = basePrice - directPrice;

  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          {t.priceCompare.title}
        </span>
      </div>
      
      <div className="space-y-2">
        {/* Booking price */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#003580] flex items-center justify-center text-white text-xs font-bold">
              B
            </div>
            <span className="text-muted-foreground">Booking.com</span>
          </div>
          <span className="text-muted-foreground line-through">{basePrice} €</span>
        </div>
        
        {/* Direct price */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Check className="w-3 h-3" />
            </div>
            <span className="font-medium text-foreground">{t.priceCompare.directPrice}</span>
          </div>
          <span className="font-bold text-primary text-lg">{directPrice} €</span>
        </div>
      </div>
      
      {/* Savings badge */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t.priceCompare.youSave}</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
            -{savings} € ({discountPercent}%)
          </span>
        </div>
      </div>
      
      {/* Code reminder */}
      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          {t.priceCompare.useCode} <span className="font-bold text-primary">DIRECT5</span>
        </p>
      </div>
    </div>
  );
};

export default PriceCompareWidget;
