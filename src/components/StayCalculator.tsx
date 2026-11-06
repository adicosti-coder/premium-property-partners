import { useState, useMemo } from "react";
import { Calendar, Calculator, Moon, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/i18n/LanguageContext";
import { Property } from "@/data/properties";
import { CalculatorLeadForm } from "@/components/CalculatorLeadForm";
import { buildGuestLeadRequest } from "@/lib/calculatorLeads";

interface StayCalculatorProps {
  property: Property;
  onBook?: () => void;
}

const DISCOUNT_PERCENT = 5;
const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;

const Stepper = ({ label, value, min, max, onChange, icon: Icon, unit }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; icon: typeof Moon; unit: string }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />{label}
      </Label>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} −1`}>−</Button>
        <span className="min-w-[4.5rem] text-center text-base font-semibold tabular-nums text-foreground" aria-live="polite">{value} {unit}</span>
        <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +1`}>+</Button>
      </div>
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} aria-label={label} />
  </div>
);

const StayCalculator = ({ property, onBook }: StayCalculatorProps) => {
  const { language } = useLanguage();
  const ro = language === "ro";
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(2);

  // Formula dedicată (neschimbată): tarif Booking × nopți, direct −5% (DIRECT5).
  const calculation = useMemo(() => {
    const bookingTotal = property.pricePerNight * nights;
    const directPricePerNight = Math.round(property.pricePerNight * (1 - DISCOUNT_PERCENT / 100));
    const directTotal = directPricePerNight * nights;
    const savings = bookingTotal - directTotal;
    return { bookingTotal, directPricePerNight, directTotal, savings };
  }, [property.pricePerNight, nights]);

  const nightsUnit = ro ? (nights === 1 ? "noapte" : "nopți") : (nights === 1 ? "night" : "nights");
  const guestsUnit = ro ? (guests === 1 ? "oaspete" : "oaspeți") : (guests === 1 ? "guest" : "guests");
  const perGuest = Math.round(calculation.directTotal / Math.max(1, guests));
  const directShare = calculation.bookingTotal > 0 ? (calculation.directTotal / calculation.bookingTotal) * 100 : 100;
  const leadRequest = buildGuestLeadRequest({
    propertyName: property.name,
    nights,
    guests,
    directTotal: calculation.directTotal,
    bookingTotal: calculation.bookingTotal,
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
      <div className="border-b border-border px-6 py-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          {ro ? "Calculator sejur · preț pe loc" : "Stay calculator · instant price"}
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-serif text-3xl font-semibold text-foreground">€{calculation.directPricePerNight}</span>
          <span className="text-sm text-muted-foreground">/ {ro ? "noapte direct" : "night direct"}</span>
          <span className="text-sm text-muted-foreground line-through">€{property.pricePerNight}</span>
          <span className="rounded-full bg-[hsl(var(--success-soft))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--success))]">−{DISCOUNT_PERCENT}%</span>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <Stepper label={ro ? "Nopți" : "Nights"} value={nights} min={MIN_NIGHTS} max={MAX_NIGHTS} onChange={setNights} icon={Moon} unit={nightsUnit} />
        <Stepper label={ro ? "Oaspeți" : "Guests"} value={guests} min={1} max={Math.max(1, property.capacity)} onChange={setGuests} icon={Users} unit={guestsUnit} />
      </div>

      <div aria-live="polite" className="space-y-4 border-t border-border bg-muted/40 px-6 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{ro ? `Total pentru ${nights} ${nightsUnit}` : `Total for ${nights} ${nightsUnit}`}</p>
          <p className="font-serif text-4xl font-semibold tabular-nums text-primary">€{calculation.directTotal}</p>
          <p className="text-xs text-muted-foreground">≈ €{perGuest} / {ro ? "oaspete" : "guest"}</p>
        </div>

        <div className="space-y-2" role="img" aria-label={ro ? `Booking.com €${calculation.bookingTotal}, direct €${calculation.directTotal}` : `Booking.com €${calculation.bookingTotal}, direct €${calculation.directTotal}`}>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Booking.com</span><span className="tabular-nums">€{calculation.bookingTotal}</span></div>
            <div className="h-2 rounded-full bg-muted-foreground/30" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs font-medium text-foreground"><span>{ro ? "Rezervare directă" : "Direct booking"}</span><span className="tabular-nums">€{calculation.directTotal}</span></div>
            <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${directShare}%` }} /></div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--success-soft))] px-3 py-2">
          <span className="text-sm font-medium text-[hsl(var(--success))]">{ro ? "Economisești" : "You save"}</span>
          <span className="text-sm font-bold text-[hsl(var(--success))]">−€{calculation.savings} ({DISCOUNT_PERCENT}%)</span>
        </div>

        <p className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
          <Tag className="mr-1 inline h-3 w-3" aria-hidden="true" />
          {ro ? "Folosește codul" : "Use code"} <span className="font-bold text-primary">DIRECT5</span>
        </p>

        <Button
          onClick={() => {
            if (property.bookingUrl) {
              window.open(property.bookingUrl, "_blank", "noopener,noreferrer");
              return;
            }
            onBook?.();
          }}
          className="min-h-12 w-full"
          size="lg"
        >
          <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
          {ro ? "Rezervă acum" : "Book now"}
        </Button>
        <CalculatorLeadForm
          request={leadRequest}
          triggerLabel={ro ? "Trimite-mi oferta pe WhatsApp" : "Send me the offer on WhatsApp"}
          title={ro ? "Oferta ta directă cu −5%" : "Your direct offer with −5%"}
          description={ro ? "Primești rezumatul pentru apartament, nopți, oaspeți și prețul direct vs. Booking.com. Andrei confirmă disponibilitatea înainte de rezervare." : "Get the apartment, nights, guests and direct vs. Booking.com price summary. Andrei confirms availability before booking."}
          variant="outline"
          className="min-h-12 w-full"
        />
        <p className="text-center text-xs text-muted-foreground">
          {ro ? "Prețurile pot varia în funcție de sezon" : "Prices may vary depending on the season"}
        </p>
      </div>
    </div>
  );
};

export default StayCalculator;
