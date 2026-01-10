import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Building, Users, Calendar, TrendingUp, Star, Euro, UserCheck } from "lucide-react";

interface Stats {
  properties: number;
  bookings: number;
  leads: number;
  occupancy: number;
  avgRating: number;
  monthlyRevenue: number;
  totalGuests: number;
}

const QuickStatsBar = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    properties: 0,
    bookings: 0,
    leads: 0,
    occupancy: 85,
    avgRating: 4.8,
    monthlyRevenue: 0,
    totalGuests: 0,
  });
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const translations = {
    ro: {
      properties: "Apartamente",
      bookings: "Rezervări",
      leads: "Solicitări",
      occupancy: "Ocupare",
      rating: "Rating",
      revenue: "Venit lunar",
      guests: "Oaspeți",
    },
    en: {
      properties: "Apartments",
      bookings: "Bookings",
      leads: "Inquiries",
      occupancy: "Occupancy",
      rating: "Rating",
      revenue: "Monthly Rev",
      guests: "Guests",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.ro;

  // Fetch stats from database
  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [propertiesRes, bookingsRes, leadsRes, financialsRes, guestsRes] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("bookings").select("id", { count: "exact" }),
        supabase.from("leads").select("id", { count: "exact" }),
        supabase.from("financial_records")
          .select("amount, type")
          .gte("date", startOfMonth)
          .lte("date", endOfMonth),
        supabase.from("bookings")
          .select("guest_name", { count: "exact" })
          .not("guest_name", "is", null),
      ]);

      // Calculate monthly revenue (income - expenses)
      let monthlyRevenue = 0;
      if (financialsRes.data) {
        financialsRes.data.forEach((record) => {
          if (record.type === "income") {
            monthlyRevenue += Number(record.amount);
          } else if (record.type === "expense") {
            monthlyRevenue -= Number(record.amount);
          }
        });
      }

      setStats({
        properties: propertiesRes.count || 11,
        bookings: bookingsRes.count || 0,
        leads: leadsRes.count || 0,
        occupancy: 85,
        avgRating: 4.8, // Static for now - could be fetched from reviews table
        monthlyRevenue: Math.max(0, monthlyRevenue),
        totalGuests: guestsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates
    const propertiesChannel = supabase
      .channel("quick-stats-properties")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, fetchStats)
      .subscribe();

    const bookingsChannel = supabase
      .channel("quick-stats-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, fetchStats)
      .subscribe();

    const leadsChannel = supabase
      .channel("quick-stats-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, fetchStats)
      .subscribe();

    const financialsChannel = supabase
      .channel("quick-stats-financials")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_records" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(propertiesChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(financialsChannel);
    };
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const formatRevenue = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toString();
  };

  const statItems = [
    {
      icon: Building,
      value: stats.properties || 11,
      label: t.properties,
      suffix: "+",
      color: "text-emerald-500",
    },
    {
      icon: Star,
      value: stats.avgRating,
      label: t.rating,
      suffix: "",
      color: "text-amber-500",
      isDecimal: true,
    },
    {
      icon: Calendar,
      value: stats.bookings,
      label: t.bookings,
      suffix: "",
      color: "text-blue-500",
    },
    {
      icon: UserCheck,
      value: stats.totalGuests,
      label: t.guests,
      suffix: "",
      color: "text-violet-500",
    },
    {
      icon: Euro,
      value: stats.monthlyRevenue,
      label: t.revenue,
      suffix: "€",
      color: "text-primary",
      formatFn: formatRevenue,
    },
    {
      icon: TrendingUp,
      value: stats.occupancy,
      label: t.occupancy,
      suffix: "%",
      color: "text-teal-500",
    },
  ];

  return (
    <div
      className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
        isVisible ? "top-16 md:top-20 translate-y-0" : "top-16 md:top-20 -translate-y-full opacity-0"
      }`}
    >
      <div className="bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 md:gap-6 lg:gap-8 py-2 overflow-x-auto scrollbar-hide">
            {statItems.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 md:gap-2 group cursor-default flex-shrink-0"
              >
                <stat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${stat.color} transition-transform group-hover:scale-110`} />
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm md:text-base font-semibold text-foreground tabular-nums">
                    {stat.formatFn 
                      ? stat.formatFn(stat.value) 
                      : stat.isDecimal 
                        ? stat.value.toFixed(1) 
                        : stat.value.toLocaleString()}
                  </span>
                  {stat.suffix && (
                    <span className={`text-xs md:text-sm font-medium ${stat.color}`}>
                      {stat.suffix}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
            
            {/* Live indicator */}
            <div className="hidden md:flex items-center gap-1.5 ml-2 pl-3 border-l border-border/50 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStatsBar;
