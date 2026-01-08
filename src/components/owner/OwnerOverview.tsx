import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Calendar, 
  Star, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface OwnerOverviewProps {
  propertyId: string;
}

const OwnerOverview = ({ propertyId }: OwnerOverviewProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      netIncome: "Venit Net Luna Curentă",
      occupancy: "Grad de Ocupare",
      rating: "Rating Mediu",
      nextPayment: "Următoarea Plată",
      recentBookings: "Rezervări Recente",
      noBookings: "Nicio rezervare în această lună",
      pending: "În așteptare",
      confirmed: "Confirmat",
      upcoming: "Viitoare",
      current: "În desfășurare",
      fromMonth: "față de luna trecută",
    },
    en: {
      netIncome: "Current Month Net Income",
      occupancy: "Occupancy Rate",
      rating: "Average Rating",
      nextPayment: "Next Payment",
      recentBookings: "Recent Bookings",
      noBookings: "No bookings this month",
      pending: "Pending",
      confirmed: "Confirmed",
      upcoming: "Upcoming",
      current: "In progress",
      fromMonth: "vs last month",
    },
  };

  const t = translations[language] || translations.ro;

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

  // Fetch bookings for the current month
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["owner-bookings", propertyId],
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

  // Fetch financial records for current month
  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: ["owner-financials", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("property_id", propertyId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
  });

  // Fetch next payment
  const { data: nextPayment, isLoading: paymentLoading } = useQuery({
    queryKey: ["owner-next-payment", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_payments")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .order("payment_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Calculate occupancy rate
  const occupiedDays = bookings?.reduce((total, booking) => {
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    
    // Calculate overlap with current month
    const overlapStart = checkIn < monthStart ? monthStart : checkIn;
    const overlapEnd = checkOut > monthEnd ? monthEnd : checkOut;
    
    if (overlapStart <= overlapEnd) {
      return total + differenceInDays(overlapEnd, overlapStart) + 1;
    }
    return total;
  }, 0) || 0;

  const occupancyRate = Math.round((occupiedDays / daysInMonth) * 100);

  // Calculate net income
  const income = financials?.filter(f => f.type === "income").reduce((sum, f) => sum + Number(f.amount), 0) || 0;
  const expenses = financials?.filter(f => f.type === "expense").reduce((sum, f) => sum + Number(f.amount), 0) || 0;
  const netIncome = income - expenses;

  const isLoading = bookingsLoading || financialsLoading || paymentLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net Income */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.netIncome}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {netIncome.toLocaleString()} €
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12% {t.fromMonth}</span>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.occupancy}
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {occupancyRate}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.rating}
            </CardTitle>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              4.98 <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <div className="flex gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Payment */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.nextPayment}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {nextPayment ? (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {Number(nextPayment.amount).toLocaleString()} €
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(nextPayment.payment_date), "d MMMM yyyy", { locale: dateLocale })}
                </p>
              </>
            ) : (
              <div className="text-lg text-muted-foreground">
                {t.pending}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>{t.recentBookings}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => {
                const checkIn = parseISO(booking.check_in);
                const checkOut = parseISO(booking.check_out);
                const today = new Date();
                const isCurrent = isWithinInterval(today, { start: checkIn, end: checkOut });
                const isUpcoming = checkIn > today;

                return (
                  <div 
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        isCurrent ? "bg-green-500" : isUpcoming ? "bg-blue-500" : "bg-muted-foreground"
                      }`} />
                      <div>
                        <p className="font-medium text-foreground">
                          {booking.guest_name || "Guest"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(checkIn, "d MMM", { locale: dateLocale })} - {format(checkOut, "d MMM", { locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.source === "direct" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>
                        {booking.source || "Direct"}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isCurrent 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : isUpcoming
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isCurrent ? t.current : isUpcoming ? t.upcoming : t.confirmed}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t.noBookings}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerOverview;
