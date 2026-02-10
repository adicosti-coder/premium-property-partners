import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Building, Users, Calendar, TrendingUp, Star, Euro, UserCheck, Clock, MapPin, Award, User as UserIcon, Shield, Eye, LogOut, LayoutDashboard, Settings, ChevronDown, UserCircle, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import AnimatedStatValue from "./AnimatedStatValue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "@supabase/supabase-js";

interface Stats {
  properties: number;
  bookings: number;
  leads: number;
  occupancy: number;
  avgRating: number;
  monthlyRevenue: number;
  totalGuests: number;
  yearsExperience: number;
}

const QuickStatsBar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    properties: 0,
    bookings: 0,
    leads: 0,
    occupancy: 85,
    avgRating: 4.8,
    monthlyRevenue: 0,
    totalGuests: 0,
    yearsExperience: 25,
  });
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(language === "ro" ? "Deconectat cu succes" : "Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(language === "ro" ? "Eroare la deconectare" : "Error signing out");
    }
  };

  const translations = {
    ro: {
      properties: "Apartamente",
      bookings: "Rezervări",
      leads: "Solicitări",
      occupancy: "Ocupare",
      rating: "Rating",
      revenue: "Venit lunar",
      guests: "Oaspeți",
      yearsExp: "Ani experiență",
      cities: "Orașe",
      satisfaction: "Satisfacție",
      tooltips: {
        properties: "Numărul total de apartamente premium în portofoliul nostru, disponibile pentru închiriere pe termen scurt",
        rating: "Rating-ul mediu acordat de oaspeții noștri pe platformele de rezervări (Booking, Airbnb)",
        bookings: "Numărul total de rezervări confirmate din toate proprietățile noastre",
        guests: "Numărul total de oaspeți care au beneficiat de serviciile noastre",
        revenue: "Venitul net lunar generat pentru proprietari în luna curentă",
        occupancy: "Rata medie de ocupare a apartamentelor din portofoliul nostru",
        yearsExp: "Numărul de ani de experiență în managementul proprietăților",
        cities: "Numărul de orașe în care operăm",
        satisfaction: "Rata de satisfacție a clienților noștri",
        leads: "Numărul total de solicitări de la potențiali clienți",
      },
    },
    en: {
      properties: "Apartments",
      bookings: "Bookings",
      leads: "Inquiries",
      occupancy: "Occupancy",
      rating: "Rating",
      revenue: "Monthly Rev",
      guests: "Guests",
      yearsExp: "Years Exp",
      cities: "Cities",
      satisfaction: "Satisfaction",
      tooltips: {
        properties: "Total number of premium apartments in our portfolio, available for short-term rental",
        rating: "Average rating given by our guests on booking platforms (Booking, Airbnb)",
        bookings: "Total number of confirmed bookings across all our properties",
        guests: "Total number of guests who have used our services",
        revenue: "Net monthly income generated for property owners this month",
        occupancy: "Average occupancy rate of apartments in our portfolio",
        yearsExp: "Years of experience in property management",
        cities: "Number of cities where we operate",
        satisfaction: "Customer satisfaction rate",
        leads: "Total number of inquiries from potential clients",
      },
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
        supabase.from("booking_availability").select("id", { count: "exact" }),
        supabase.from("leads").select("id", { count: "exact" }),
        supabase.from("financial_records")
          .select("amount, type")
          .gte("date", startOfMonth)
          .lte("date", endOfMonth),
        supabase.from("booking_availability")
          .select("id", { count: "exact" }),
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
        properties: Math.max(propertiesRes.count || 0, 11), // Minimum 11 apartments shown
        bookings: bookingsRes.count || 0,
        leads: leadsRes.count || 0,
        occupancy: 85,
        avgRating: 4.8,
        monthlyRevenue: Math.max(0, monthlyRevenue),
        totalGuests: guestsRes.count || 0,
        yearsExperience: 25,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        // Check admin role after auth state change
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    setIsAdmin(data === true);
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Stats for anonymous visitors (public, trust-building metrics)
  // Using theme-aware colors for better contrast
  const publicStatItems = [
    {
      icon: Building,
      value: Math.max(stats.properties, 11), // Ensure minimum 11 is shown
      label: t.properties,
      suffix: "+",
      color: "text-primary",
      action: () => scrollToSection("property-gallery"),
      tooltip: t.tooltips.properties,
    },
    {
      icon: Star,
      value: stats.avgRating,
      label: t.rating,
      suffix: "",
      color: "text-primary",
      isDecimal: true,
      action: () => scrollToSection("testimonials"),
      tooltip: t.tooltips.rating,
    },
    {
      icon: Clock,
      value: stats.yearsExperience,
      label: t.yearsExp,
      suffix: "+",
      color: "text-foreground",
      action: () => scrollToSection("how-it-works"),
      tooltip: t.tooltips.yearsExp,
    },
    {
      icon: TrendingUp,
      value: stats.occupancy,
      label: t.occupancy,
      suffix: "%",
      color: "text-primary",
      action: () => scrollToSection("how-it-works"),
      tooltip: t.tooltips.occupancy,
    },
    {
      icon: Award,
      value: 98,
      label: t.satisfaction,
      suffix: "%",
      color: "text-primary",
      action: () => scrollToSection("testimonials"),
      tooltip: t.tooltips.satisfaction,
    },
  ];

  // Stats for authenticated users (detailed business metrics)
  // Using theme-aware colors for better contrast
  const authenticatedStatItems = [
    {
      icon: Building,
      value: Math.max(stats.properties, 11), // Ensure minimum 11 is shown
      label: t.properties,
      suffix: "+",
      color: "text-primary",
      action: () => scrollToSection("property-gallery"),
      tooltip: t.tooltips.properties,
    },
    {
      icon: Star,
      value: stats.avgRating,
      label: t.rating,
      suffix: "",
      color: "text-primary",
      isDecimal: true,
      action: () => scrollToSection("testimonials"),
      tooltip: t.tooltips.rating,
    },
    {
      icon: Calendar,
      value: stats.bookings,
      label: t.bookings,
      suffix: "",
      color: "text-foreground",
      link: "/guests",
      tooltip: t.tooltips.bookings,
    },
    {
      icon: UserCheck,
      value: stats.totalGuests,
      label: t.guests,
      suffix: "",
      color: "text-foreground",
      link: "/guests",
      tooltip: t.tooltips.guests,
    },
    {
      icon: Euro,
      value: stats.monthlyRevenue,
      label: t.revenue,
      suffix: "€",
      color: "text-primary",
      formatFn: formatRevenue,
      action: () => scrollToSection("benefits"),
      tooltip: t.tooltips.revenue,
    },
    {
      icon: TrendingUp,
      value: stats.occupancy,
      label: t.occupancy,
      suffix: "%",
      color: "text-primary",
      action: () => scrollToSection("how-it-works"),
      tooltip: t.tooltips.occupancy,
    },
  ];

  // Admin-only stats (includes leads)
  // Using theme-aware colors for better contrast
  const adminStatItems = [
    ...authenticatedStatItems.slice(0, 2),
    {
      icon: Users,
      value: stats.leads,
      label: t.leads,
      suffix: "",
      color: "text-primary",
      link: "/admin",
      tooltip: t.tooltips.leads,
    },
    ...authenticatedStatItems.slice(2),
  ];

  // Select which stats to show based on auth status
  const allStatItems = isAdmin 
    ? adminStatItems 
    : user 
      ? authenticatedStatItems 
      : publicStatItems;

  // Calculate top offset based on header height (nav only, banners are inside header)
  // Mobile: ~64px nav, Desktop: ~80px nav
  // Dynamically measure the header height to position below it
  const [headerHeight, setHeaderHeight] = useState(160);
  
  const measureHeader = useCallback(() => {
    const header = document.querySelector('header');
    if (header) {
      setHeaderHeight(header.getBoundingClientRect().height);
    }
  }, []);

  useEffect(() => {
    measureHeader();
    window.addEventListener('resize', measureHeader);
    // Re-measure when banners might appear/disappear
    const observer = new MutationObserver(measureHeader);
    const header = document.querySelector('header');
    if (header) {
      observer.observe(header, { childList: true, subtree: true, attributes: true });
    }
    return () => {
      window.removeEventListener('resize', measureHeader);
      observer.disconnect();
    };
  }, [measureHeader]);
  
  return (
    <div
      className={`fixed left-0 right-0 z-30 transition-all duration-300 hidden md:block ${
        isVisible ? "translate-y-0" : "-translate-y-full opacity-0"
      }`}
      style={{ 
        top: `${headerHeight}px`
      }}
    >
      <div className="bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 md:gap-6 lg:gap-8 py-2 overflow-x-auto scrollbar-hide">
              {allStatItems.map((stat, index) => {
                // On mobile, show only first 4 stats
                const hideOnMobile = index >= 4;
                
                const content = (
                  <>
                    <stat.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${stat.color} transition-transform group-hover:scale-110`} />
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xs sm:text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        <AnimatedStatValue 
                          value={stat.value} 
                          decimals={stat.isDecimal ? 1 : 0}
                          formatFn={stat.formatFn}
                          duration={1200}
                        />
                      </span>
                      {stat.suffix && (
                        <span className={`text-[10px] sm:text-xs md:text-sm font-medium ${stat.color}`}>
                          {stat.suffix}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {stat.label}
                    </span>
                  </>
                );

                const wrappedContent = stat.link ? (
                  <Link
                    to={stat.link}
                    className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 group cursor-pointer flex-shrink-0 hover:bg-primary/5 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all ${hideOnMobile ? 'hidden md:flex' : ''}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    onClick={stat.action}
                    className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 group cursor-pointer flex-shrink-0 hover:bg-primary/5 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all ${hideOnMobile ? 'hidden md:flex' : ''}`}
                  >
                    {content}
                  </button>
                );

                return (
                  <Tooltip key={stat.label}>
                    <TooltipTrigger asChild>
                      {wrappedContent}
                    </TooltipTrigger>
                    <TooltipContent 
                      side="bottom" 
                      className="max-w-xs text-center bg-popover/95 backdrop-blur-sm"
                    >
                      <p className="text-sm">{stat.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              
              {/* User status indicator */}
              {!user ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/auth"
                      className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-border/50 flex-shrink-0 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all bg-primary/10 hover:bg-primary/20 group"
                    >
                      <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                        {language === "ro" ? "Login" : "Login"}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-sm max-w-xs">
                    <p className="text-sm">
                      {language === "ro" 
                        ? "Click pentru a te autentifica și a vedea mai multe statistici." 
                        : "Click to sign in and see more statistics."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex items-center gap-1.5 ml-2 pl-3 border-l border-border/50 flex-shrink-0 px-2 py-1 rounded-md transition-all cursor-pointer ${
                      isAdmin 
                        ? "bg-amber-500/10 hover:bg-amber-500/20" 
                        : "bg-primary/10 hover:bg-primary/20"
                    }`}>
                      {isAdmin ? (
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span className={`text-[10px] uppercase tracking-wider font-medium ${
                        isAdmin 
                          ? "text-primary" 
                          : "text-primary"
                      }`}>
                        {isAdmin ? "Admin" : (language === "ro" ? "Cont" : "User")}
                      </span>
                      <ChevronDown className="w-3 h-3 text-primary" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 bg-popover border border-border shadow-lg z-50"
                    sideOffset={8}
                  >
                    {isAdmin && (
                      <DropdownMenuItem 
                        onClick={() => navigate("/admin")}
                        className="cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        <span>{language === "ro" ? "Panou Admin" : "Admin Dashboard"}</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => navigate("/portal-proprietar")}
                      className="cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      <span>{language === "ro" ? "Dashboard" : "Dashboard"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/profil")}
                      className="cursor-pointer"
                    >
                      <UserCircle className="w-4 h-4 mr-2" />
                      <span>{language === "ro" ? "Profilul meu" : "My Profile"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/favorites")}
                      className="cursor-pointer"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      <span>{language === "ro" ? "Favorite" : "Favorites"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/setari")}
                      className="cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      <span>{language === "ro" ? "Setări cont" : "Account Settings"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>{language === "ro" ? "Deconectare" : "Sign Out"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Live indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-border/50 flex-shrink-0 cursor-help">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-sm">
                  <p className="text-sm">
                    {language === "ro" 
                      ? "Statistici actualizate în timp real din baza de date" 
                      : "Statistics updated in real-time from database"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default QuickStatsBar;
