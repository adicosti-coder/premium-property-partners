import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, TrendingUp, Home, Users, Percent, BarChart3, RefreshCw, Star, FileSearch, MessageSquare, Phone, Flame, ClipboardList, ArrowRight, Copy, Check, ArrowDownUp, Building2, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GooglePerformanceWidget from "./GooglePerformanceWidget";
import SeoAutomationWidget from "./SeoAutomationWidget";
import { toast } from "@/hooks/use-toast";
import { MarkAsAgencyButton } from "@/components/admin/MarkAsAgencyButton";
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

interface ProspectContact {
  id: string;
  title: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  source_platform: string;
  source_url: string | null;
  lifecycle_status: string;
  lead_score: number | null;
  scraped_at: string | null;
  prospect_type: string | null;
  is_active: boolean | null;
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

  const { data: prospectContacts = [] } = useQuery({
    queryKey: ["admin-dashboard-prospect-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id,title,contact_name,contact_phone,phone_normalized,source_platform,source_url,lifecycle_status,lead_score,scraped_at,prospect_type,is_active")
        .or("is_active.eq.true,prospect_type.eq.agentie")
        .or("contact_phone.not.is.null,phone_normalized.not.is.null")
        .order("scraped_at", { ascending: false, nullsFirst: false })
        .limit(150);

      if (error) throw error;
      return (data || []) as ProspectContact[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const { data: listingOps } = useQuery({
    queryKey: ["admin-dashboard-listing-ops"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [draftsRes, activeSalesRes, activeRentalsRes, hotRes, reviewRes, staleDraftsRes, newProspectsRes] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", false),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", true).eq("listing_type", "vanzare"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", true).eq("listing_type", "inchiriere"),
        supabase.from("prospect_listings").select("*", { count: "exact", head: true }).eq("is_active", true).gt("lead_score", 80),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", false).contains("features", ["necesită-verificare"]),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_active", false).lt("created_at", sevenDaysAgo),
        supabase.from("prospect_listings").select("*", { count: "exact", head: true }).eq("is_active", true).eq("lifecycle_status", "new"),
      ]);
      return {
        drafts: draftsRes.count ?? 0,
        sales: activeSalesRes.count ?? 0,
        rentals: activeRentalsRes.count ?? 0,
        hotProspects: hotRes.count ?? 0,
        needsReview: reviewRes.count ?? 0,
        staleDrafts: staleDraftsRes.count ?? 0,
        newProspects: newProspectsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="w-5 h-5 text-primary" />
            Gestionare listări — scurtături rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate("/admin/properties")}>
            <div className="text-left">
              <div className="font-semibold">Drafturi</div>
              <div className="text-2xl font-bold text-primary">{listingOps?.drafts ?? 0}</div>
              <div className="text-xs text-muted-foreground">verifică și publică</div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate("/scraper-leads")}>
            <div className="text-left">
              <div className="font-semibold">Oportunități AI</div>
              <div className="text-2xl font-bold text-primary">{listingOps?.hotProspects ?? 0}</div>
              <div className="text-xs text-muted-foreground">scor peste 80</div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate("/admin/properties") }>
            <div className="text-left">
              <div className="font-semibold">Vânzări active</div>
              <div className="text-2xl font-bold text-primary">{listingOps?.sales ?? 0}</div>
              <div className="text-xs text-muted-foreground">portofoliu public</div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto justify-start p-4" onClick={() => navigate("/admin/properties") }>
            <div className="text-left">
              <div className="font-semibold">Închirieri active</div>
              <div className="text-2xl font-bold text-primary">{listingOps?.rentals ?? 0}</div>
              <div className="text-xs text-muted-foreground">listări lunare</div>
            </div>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5 text-primary" />
            Priorități operaționale
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Drafturi de verificat", value: listingOps?.needsReview ?? 0, hint: "importate automat", action: () => navigate("/admin?tab=properties") },
            { label: "Drafturi vechi", value: listingOps?.staleDrafts ?? 0, hint: "peste 7 zile", action: () => navigate("/admin?tab=properties") },
            { label: "Prospecți noi", value: listingOps?.newProspects ?? 0, hint: "neprelucrați", action: () => navigate("/scraper-leads") },
          ].map((item) => (
            <button key={item.label} onClick={item.action} className="rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-bold text-primary">{item.value}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 🔥 Hot Prospects AI - Quick Access Card */}
      <Card className="border-2 border-destructive/30 bg-gradient-to-r from-destructive/5 via-amber-500/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10 relative">
                <Flame className="w-6 h-6 text-destructive" />
                {(hotProspects?.hot ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Prospect Listings — Oportunități AI
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-destructive text-base">{hotProspects?.hot ?? 0}</span> prospecți fierbinți (score &gt; 80, status = new) ·{" "}
                  <span className="font-medium text-amber-600 dark:text-amber-400">{hotProspects?.calling ?? 0}</span> în apelare ·{" "}
                  <span className="font-medium text-green-600 dark:text-green-400">{hotProspects?.interested ?? 0}</span> interesați
                </p>
              </div>
            </div>
            <Button
              size="lg"
              variant={hotProspects?.hot ? "destructive" : "outline"}
              onClick={() => navigate("/admin/prospect-listings")}
              className="w-full sm:w-auto"
            >
              <Phone className="w-4 h-4 mr-2" />
              {language === "ro" ? "Deschide Prospect Listings" : "Open Prospect Listings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProspectContactsCard prospects={prospectContacts} />


      {/* Google Search Console */}
      <GooglePerformanceWidget />

      {/* Automatizare SEO end-to-end */}
      <SeoAutomationWidget />

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

type SortOrder = "newest" | "oldest";

function ProspectContactsCard({ prospects }: { prospects: ProspectContact[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAgencies, setShowAgencies] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const agencyCount = useMemo(
    () => prospects.filter((p) => p.prospect_type === "agentie").length,
    [prospects],
  );

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toTs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;
    const list = prospects.filter((p) => {
      if (hiddenIds.has(p.id)) return false;
      const isAgency = p.prospect_type === "agentie";
      if (showAgencies) {
        if (!isAgency) return false;
      } else {
        if (isAgency) return false;
        if (p.is_active === false) return false;
      }
      if (!p.scraped_at) return !fromTs && !toTs;
      const ts = new Date(p.scraped_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
    list.sort((a, b) => {
      const ta = a.scraped_at ? new Date(a.scraped_at).getTime() : 0;
      const tb = b.scraped_at ? new Date(b.scraped_at).getTime() : 0;
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [prospects, sortOrder, fromDate, toDate, showAgencies, hiddenIds]);

  const hideOptimistic = (id: string) =>
    setHiddenIds((cur) => {
      const next = new Set(cur);
      next.add(id);
      return next;
    });
  const restoreOptimistic = (id: string) =>
    setHiddenIds((cur) => {
      if (!cur.has(id)) return cur;
      const next = new Set(cur);
      next.delete(id);
      return next;
    });

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: "Link copiat", description: "URL-ul anunțului a fost copiat în clipboard." });
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      toast({ title: "Eroare", description: "Nu am putut copia link-ul.", variant: "destructive" });
    }
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSortOrder("newest");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="w-5 h-5 text-primary" />
          Contacte din anunțuri
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {filtered.length} / {prospects.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar: sort + date range */}
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sortare</label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="h-9 w-[170px]">
                <ArrowDownUp className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Cele mai noi</SelectItem>
                <SelectItem value="oldest">Cele mai vechi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">De la</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Până la</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          {(fromDate || toDate || sortOrder !== "newest") && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
              Resetează
            </Button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((prospect) => {
              const phone = prospect.contact_phone || prospect.phone_normalized;
              const isCopied = copiedId === prospect.id;
              return (
                <div key={prospect.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {prospect.contact_name || "Contact nespecificat"}
                      </p>
                      {prospect.source_url ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <a
                            href={prospect.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate"
                            title={prospect.title || prospect.source_url}
                          >
                            {prospect.title || "Vezi anunț"} ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(prospect.id, prospect.source_url!)}
                            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label="Copiază link-ul anunțului"
                            title="Copiază link-ul anunțului"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {prospect.title || "Anunț fără titlu"}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {prospect.source_platform}
                    </span>
                  </div>
                  {phone && (
                    <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      <Phone className="w-4 h-4" />
                      {phone}
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Status: {prospect.lifecycle_status}</span>
                    <span>·</span>
                    <span>Scor: {prospect.lead_score ?? "—"}</span>
                    {prospect.scraped_at && (
                      <>
                        <span>·</span>
                        <span title={new Date(prospect.scraped_at).toLocaleString("ro-RO")}>
                          📅 {new Date(prospect.scraped_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <MarkAsAgencyButton
                      id={prospect.id}
                      source="prospect_listings"
                      rawPhone={prospect.contact_phone}
                      phone={prospect.phone_normalized}
                      url={prospect.source_url}
                      contextLabel={`Dashboard · ${prospect.title?.slice(0, 60) || prospect.id}`}
                      invalidateKeys={[["admin-dashboard-prospect-contacts"]]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {prospects.length === 0
              ? "Nu există încă anunțuri active cu număr de contact."
              : "Niciun contact pentru filtrele selectate."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;

