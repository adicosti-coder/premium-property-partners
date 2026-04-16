import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, TrendingUp, Home, Users, Percent, BarChart3, RefreshCw, Star, FileSearch, MessageSquare, Phone, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface Booking {
  id: string;
  property_id: number;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  status: string;
  source: string | null;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminDashboard = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === 'ro' ? ro : enUS;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncingReviews, setSyncingReviews] = useState(false);
  const [syncingDetails, setSyncingDetails] = useState(false);

  // 🔥 Hot prospects: status=new + lead_score>80 (eligibili pentru auto-dial AI)
  const { data: hotProspects } = useQuery({
    queryKey: ["admin-dashboard-hot-prospects"],
    queryFn: async () => {
      const [hotRes, callingRes, interestedRes] = await Promise.all([
        supabase.from("prospect_listings").select("*", { count: "exact", head: true })
          .eq("lifecycle_status", "new").gt("lead_score", 80),
        supabase.from("prospect_listings").select("*", { count: "exact", head: true })
          .eq("lifecycle_status", "calling"),
        supabase.from("prospect_listings").select("*", { count: "exact", head: true })
          .eq("lifecycle_status", "interested"),
      ]);
      return {
        hot: hotRes.count ?? 0,
        calling: callingRes.count ?? 0,
        interested: interestedRes.count ?? 0,
      };
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [bookingsRes, propertiesRes] = await Promise.all([
          supabase.from("bookings").select("*").order("check_in", { ascending: false }),
          supabase.from("properties").select("id, name"),
        ]);

        if (bookingsRes.data) setBookings(bookingsRes.data);
        if (propertiesRes.data) setProperties(propertiesRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    
    // Bookings this month
    const thisMonthBookings = bookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      return isWithinInterval(checkIn, thisMonth);
    }).length;

    // Total nights booked (all time)
    const totalNights = bookings.reduce((acc, b) => {
      const nights = differenceInDays(parseISO(b.check_out), parseISO(b.check_in));
      return acc + Math.max(0, nights);
    }, 0);

    // Average stay duration
    const avgStay = totalBookings > 0 ? (totalNights / totalBookings).toFixed(1) : 0;

    // Occupancy rate for current month (simplified calculation)
    const daysInMonth = differenceInDays(thisMonth.end, thisMonth.start) + 1;
    const totalPossibleNights = properties.length * daysInMonth;
    const thisMonthNights = bookings.reduce((acc, b) => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      
      // Check if booking overlaps with this month
      const overlapStart = checkIn < thisMonth.start ? thisMonth.start : checkIn;
      const overlapEnd = checkOut > thisMonth.end ? thisMonth.end : checkOut;
      
      if (overlapStart <= overlapEnd) {
        return acc + differenceInDays(overlapEnd, overlapStart);
      }
      return acc;
    }, 0);
    
    const occupancyRate = totalPossibleNights > 0 
      ? Math.round((thisMonthNights / totalPossibleNights) * 100) 
      : 0;

    return {
      totalBookings,
      confirmedBookings,
      thisMonthBookings,
      totalNights,
      avgStay,
      occupancyRate,
      propertiesCount: properties.length,
    };
  }, [bookings, properties]);

  // Monthly bookings chart data
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const count = bookings.filter(b => {
        const checkIn = parseISO(b.check_in);
        return isWithinInterval(checkIn, { start: monthStart, end: monthEnd });
      }).length;

      return {
        month: format(month, 'MMM', { locale: dateLocale }),
        bookings: count,
      };
    });
  }, [bookings, dateLocale]);

  // Bookings by source
  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    bookings.forEach(b => {
      const source = b.source || 'direct';
      sources[source] = (sources[source] || 0) + 1;
    });

    return Object.entries(sources).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [bookings]);

  // Bookings by property
  const propertyData = useMemo(() => {
    const propertyBookings: Record<string, number> = {};
    bookings.forEach(b => {
      const propId = String(b.property_id);
      propertyBookings[propId] = (propertyBookings[propId] || 0) + 1;
    });

    return Object.entries(propertyBookings)
      .map(([propId, count]) => {
        const property = properties.find(p => String(p.id) === propId);
        return {
          name: property?.name || `Property ${propId}`,
          bookings: count,
        };
      })
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [bookings, properties]);

  // Occupancy trend (last 6 months)
  const occupancyTrend = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      const totalPossibleNights = properties.length * daysInMonth;

      const monthNights = bookings.reduce((acc, b) => {
        const checkIn = parseISO(b.check_in);
        const checkOut = parseISO(b.check_out);
        
        const overlapStart = checkIn < monthStart ? monthStart : checkIn;
        const overlapEnd = checkOut > monthEnd ? monthEnd : checkOut;
        
        if (overlapStart <= overlapEnd) {
          return acc + differenceInDays(overlapEnd, overlapStart);
        }
        return acc;
      }, 0);

      const rate = totalPossibleNights > 0 
        ? Math.round((monthNights / totalPossibleNights) * 100) 
        : 0;

      return {
        month: format(month, 'MMM', { locale: dateLocale }),
        occupancy: rate,
      };
    });
  }, [bookings, properties, dateLocale]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const translations = {
    ro: {
      title: "Dashboard",
      totalBookings: "Total rezervări",
      thisMonth: "Luna aceasta",
      avgStay: "Durată medie",
      nights: "nopți",
      occupancy: "Rată ocupare",
      monthlyTrend: "Tendință lunară rezervări",
      bookingsBySource: "Rezervări pe sursă",
      topProperties: "Top proprietăți",
      occupancyTrend: "Evoluție ocupare",
      properties: "proprietăți",
    },
    en: {
      title: "Dashboard",
      totalBookings: "Total Bookings",
      thisMonth: "This Month",
      avgStay: "Avg. Stay",
      nights: "nights",
      occupancy: "Occupancy Rate",
      monthlyTrend: "Monthly Booking Trend",
      bookingsBySource: "Bookings by Source",
      topProperties: "Top Properties",
      occupancyTrend: "Occupancy Trend",
      properties: "properties",
    },
  };

  const tr = translations[language] || translations.en;


  const handleSync = async (fnName: string, setter: (v: boolean) => void, label: string) => {
    setter(true);
    try {
      // Fetch all property slugs to process one-by-one (avoids Edge Function timeout)
      const { data: liveData, error: fetchErr } = await supabase
        .from('property_live_data')
        .select('property_slug');
      if (fetchErr) throw fetchErr;

      const slugs = (liveData || []).map((d: any) => d.property_slug).filter(Boolean);
      let successCount = 0;
      let errorCount = 0;

      for (const slug of slugs) {
        try {
          toast({ title: `⏳ ${label}`, description: `Sincronizare ${slug}...` });
          const { data, error } = await supabase.functions.invoke(fnName, {
            body: { property_slug: slug },
          });
          if (error) throw error;
          successCount++;
        } catch (err: any) {
          console.error(`Sync ${fnName} failed for ${slug}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast({ title: `✅ ${label}`, description: `${successCount} proprietăți sincronizate cu succes.` });
      } else {
        toast({ title: `⚠️ ${label}`, description: `${successCount} OK, ${errorCount} erori.`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: `❌ Eroare ${label}`, description: err.message, variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="w-5 h-5 text-primary" />
            {language === 'ro' ? 'Sincronizare Date' : 'Data Sync'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'ro'
              ? 'Declanșează manual sincronizarea datelor fără a aștepta cron-ul automat.'
              : 'Manually trigger data sync without waiting for the automatic cron.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={syncingPrices}
              onClick={() => handleSync('scrape-property-data', setSyncingPrices, 'Prețuri & Rating')}
            >
              {syncingPrices ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}
              {language === 'ro' ? 'Sync Prețuri & Rating' : 'Sync Prices & Rating'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={syncingReviews}
              onClick={() => handleSync('scrape-booking-reviews', setSyncingReviews, 'Recenzii')}
            >
              {syncingReviews ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
              {language === 'ro' ? 'Sync Recenzii' : 'Sync Reviews'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={syncingDetails}
              onClick={() => handleSync('scrape-property-details', setSyncingDetails, 'Detalii Proprietăți')}
            >
              {syncingDetails ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSearch className="w-4 h-4 mr-2" />}
              {language === 'ro' ? 'Sync Detalii' : 'Sync Details'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.totalBookings}
                </p>
                <p className="text-sm text-muted-foreground">{tr.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-2/10">
                <TrendingUp className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.thisMonthBookings}
                </p>
                <p className="text-sm text-muted-foreground">{tr.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-3/10">
                <Users className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.avgStay} {tr.nights}
                </p>
                <p className="text-sm text-muted-foreground">{tr.avgStay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-4/10">
                <Percent className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.occupancyRate}%
                </p>
                <p className="text-sm text-muted-foreground">{tr.occupancy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              {tr.monthlyTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bookings by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="w-5 h-5 text-primary" />
              {tr.bookingsBySource}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="w-5 h-5 text-primary" />
              {tr.occupancyTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value}%`, tr.occupancy]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="occupancy" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="w-5 h-5 text-primary" />
              {tr.topProperties}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground" 
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="bookings" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
