import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  property_id: number;
  check_in: string;
  check_out: string;
  status: string;
}

type LiveLookupStatus = "live" | "unresolved";

interface AvailabilityCalendarProps {
  propertyId: number;
  propertySlug?: string;
  bookingUrl?: string;
  className?: string;
}

const AvailabilityCalendar = ({ propertyId, propertySlug, bookingUrl, className }: AvailabilityCalendarProps) => {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [liveUnavailableDates, setLiveUnavailableDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const startDate = formatDate(startOfMonth);
      const endDate = formatDate(endOfMonth);

      const fetchFallbackBookings = async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select("id, property_id, check_in, check_out, status")
          .eq("property_id", propertyId)
          .not("status", "eq", "cancelled")
          .lt("check_in", endDate)
          .gt("check_out", startDate)
          .order("check_in", { ascending: true });

        if (!error && data) {
          setBookings(data);
        } else {
          setBookings([]);
        }

        setLiveUnavailableDates(new Set());
      };

      if (bookingUrl) {
        const slugKey = propertySlug || String(propertyId);
        const { data, error } = await supabase.functions.invoke("live-property-availability", {
          body: {
            checkIn: startDate,
            checkOut: endDate,
            includeUnavailableDates: true,
            properties: [{
              slug: slugKey,
              bookingUrl,
            }],
          },
        });

        const lookupStatus = data?.lookupStatusBySlug?.[slugKey] as LiveLookupStatus | undefined;

        if (!error && lookupStatus === "live") {
          const dates = data?.unavailableDatesBySlug?.[slugKey];
          setLiveUnavailableDates(Array.isArray(dates) ? new Set(dates) : new Set());
          setBookings([]);
        } else {
          await fetchFallbackBookings();
        }

        setIsLoading(false);
        return;
      }

      await fetchFallbackBookings();
      setIsLoading(false);
    };

    fetchAvailability();
  }, [propertyId, propertySlug, bookingUrl, currentDate]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    let startDay = firstDayOfMonth.getDay();
    // Adjust for Monday start
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    const days: { date: Date; isCurrentMonth: boolean; isBooked: boolean; isCheckIn: boolean; isCheckOut: boolean }[] = [];
    
    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isBooked: false, isCheckIn: false, isCheckOut: false });
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
        const dateStr = formatDate(date);
      
        let isBooked = liveUnavailableDates.has(dateStr);
      let isCheckIn = false;
      let isCheckOut = false;
      
        if (!bookingUrl) {
          for (const booking of bookings) {
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            
            if (dateStr === booking.check_in) {
              isCheckIn = true;
              isBooked = true;
            } else if (dateStr === booking.check_out) {
              isCheckOut = true;
            } else if (date > checkIn && date < checkOut) {
              isBooked = true;
            }
        }
      }
      
      days.push({ date, isCurrentMonth: true, isBooked, isCheckIn, isCheckOut });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isBooked: false, isCheckIn: false, isCheckOut: false });
    }
    
    return days;
  }, [currentDate, bookings, liveUnavailableDates, bookingUrl]);

  const monthNames = language === 'ro' 
    ? ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = language === 'ro'
    ? ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn("relative bg-card border border-border rounded-2xl p-6", className)}>
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-serif font-semibold text-foreground">
          {language === 'ro' ? 'Disponibilitate' : 'Availability'}
        </h3>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Luna anterioară">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-foreground">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Luna următoare">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const isPast = day.date < today;
          const isToday = day.date.toDateString() === today.toDateString();
          
          return (
            <div
              key={index}
              className={cn(
                "aspect-square flex items-center justify-center text-sm rounded-lg transition-colors relative",
                !day.isCurrentMonth && "text-muted-foreground/30",
                day.isCurrentMonth && !day.isBooked && !isPast && "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-soft))]/80",
                day.isCurrentMonth && day.isBooked && "bg-destructive/15 text-destructive",
                day.isCurrentMonth && day.isCheckIn && "ring-1 ring-destructive/30",
                day.isCurrentMonth && day.isCheckOut && "ring-1 ring-destructive/20",
                isPast && day.isCurrentMonth && "text-muted-foreground/50",
                isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background font-bold"
              )}
            >
              {day.date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-border bg-[hsl(var(--success-soft))]" />
          <span className="text-muted-foreground">
            {language === 'ro' ? 'Disponibil' : 'Available'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/15" />
          <span className="text-muted-foreground">
            {language === 'ro' ? 'Ocupat' : 'Booked'}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-2xl">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
