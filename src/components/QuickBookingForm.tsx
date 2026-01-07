import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { CalendarIcon, Users, Tag, CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const QuickBookingForm = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState("2");
  const [discountCode, setDiscountCode] = useState("DIRECT5");
  const [codeApplied, setCodeApplied] = useState(false);

  const dateLocale = language === "ro" ? ro : enUS;
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleApplyCode = () => {
    if (discountCode.toUpperCase() === "DIRECT5") {
      setCodeApplied(true);
      toast.success(t.quickBooking?.codeApplied || "Cod aplicat cu succes! 5% reducere.");
    } else {
      toast.error(t.quickBooking?.invalidCode || "Cod invalid. Încearcă DIRECT5.");
    }
  };

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error(t.quickBooking?.selectDates || "Selectează datele de check-in și check-out.");
      return;
    }
    
    // Navigate to guests page with search params
    const params = new URLSearchParams({
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      guests: guests,
      ...(codeApplied && { code: "DIRECT5" }),
    });
    
    navigate(`/oaspeti?${params.toString()}`);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold text-lg">
            {t.quickBooking?.title || "Rezervă Direct & Economisește"}
          </h3>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid gap-4">
          {/* Date Selection */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Check-in */}
            <div className="space-y-2">
              <Label>{t.quickBooking?.checkIn || "Check-in"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "PPP", { locale: dateLocale }) : (t.quickBooking?.selectDate || "Selectează data")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={dateLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out */}
            <div className="space-y-2">
              <Label>{t.quickBooking?.checkOut || "Check-out"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "PPP", { locale: dateLocale }) : (t.quickBooking?.selectDate || "Selectează data")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < new Date() || (checkIn && date <= checkIn)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={dateLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <Label>{t.quickBooking?.guests || "Oaspeți"}</Label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? (t.quickBooking?.guest || "oaspete") : (t.quickBooking?.guestsLabel || "oaspeți")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount Code */}
          <div className="space-y-2">
            <Label>{t.quickBooking?.discountCode || "Cod reducere"}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setCodeApplied(false);
                  }}
                  placeholder="DIRECT5"
                  className={cn(
                    "pl-10 uppercase font-mono",
                    codeApplied && "border-green-500 bg-green-500/10"
                  )}
                  maxLength={20}
                />
                {codeApplied && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              <Button
                type="button"
                variant={codeApplied ? "secondary" : "outline"}
                onClick={handleApplyCode}
                disabled={codeApplied}
              >
                {codeApplied ? (t.quickBooking?.applied || "Aplicat") : (t.quickBooking?.apply || "Aplică")}
              </Button>
            </div>
            {codeApplied && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t.quickBooking?.discountApplied || "5% reducere aplicată!"}
              </p>
            )}
          </div>

          {/* Nights summary */}
          {nights > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {nights} {nights === 1 ? (t.quickBooking?.night || "noapte") : (t.quickBooking?.nights || "nopți")}
                {codeApplied && (
                  <span className="ml-2 text-green-600 font-medium">
                    • {t.quickBooking?.with5off || "cu 5% reducere"}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Search Button */}
          <Button 
            size="lg" 
            className="w-full group"
            onClick={handleSearch}
          >
            {t.quickBooking?.searchProperties || "Caută Proprietăți Disponibile"}
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {t.quickBooking?.instantConfirm || "Confirmare instantă"}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {t.quickBooking?.securePayment || "Plată securizată"}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {t.quickBooking?.flexCancel || "Anulare flexibilă"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickBookingForm;