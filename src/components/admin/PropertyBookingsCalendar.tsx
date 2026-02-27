import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  getDay,
  startOfWeek,
} from "date-fns";
import { ro } from "date-fns/locale";

interface Booking {
  id: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  status: string;
  source: string | null;
}

interface Props {
  propertyId: string;
  propertyName: string;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-700 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  cancelled: "bg-red-500/20 text-red-700 border-red-500/30",
};

export default function PropertyBookingsCalendar({ propertyId, propertyName }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guest_name: "",
    check_in: "",
    check_out: "",
    source: "direct",
  });

  const fetchBookings = async () => {
    setIsLoading(true);
    // bookings table uses integer property_id, but we need to match by property name or find the mapping
    // For now, fetch all bookings and filter - ideally we'd have a UUID reference
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("check_in", { ascending: true });

    if (!error && data) {
      setBookings(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [propertyId]);

  const handleAddBooking = async () => {
    if (!newBooking.check_in || !newBooking.check_out) {
      toast({ title: "Completează datele de check-in și check-out", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("bookings").insert({
      property_id: 1, // TODO: map UUID to integer
      guest_name: newBooking.guest_name || null,
      check_in: newBooking.check_in,
      check_out: newBooking.check_out,
      source: newBooking.source,
      status: "confirmed",
    });

    if (error) {
      toast({ title: "Eroare la salvare", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rezervare adăugată!" });
      setNewBooking({ guest_name: "", check_in: "", check_out: "", source: "direct" });
      setIsAddOpen(false);
      fetchBookings();
    }
    setIsSaving(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to Monday
  const firstDayOfWeek = getDay(monthStart);
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => {
      try {
        const checkIn = parseISO(b.check_in);
        const checkOut = parseISO(b.check_out);
        return isWithinInterval(day, { start: checkIn, end: checkOut });
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Calendar Rezervări</h4>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Adaugă
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h5 className="font-medium text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ro })}
        </h5>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding for start of month */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="h-10" />
            ))}

            {days.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const hasBooking = dayBookings.length > 0;
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={`h-10 rounded-md flex flex-col items-center justify-center text-xs relative
                    ${isToday ? "ring-2 ring-primary" : ""}
                    ${hasBooking ? "bg-green-500/15 text-green-700 font-semibold" : "bg-card text-foreground"}
                    border border-border/50
                  `}
                  title={dayBookings.map((b) => b.guest_name || "Rezervare").join(", ")}
                >
                  {format(day, "d")}
                  {hasBooking && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bookings list for this month */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h5 className="text-sm font-medium text-foreground">Rezervări luna aceasta</h5>
            {bookings
              .filter((b) => {
                try {
                  const checkIn = parseISO(b.check_in);
                  return isSameMonth(checkIn, currentMonth);
                } catch {
                  return false;
                }
              })
              .map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                    statusColors[b.status] || "bg-card border-border"
                  }`}
                >
                  <div>
                    <span className="font-medium">{b.guest_name || "—"}</span>
                    <span className="text-xs ml-2 opacity-70">
                      {format(parseISO(b.check_in), "dd MMM")} – {format(parseISO(b.check_out), "dd MMM")}
                    </span>
                  </div>
                  <span className="text-xs uppercase">{b.source || "direct"}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Add booking dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adaugă Rezervare – {propertyName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nume oaspete</Label>
              <Input
                value={newBooking.guest_name}
                onChange={(e) => setNewBooking({ ...newBooking, guest_name: e.target.value })}
                placeholder="Nume oaspete"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  value={newBooking.check_in}
                  onChange={(e) => setNewBooking({ ...newBooking, check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={newBooking.check_out}
                  onChange={(e) => setNewBooking({ ...newBooking, check_out: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sursă</Label>
              <select
                value={newBooking.source}
                onChange={(e) => setNewBooking({ ...newBooking, source: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="direct">Direct</option>
                <option value="booking.com">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="other">Altele</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Anulează</Button>
            <Button onClick={handleAddBooking} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
