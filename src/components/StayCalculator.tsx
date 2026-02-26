import { useState, useMemo } from "react";
import { Calendar, Calculator, Moon, Users, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/i18n/LanguageContext";
import { Property } from "@/data/properties";

interface StayCalculatorProps {
  property: Property;
  onBook?: () => void;
}

const DISCOUNT_PERCENT = 5;

const StayCalculator = ({ property, onBook }: StayCalculatorProps) => {
  const { t, language } = useLanguage();
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(2);

  const calculation = useMemo(() => {
    const bookingTotal = property.pricePerNight * nights;
    const directPricePerNight = Math.round(property.pricePerNight * (1 - DISCOUNT_PERCENT / 100));
    const directTotal = directPricePerNight * nights;
    const savings = bookingTotal - directTotal;

    return {
      bookingTotal,
      directPricePerNight,
      directTotal,
      savings,
    };
  }, [property.pricePerNight, nights]);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-elegant">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-serif font-semibold text-foreground">
          {language === 'ro' ? 'Calculator Sejur' : 'Stay Calculator'}
        </h3>
      </div>

      {/* Price display with comparison */}
      <div className="mb-6 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground line-through">
            €{property.pricePerNight}
          </span>
          <span className="text-xs text-muted-foreground">Booking.com</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            €{calculation.directPricePerNight}
          </span>
          <span className="text-muted-foreground">
            / {language === 'ro' ? 'noapte' : 'night'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
            -{DISCOUNT_PERCENT}%
          </span>
        </div>
      </div>

      {/* Nights slider */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            <Moon className="w-4 h-4 text-primary" />
            {language === 'ro' ? 'Număr nopți' : 'Number of nights'}
          </Label>
          <span className="text-lg font-semibold text-primary">
            {nights} {language === 'ro' ? (nights === 1 ? 'noapte' : 'nopți') : (nights === 1 ? 'night' : 'nights')}
          </span>
        </div>
        <Slider
          value={[nights]}
          onValueChange={(value) => setNights(value[0])}
          min={1}
          max={30}
          step={1}
          className="w-full"
          aria-label={language === 'ro' ? 'Număr nopți' : 'Number of nights'}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>30</span>
        </div>
      </div>

      {/* Guests slider */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-foreground">
            <Users className="w-4 h-4 text-primary" />
            {language === 'ro' ? 'Număr oaspeți' : 'Number of guests'}
          </Label>
          <span className="text-lg font-semibold text-primary">
            {guests} {language === 'ro' ? (guests === 1 ? 'oaspete' : 'oaspeți') : (guests === 1 ? 'guest' : 'guests')}
          </span>
        </div>
        <Slider
          value={[guests]}
          onValueChange={(value) => setGuests(value[0])}
          min={1}
          max={property.capacity}
          step={1}
          className="w-full"
          aria-label={language === 'ro' ? 'Număr oaspeți' : 'Number of guests'}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>{property.capacity}</span>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground line-through">
            €{property.pricePerNight} × {nights} {language === 'ro' ? 'nopți' : 'nights'}
          </span>
          <span className="text-muted-foreground line-through">€{calculation.bookingTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">
            €{calculation.directPricePerNight} × {nights} {language === 'ro' ? 'nopți' : 'nights'}
          </span>
          <span className="text-foreground font-medium">€{calculation.directTotal}</span>
        </div>

        {/* Savings highlight */}
        <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-green-500/10">
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {language === 'ro' ? 'Economisești' : 'You save'}
          </span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            -€{calculation.savings} ({DISCOUNT_PERCENT}%)
          </span>
        </div>

        <div className="flex justify-between pt-3 border-t border-border">
          <span className="font-semibold text-foreground">
            {language === 'ro' ? 'Total' : 'Total'}
          </span>
          <span className="text-xl font-bold text-primary">€{calculation.directTotal}</span>
        </div>
      </div>

      {/* Discount code reminder */}
      <div className="mt-4 text-center px-3 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5">
        <p className="text-xs text-muted-foreground">
          <Tag className="w-3 h-3 inline mr-1" />
          {language === 'ro' ? 'Folosește codul' : 'Use code'}{' '}
          <span className="font-bold text-primary">DIRECT5</span>
        </p>
      </div>

      {/* Book button */}
      <Button 
        onClick={() => window.open(property.bookingUrl, '_blank')} 
        className="w-full mt-6"
        size="lg"
      >
        <Calendar className="w-4 h-4 mr-2" />
        {language === 'ro' ? 'Rezervă Acum' : 'Book Now'}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        {language === 'ro' 
          ? 'Prețurile pot varia în funcție de sezon'
          : 'Prices may vary depending on the season'
        }
      </p>
    </div>
  );
};

export default StayCalculator;
