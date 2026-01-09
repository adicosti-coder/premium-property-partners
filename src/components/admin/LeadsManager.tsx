import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trash2,
  Users,
  Phone,
  Home,
  Euro,
  Calendar,
  Search,
  Download,
  TrendingUp,
  Building2,
  Mail,
  MessageSquare,
  Filter,
  BarChart3,
  Eye,
  EyeOff,
  CheckCheck,
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
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
  Legend,
  LineChart,
  Line,
} from "recharts";

interface Lead {
  id: string;
  name: string;
  whatsapp_number: string;
  property_area: number;
  property_type: string;
  calculated_net_profit: number | null;
  calculated_yearly_profit: number | null;
  simulation_data: {
    adr?: number;
    occupancy?: number;
    cleaningCost?: number;
    managementFee?: number;
    platformFee?: number;
    avgStayDuration?: number;
    city?: string;
    roomType?: string;
    location?: string;
    estimatedIncome?: number;
  } | null;
  created_at: string;
  source: string | null;
  email: string | null;
  message: string | null;
  is_read: boolean;
}

type LeadFromDB = Omit<Lead, "simulation_data"> & {
  simulation_data: unknown;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const sourceLabels: Record<string, { ro: string; en: string; color: string }> = {
  calculator: { ro: "Profit Calculator", en: "Profit Calculator", color: "bg-blue-500" },
  "profit-calculator": { ro: "Profit Calculator", en: "Profit Calculator", color: "bg-blue-500" },
  "rental-calculator": { ro: "Rental Income", en: "Rental Income", color: "bg-green-500" },
  quick_form: { ro: "Formular Rapid", en: "Quick Form", color: "bg-purple-500" },
  real_estate_contact: { ro: "Contact Imobiliare", en: "Real Estate Contact", color: "bg-orange-500" },
};

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound (two-tone chime)
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Smooth envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playTone(880, now, 0.15); // A5
    playTone(1100, now + 0.15, 0.2); // C#6
    playTone(1320, now + 0.3, 0.25); // E6
    
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

const LeadsManager = () => {
  const { t, language } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingReadId, setTogglingReadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      title: "Leads Manager",
      totalLeads: "Total Lead-uri",
      thisWeek: "Această săptămână",
      thisMonth: "Această lună",
      avgProfit: "Profit mediu",
      avgArea: "Suprafață medie",
      search: "Caută după nume sau telefon...",
      source: "Sursă",
      allSources: "Toate sursele",
      period: "Perioadă",
      allTime: "Tot timpul",
      last7Days: "Ultimele 7 zile",
      last30Days: "Ultimele 30 zile",
      last90Days: "Ultimele 90 zile",
      export: "Export CSV",
      name: "Nume",
      contact: "Contact",
      property: "Proprietate",
      profit: "Profit estimat",
      date: "Data",
      actions: "Acțiuni",
      noLeads: "Nu există lead-uri",
      noLeadsDescription: "Lead-urile vor apărea aici după ce vizitatorii completează formularele.",
      deleteConfirm: "Ești sigur?",
      deleteDescription: "Această acțiune nu poate fi anulată.",
      cancel: "Anulează",
      delete: "Șterge",
      deleteSuccess: "Lead șters cu succes",
      error: "Eroare",
      loadError: "Nu am putut încărca lead-urile",
      deleteError: "Nu am putut șterge lead-ul",
      perMonth: "/lună",
      perYear: "/an",
      leadsBySource: "Lead-uri după sursă",
      leadsTrend: "Tendința lead-uri (30 zile)",
      propertyTypes: "Tipuri proprietăți",
      apartment: "Apartament",
      studio: "Garsonieră",
      house: "Casă",
      unknown: "Necunoscut",
      markAsRead: "Marchează ca citit",
      markAsUnread: "Marchează ca necitit",
      readStatus: "Status citire",
      allLeads: "Toate",
      unreadOnly: "Necitite",
      readOnly: "Citite",
      markAllAsRead: "Marchează toate ca citite",
      unreadCount: "necitite",
    },
    en: {
      title: "Leads Manager",
      totalLeads: "Total Leads",
      thisWeek: "This Week",
      thisMonth: "This Month",
      avgProfit: "Average Profit",
      avgArea: "Average Area",
      search: "Search by name or phone...",
      source: "Source",
      allSources: "All Sources",
      period: "Period",
      allTime: "All Time",
      last7Days: "Last 7 Days",
      last30Days: "Last 30 Days",
      last90Days: "Last 90 Days",
      export: "Export CSV",
      name: "Name",
      contact: "Contact",
      property: "Property",
      profit: "Estimated Profit",
      date: "Date",
      actions: "Actions",
      noLeads: "No leads yet",
      noLeadsDescription: "Leads will appear here after visitors complete the forms.",
      deleteConfirm: "Are you sure?",
      deleteDescription: "This action cannot be undone.",
      cancel: "Cancel",
      delete: "Delete",
      deleteSuccess: "Lead deleted successfully",
      error: "Error",
      loadError: "Could not load leads",
      deleteError: "Could not delete lead",
      perMonth: "/month",
      perYear: "/year",
      leadsBySource: "Leads by Source",
      leadsTrend: "Leads Trend (30 days)",
      propertyTypes: "Property Types",
      apartment: "Apartment",
      studio: "Studio",
      house: "House",
      unknown: "Unknown",
      markAsRead: "Mark as read",
      markAsUnread: "Mark as unread",
      readStatus: "Read status",
      allLeads: "All",
      unreadOnly: "Unread",
      readOnly: "Read",
      markAllAsRead: "Mark all as read",
      unreadCount: "unread",
    },
  };

  const text = translations[language as keyof typeof translations] || translations.en;

  const { toast: showToast } = useToast();

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, []);

  // Realtime subscription for new leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('New lead received:', payload);
          const newLead = payload.new as LeadFromDB;
          const typedLead: Lead = {
            ...newLead,
            simulation_data: newLead.simulation_data as Lead["simulation_data"],
          };
          
          // Add new lead to the top of the list
          setLeads((prevLeads) => [typedLead, ...prevLeads]);
          
          // Play notification sound
          playNotificationSound();
          
          // Show notification
          const sourceLabel = sourceLabels[newLead.source || 'calculator']?.[language as 'ro' | 'en'] || newLead.source;
          showToast({
            title: language === 'ro' ? '🎉 Lead nou!' : '🎉 New Lead!',
            description: language === 'ro' 
              ? `${newLead.name} a trimis un lead din ${sourceLabel}`
              : `${newLead.name} submitted a lead from ${sourceLabel}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language, showToast]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const typedLeads: Lead[] = (data || []).map((lead: LeadFromDB) => ({
        ...lead,
        simulation_data: lead.simulation_data as Lead["simulation_data"],
      }));
      setLeads(typedLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: text.error,
        description: text.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      setLeads(leads.filter((lead) => lead.id !== id));
      toast({ title: text.deleteSuccess });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: text.error,
        description: text.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleRead = async (id: string, currentStatus: boolean) => {
    setTogglingReadId(id);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ is_read: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      setLeads(leads.map((lead) => 
        lead.id === id ? { ...lead, is_read: !currentStatus } : lead
      ));
    } catch (error) {
      console.error("Error toggling read status:", error);
      toast({
        title: text.error,
        variant: "destructive",
      });
    } finally {
      setTogglingReadId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = leads.filter(l => !l.is_read).map(l => l.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("leads")
        .update({ is_read: true })
        .in("id", unreadIds);
      
      if (error) throw error;
      
      setLeads(leads.map((lead) => ({ ...lead, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: text.error,
        variant: "destructive",
      });
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const searchMatch =
        searchTerm === "" ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.whatsapp_number.includes(searchTerm) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));

      // Source filter
      const sourceMatch =
        sourceFilter === "all" ||
        lead.source === sourceFilter ||
        (sourceFilter === "calculator" && (lead.source === "calculator" || lead.source === "profit-calculator"));

      // Date filter
      let dateMatch = true;
      const leadDate = new Date(lead.created_at);
      const now = new Date();

      if (dateFilter === "7days") {
        dateMatch = isWithinInterval(leadDate, {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now),
        });
      } else if (dateFilter === "30days") {
        dateMatch = isWithinInterval(leadDate, {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        });
      } else if (dateFilter === "90days") {
        dateMatch = isWithinInterval(leadDate, {
          start: startOfDay(subDays(now, 90)),
          end: endOfDay(now),
        });
      }

      // Read status filter
      let readMatch = true;
      if (readFilter === "unread") {
        readMatch = !lead.is_read;
      } else if (readFilter === "read") {
        readMatch = lead.is_read;
      }

      return searchMatch && sourceMatch && dateMatch && readMatch;
    });
  }, [leads, searchTerm, sourceFilter, dateFilter, readFilter]);

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    const thisWeek = leads.filter((l) => new Date(l.created_at) > weekAgo).length;
    const thisMonth = leads.filter((l) => new Date(l.created_at) > monthAgo).length;
    
    const leadsWithProfit = leads.filter((l) => l.calculated_net_profit && l.calculated_net_profit > 0);
    const avgProfit = leadsWithProfit.length > 0
      ? Math.round(leadsWithProfit.reduce((acc, l) => acc + (l.calculated_net_profit || 0), 0) / leadsWithProfit.length)
      : 0;
    
    const avgArea = leads.length > 0
      ? Math.round(leads.reduce((acc, l) => acc + l.property_area, 0) / leads.length)
      : 0;

    const unreadCount = leads.filter((l) => !l.is_read).length;

    return { total: leads.length, thisWeek, thisMonth, avgProfit, avgArea, unreadCount };
  }, [leads]);

  // Chart data - Leads by source
  const sourceChartData = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.source || "calculator";
      const normalizedSource = source === "profit-calculator" ? "calculator" : source;
      sourceCounts[normalizedSource] = (sourceCounts[normalizedSource] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      name: sourceLabels[source]?.[language as "ro" | "en"] || source,
      value: count,
    }));
  }, [leads, language]);

  // Chart data - Leads trend (last 30 days)
  const trendChartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, "dd/MM");
      const count = leads.filter((lead) => {
        const leadDate = new Date(lead.created_at);
        return format(leadDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;
      days.push({ date: dateStr, count });
    }

    return days;
  }, [leads]);

  // Chart data - Property types
  const propertyTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const type = lead.property_type || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typeLabels: Record<string, string> = {
      apartment: text.apartment,
      studio: text.studio,
      house: text.house,
      unknown: text.unknown,
    };

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count,
    }));
  }, [leads, text]);

  const exportToCSV = () => {
    const headers = ["Nume", "Telefon", "Email", "Tip Proprietate", "Suprafață (m²)", "Profit Net", "Profit Anual", "Sursă", "Data"];
    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.whatsapp_number,
      lead.email || "",
      lead.property_type,
      lead.property_area,
      lead.calculated_net_profit || "",
      lead.calculated_yearly_profit || "",
      lead.source || "calculator",
      format(new Date(lead.created_at), "yyyy-MM-dd HH:mm"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const getSourceBadge = (source: string | null) => {
    const src = source || "calculator";
    const label = sourceLabels[src]?.[language as "ro" | "en"] || src;
    const colorClass = sourceLabels[src]?.color || "bg-gray-500";
    return (
      <Badge variant="secondary" className={`${colorClass} text-white`}>
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{text.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
                <p className="text-sm text-muted-foreground">{text.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
                <p className="text-sm text-muted-foreground">{text.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgProfit.toLocaleString()}€</p>
                <p className="text-sm text-muted-foreground">{text.avgProfit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Home className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgArea} m²</p>
                <p className="text-sm text-muted-foreground">{text.avgArea}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {text.leadsTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle>{text.leadsBySource}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={text.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-[160px]">
                  <Eye className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={text.readStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allLeads}</SelectItem>
                  <SelectItem value="unread">
                    <span className="flex items-center gap-2">
                      <EyeOff className="w-3 h-3" />
                      {text.unreadOnly}
                      {stats.unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-orange-500 text-white text-xs">
                          {stats.unreadCount}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                  <SelectItem value="read">
                    <span className="flex items-center gap-2">
                      <Eye className="w-3 h-3" />
                      {text.readOnly}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={text.source} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allSources}</SelectItem>
                  <SelectItem value="calculator">Profit Calculator</SelectItem>
                  <SelectItem value="rental-calculator">Rental Income</SelectItem>
                  <SelectItem value="quick_form">{language === "ro" ? "Formular Rapid" : "Quick Form"}</SelectItem>
                  <SelectItem value="real_estate_contact">{language === "ro" ? "Contact Imobiliare" : "Real Estate"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={text.period} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allTime}</SelectItem>
                  <SelectItem value="7days">{text.last7Days}</SelectItem>
                  <SelectItem value="30days">{text.last30Days}</SelectItem>
                  <SelectItem value="90days">{text.last90Days}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                {text.export}
              </Button>
              {stats.unreadCount > 0 && (
                <Button variant="outline" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {text.markAllAsRead}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{text.noLeads}</h3>
              <p className="text-muted-foreground">{text.noLeadsDescription}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.name}</TableHead>
                  <TableHead>{text.contact}</TableHead>
                  <TableHead>{text.property}</TableHead>
                  <TableHead>{text.profit}</TableHead>
                  <TableHead>{text.source}</TableHead>
                  <TableHead>{text.date}</TableHead>
                  <TableHead className="w-[80px]">{text.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className={!lead.is_read ? "bg-primary/5 hover:bg-primary/10" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {!lead.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <div>
                          <p className={!lead.is_read ? "font-semibold" : ""}>{lead.name}</p>
                          {lead.message && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MessageSquare className="w-3 h-3" />
                              {lead.message.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <a
                          href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Phone className="w-4 h-4" />
                          {lead.whatsapp_number}
                        </a>
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium capitalize">{lead.property_type}</span>
                          <span className="text-muted-foreground ml-2">({lead.property_area} m²)</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.calculated_net_profit ? (
                        <div>
                          <span className="font-semibold text-primary">
                            {lead.calculated_net_profit.toLocaleString()} €{text.perMonth}
                          </span>
                          {lead.calculated_yearly_profit && (
                            <p className="text-sm text-muted-foreground">
                              {lead.calculated_yearly_profit.toLocaleString()} €{text.perYear}
                            </p>
                          )}
                        </div>
                      ) : lead.simulation_data?.estimatedIncome ? (
                        <div>
                          <span className="font-semibold text-green-600">
                            {lead.simulation_data.estimatedIncome.toLocaleString()} €{text.perMonth}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {lead.simulation_data.city} • {lead.simulation_data.roomType}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getSourceBadge(lead.source)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lead.created_at), "d MMM yyyy, HH:mm", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleRead(lead.id, lead.is_read)}
                          className="text-muted-foreground hover:text-foreground"
                          title={lead.is_read ? text.markAsUnread : text.markAsRead}
                        >
                          {togglingReadId === lead.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : lead.is_read ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deletingId === lead.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{text.deleteConfirm}</AlertDialogTitle>
                              <AlertDialogDescription>{text.deleteDescription}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(lead.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {text.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground text-center">
        {language === "ro"
          ? `Afișez ${filteredLeads.length} din ${leads.length} lead-uri`
          : `Showing ${filteredLeads.length} of ${leads.length} leads`}
      </p>
    </div>
  );
};

export default LeadsManager;
