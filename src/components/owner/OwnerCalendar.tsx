import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarOff, Lock, Unlock } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import type { DateRange } from "react-day-picker";

interface OwnerCalendarProps {
  propertyId: string;
}

const OwnerCalendar = ({ propertyId }: OwnerCalendarProps) => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [blockReason, setBlockReason] = useState("");

  const translations = {
    ro: {
      title: "Calendar Rezervări",
      subtitle: "Vizualizează și blochează date pentru uz personal",
      blockDates: "Blochează Date",
      blockTitle: "Blochează Perioada",
      blockDescription: "Marchează datele ca indisponibile pentru rezervări externe.",
      reason: "Motiv (opțional)",
      reasonPlaceholder: "Ex: Uz personal, Mentenanță...",
      cancel: "Anulează",
      confirm: "Confirmă",
      selectDates: "Selectează perioada",
      legend: "Legendă",
      booked: "Rezervat",
      blocked: "Blocat (personal)",
      available: "Disponibil",
      bookingSource: "Sursa",
      guestName: "Oaspete",
      blockSuccess: "Perioada a fost blocată cu succes!",
      blockError: "Eroare la blocarea perioadei.",
    },
    en: {
      title: "Booking Calendar",
      subtitle: "View and block dates for personal use",
      blockDates: "Block Dates",
      blockTitle: "Block Period",
      blockDescription: "Mark dates as unavailable for external bookings.",
      reason: "Reason (optional)",
      reasonPlaceholder: "Ex: Personal use, Maintenance...",
      cancel: "Cancel",
      confirm: "Confirm",
      selectDates: "Select period",
      legend: "Legend",
      booked: "Booked",
      blocked: "Blocked (personal)",
      available: "Available",
      bookingSource: "Source",
      guestName: "Guest",
      blockSuccess: "Period has been blocked successfully!",
      blockError: "Error blocking the period.",
    },
  };

  const t = translations[language] || translations.ro;

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(addMonths(selectedMonth, 2));

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["owner-calendar-bookings", propertyId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("property_id", parseInt(propertyId) || 0)
        .gte("check_out", monthStart.toISOString())
        .lte("check_in", monthEnd.toISOString())
        .order("check_in", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const blockDatesMutation = useMutation({
    mutationFn: async ({ from, to }: { from: Date; to: Date }) => {
      const { error } = await supabase.from("bookings").insert({
        property_id: parseInt(propertyId) || 0,
        check_in: format(from, "yyyy-MM-dd"),
        check_out: format(to, "yyyy-MM-dd"),
        status: "blocked",
        source: "owner",
        guest_name: blockReason || "Owner Block",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-calendar-bookings"] });
      toast({ title: t.blockSuccess });
      setBlockDialogOpen(false);
      setDateRange(undefined);
      setBlockReason("");
    },
    onError: () => {
      toast({ title: t.blockError, variant: "destructive" });
    },
  });

  const handleBlockDates = () => {
    if (dateRange?.from && dateRange?.to) {
      blockDatesMutation.mutate({ from: dateRange.from, to: dateRange.to });
    }
  };

  // Create a map of booked/blocked dates
  const bookedDates: { date: Date; type: string; booking: any }[] = [];
  bookings?.forEach((booking) => {
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    let current = new Date(checkIn);
    
    while (current <= checkOut) {
      bookedDates.push({
        date: new Date(current),
        type: booking.status === "blocked" ? "blocked" : "booked",
        booking,
      });
      current.setDate(current.getDate() + 1);
    }
  });

  const isDateBooked = (date: Date) => {
    return bookedDates.find(
      (bd) => format(bd.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
          <Button onClick={() => setBlockDialogOpen(true)}>
            <Lock className="w-4 h-4 mr-2" />
            {t.blockDates}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Calendar */}
            <div className="flex-1">
              <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                locale={dateLocale}
                numberOfMonths={2}
                className="rounded-md border"
                modifiers={{
                  booked: bookedDates
                    .filter((bd) => bd.type === "booked")
                    .map((bd) => bd.date),
                  blocked: bookedDates
                    .filter((bd) => bd.type === "blocked")
                    .map((bd) => bd.date),
                }}
                modifiersStyles={{
                  booked: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "white",
                    borderRadius: "0",
                  },
                  blocked: {
                    backgroundColor: "hsl(var(--destructive))",
                    color: "white",
                    borderRadius: "0",
                  },
                }}
              />
            </div>

            {/* Legend & Bookings List */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Legend */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">{t.legend}</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary" />
                    <span className="text-sm">{t.booked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive" />
                    <span className="text-sm">{t.blocked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" />
                    <span className="text-sm">{t.available}</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="space-y-3">
                {bookings?.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className={`p-3 rounded-lg border ${
                      booking.status === "blocked"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {booking.status === "blocked" ? (
                        <Lock className="w-4 h-4 text-destructive" />
                      ) : (
                        <Unlock className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-medium text-sm">
                        {booking.guest_name || "Guest"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(booking.check_in), "d MMM", { locale: dateLocale })} -{" "}
                      {format(parseISO(booking.check_out), "d MMM yyyy", { locale: dateLocale })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.bookingSource}: {booking.source || "Direct"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Dates Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.blockTitle}</DialogTitle>
            <DialogDescription>{t.blockDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.selectDates}</Label>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={dateLocale}
                numberOfMonths={1}
                className="rounded-md border"
                disabled={(date) => {
                  const booked = isDateBooked(date);
                  return !!booked || date < new Date();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t.reason}</Label>
              <Input
                id="reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleBlockDates}
              disabled={!dateRange?.from || !dateRange?.to || blockDatesMutation.isPending}
            >
              <CalendarOff className="w-4 h-4 mr-2" />
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerCalendar;
