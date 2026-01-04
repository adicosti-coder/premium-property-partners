import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, MapPin, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { value: "all", labelRo: "Toate locațiile", labelEn: "All locations" },
  { value: "timisoara", labelRo: "Timișoara", labelEn: "Timișoara" },
  { value: "ultracentral", labelRo: "Ultracentral", labelEn: "City Center" },
  { value: "circumvalatiunii", labelRo: "Circumvalațiunii", labelEn: "Circumvalațiunii" },
];

interface AvailabilitySearchWidgetProps {
  variant?: "hero" | "standalone";
}

const AvailabilitySearchWidget = ({ variant = "hero" }: AvailabilitySearchWidgetProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  
  const [checkIn, setCheckIn] = useState<Date>(new Date());
  const [checkOut, setCheckOut] = useState<Date>(addDays(new Date(), 1));
  const [destination, setDestination] = useState("all");
  const [guests, setGuests] = useState(2);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const translations = {
    ro: {
      arrival: "Check-in",
      departure: "Check-out",
      destination: "Destinație",
      guests: "Oaspeți",
      search: "Caută",
      checkAvailability: "Verifică disponibilitatea",
      guest: "oaspete",
      guestsPlural: "oaspeți",
    },
    en: {
      arrival: "Check-in",
      departure: "Check-out",
      destination: "Destination",
      guests: "Guests",
      search: "Search",
      checkAvailability: "Check availability",
      guest: "guest",
      guestsPlural: "guests",
    },
  };

  const t = translations[language] || translations.ro;

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("checkIn", format(checkIn, "yyyy-MM-dd"));
    params.set("checkOut", format(checkOut, "yyyy-MM-dd"));
    params.set("guests", guests.toString());
    if (destination !== "all") {
      params.set("location", destination);
    }
    navigate(`/oaspeti?${params.toString()}`);
  };

  const handleCheckInSelect = (date: Date | undefined) => {
    if (date) {
      setCheckIn(date);
      if (date >= checkOut) {
        setCheckOut(addDays(date, 1));
      }
      setCheckInOpen(false);
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (date) {
      setCheckOut(date);
      setCheckOutOpen(false);
    }
  };

  const isHero = variant === "hero";

  return (
    <div 
      className={cn(
        "rounded-2xl overflow-hidden",
        isHero 
          ? "bg-card/80 backdrop-blur-md border border-border/50 shadow-2xl" 
          : "bg-card border border-border shadow-lg"
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
        {/* Check-in */}
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-start px-4 py-4 hover:bg-primary/5 transition-colors text-left w-full">
              <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                {t.arrival}
              </span>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {format(checkIn, "d MMM yyyy", { locale: dateLocale })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {format(checkIn, "EEEE", { locale: dateLocale })}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={handleCheckInSelect}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Check-out */}
        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-start px-4 py-4 hover:bg-primary/5 transition-colors text-left w-full">
              <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                {t.departure}
              </span>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {format(checkOut, "d MMM yyyy", { locale: dateLocale })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {format(checkOut, "EEEE", { locale: dateLocale })}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={handleCheckOutSelect}
              disabled={(date) => date <= checkIn}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Destination */}
        <div className="flex flex-col items-start px-4 py-4">
          <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
            {t.destination}
          </span>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-full border-0 p-0 h-auto shadow-none focus:ring-0 bg-transparent">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {DESTINATIONS.map((dest) => (
                <SelectItem key={dest.value} value={dest.value}>
                  {language === "ro" ? dest.labelRo : dest.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Guests */}
        <div className="flex flex-col items-start px-4 py-4">
          <span className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
            {t.guests}
          </span>
          <Select value={guests.toString()} onValueChange={(v) => setGuests(parseInt(v))}>
            <SelectTrigger className="w-full border-0 p-0 h-auto shadow-none focus:ring-0 bg-transparent">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? t.guest : t.guestsPlural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div className="flex items-center justify-center p-3">
          <Button 
            onClick={handleSearch}
            className="w-full h-full min-h-[56px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">{t.checkAvailability}</span>
            <span className="sm:hidden">{t.search}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySearchWidget;
