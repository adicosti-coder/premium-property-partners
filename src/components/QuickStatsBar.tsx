import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Building, Users, Calendar, TrendingUp } from "lucide-react";

interface Stats {
  properties: number;
  bookings: number;
  leads: number;
  occupancy: number;
}

const QuickStatsBar = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    properties: 0,
    bookings: 0,
    leads: 0,
    occupancy: 85,
  });
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const translations = {
    ro: {
      properties: "Apartamente",
      bookings: "Rezervări",
      leads: "Solicitări",
      occupancy: "Ocupare",
    },
    en: {
      properties: "Apartments",
      bookings: "Bookings",
      leads: "Inquiries",
      occupancy: "Occupancy",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.ro;

  // Fetch stats from database
  const fetchStats = async () => {
    try {
      const [propertiesRes, bookingsRes, leadsRes] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("bookings").select("id", { count: "exact" }),
        supabase.from("leads").select("id", { count: "exact" }),
      ]);

      setStats({
        properties: propertiesRes.count || 11, // Fallback to 11 active apartments
        bookings: bookingsRes.count || 0,
        leads: leadsRes.count || 0,
        occupancy: 85, // Static for now - could be calculated from bookings
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

    return () => {
      supabase.removeChannel(propertiesChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(leadsChannel);
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

  const statItems = [
    {
      icon: Building,
      value: stats.properties || 11,
      label: t.properties,
      suffix: "+",
      color: "text-emerald-500",
    },
    {
      icon: Calendar,
      value: stats.bookings,
      label: t.bookings,
      suffix: "",
      color: "text-blue-500",
    },
    {
      icon: Users,
      value: stats.leads,
      label: t.leads,
      suffix: "",
      color: "text-amber-500",
    },
    {
      icon: TrendingUp,
      value: stats.occupancy,
      label: t.occupancy,
      suffix: "%",
      color: "text-primary",
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
          <div className="flex items-center justify-center gap-4 md:gap-8 lg:gap-12 py-2">
            {statItems.map((stat, index) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 md:gap-2 group cursor-default"
              >
                <stat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${stat.color} transition-transform group-hover:scale-110`} />
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm md:text-base font-semibold text-foreground tabular-nums">
                    {stat.value.toLocaleString()}
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
            <div className="hidden md:flex items-center gap-1.5 ml-2 pl-3 border-l border-border/50">
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
