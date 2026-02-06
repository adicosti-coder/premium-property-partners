import { useState, useMemo } from "react";
import { Calendar, Calculator, Moon, Users, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/i18n/LanguageContext";
import { Property } from "@/data/properties";

interface StayCalculatorProps {
  property: Property;
  onBook?: () => void;
}

const StayCalculator = ({ property, onBook }: StayCalculatorProps) => {
  const { t, language } = useLanguage();
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(2);

  const calculation = useMemo(() => {
    const basePrice = property.pricePerNight * nights;
    const cleaningFee = 50; // Fixed cleaning fee
    const serviceFee = Math.round(basePrice * 0.12); // 12% service fee
    const total = basePrice + cleaningFee + serviceFee;
    const pricePerNightWithFees = Math.round(total / nights);

    return {
      basePrice,
      cleaningFee,
      serviceFee,
      total,
      pricePerNightWithFees,
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

      {/* Price display */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-foreground">
          €{property.pricePerNight}
        </span>
        <span className="text-muted-foreground">
          / {language === 'ro' ? 'noapte' : 'night'}
        </span>
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
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>{property.capacity}</span>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            €{property.pricePerNight} × {nights} {language === 'ro' ? 'nopți' : 'nights'}
          </span>
          <span className="text-foreground">€{calculation.basePrice}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {language === 'ro' ? 'Taxă curățenie' : 'Cleaning fee'}
          </span>
          <span className="text-foreground">€{calculation.cleaningFee}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {language === 'ro' ? 'Taxă servicii' : 'Service fee'}
          </span>
          <span className="text-foreground">€{calculation.serviceFee}</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-border">
          <span className="font-semibold text-foreground">
            {language === 'ro' ? 'Total' : 'Total'}
          </span>
          <span className="text-xl font-bold text-primary">€{calculation.total}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          ≈ €{calculation.pricePerNightWithFees} / {language === 'ro' ? 'noapte cu taxe' : 'night with fees'}
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
