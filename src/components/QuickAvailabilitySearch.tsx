import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, addDays, differenceInDays } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Users, 
  Search, 
  MapPin,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickAvailabilitySearchProps {
  className?: string;
  variant?: 'default' | 'compact' | 'hero';
}

const QuickAvailabilitySearch: React.FC<QuickAvailabilitySearchProps> = ({ 
  className,
  variant = 'default'
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState<string>('2');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const locale = language === 'ro' ? ro : enUS;

  const content = {
    ro: {
      title: 'Verifică Disponibilitatea',
      subtitle: 'Găsește apartamentul perfect pentru sejurul tău',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guests: 'Oaspeți',
      guestLabel: 'oaspete',
      guestsLabel: 'oaspeți',
      search: 'Caută Disponibilitate',
      selectDate: 'Selectează data',
      nights: 'nopți',
      night: 'noapte',
      bestPrice: 'Cel mai bun preț garantat',
      instantConfirm: 'Confirmare instantanee',
    },
    en: {
      title: 'Check Availability',
      subtitle: 'Find the perfect apartment for your stay',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      guests: 'Guests',
      guestLabel: 'guest',
      guestsLabel: 'guests',
      search: 'Search Availability',
      selectDate: 'Select date',
      nights: 'nights',
      night: 'night',
      bestPrice: 'Best price guaranteed',
      instantConfirm: 'Instant confirmation',
    }
  };

  const t = content[language as keyof typeof content] || content.ro;

  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckIn(date);
    setIsCheckInOpen(false);
    if (date && (!checkOut || checkOut <= date)) {
      setCheckOut(addDays(date, 1));
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOut(date);
    setIsCheckOutOpen(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', format(checkIn, 'yyyy-MM-dd'));
    if (checkOut) params.set('checkOut', format(checkOut, 'yyyy-MM-dd'));
    params.set('guests', guests);
    
    navigate(`/oaspeti?${params.toString()}`);
  };

  const nightsCount = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  if (variant === 'compact') {
    return (
      <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Check-in */}
          <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !checkIn && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, "dd MMM", { locale }) : t.checkIn}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={handleCheckInSelect}
                disabled={(date) => date < new Date()}
                initialFocus
                locale={locale}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Check-out */}
          <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !checkOut && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, "dd MMM", { locale }) : t.checkOut}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={handleCheckOutSelect}
                disabled={(date) => date < (checkIn ? addDays(checkIn, 1) : new Date())}
                initialFocus
                locale={locale}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Guests */}
          <Select value={guests} onValueChange={setGuests}>
            <SelectTrigger className="flex-1">
              <Users className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? t.guestLabel : t.guestsLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Button */}
          <Button onClick={handleSearch} className="flex-shrink-0">
            <Search className="w-4 h-4 mr-2" />
            {t.search}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-card rounded-2xl border border-border shadow-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              {t.title}
            </h3>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          {nightsCount > 0 && (
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{nightsCount}</span>
              <span className="text-sm text-muted-foreground ml-1">
                {nightsCount === 1 ? t.night : t.nights}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Check-in */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {t.checkIn}
            </label>
            <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !checkIn && "text-muted-foreground"
                  )}
                >
                  {checkIn ? (
                    <span className="flex flex-col items-start">
                      <span className="text-foreground font-medium">
                        {format(checkIn, "EEEE", { locale })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(checkIn, "d MMMM yyyy", { locale })}
                      </span>
                    </span>
                  ) : (
                    t.selectDate
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={handleCheckInSelect}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  locale={locale}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {t.checkOut}
            </label>
            <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !checkOut && "text-muted-foreground"
                  )}
                >
                  {checkOut ? (
                    <span className="flex flex-col items-start">
                      <span className="text-foreground font-medium">
                        {format(checkOut, "EEEE", { locale })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(checkOut, "d MMMM yyyy", { locale })}
                      </span>
                    </span>
                  ) : (
                    t.selectDate
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={handleCheckOutSelect}
                  disabled={(date) => date < (checkIn ? addDays(checkIn, 1) : new Date())}
                  initialFocus
                  locale={locale}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {t.guests}
            </label>
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger className="w-full h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {num} {num === 1 ? t.guestLabel : t.guestsLabel}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch} 
          size="lg" 
          className="w-full group"
        >
          <Search className="w-5 h-5 mr-2" />
          {t.search}
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{t.bestPrice}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{t.instantConfirm}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickAvailabilitySearch;
