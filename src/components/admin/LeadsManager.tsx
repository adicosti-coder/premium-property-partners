import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Activity,
  Calendar,
  CheckCheck,
  Download,
  Euro,
  Eye,
  EyeOff,
  Filter,
  Flame,
  Home,
  Loader2,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import LeadDetailDialog from "./LeadDetailDialog";
import LeadActivityDrawer from "./leads/LeadActivityDrawer";

import { format, subDays } from "date-fns";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import { AdminPagination } from "./shared/AdminPagination";
import {
  useLeads,
  type LeadDateFilter,
  type LeadGradeFilter,
  type LeadReadFilter,
  type LeadRow,
  type LeadStatusFilter,
} from "./leads/hooks/useLeads";
import { LeadTableRow, sourceBadgeFor } from "./leads/columns/leadsColumns";

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
  calculator_roi_widget: { ro: "Proiecție Randament", en: "Yield Projection", color: "bg-amber-500" },
  evaluare_gratuita: { ro: "Evaluare Gratuită", en: "Free Valuation", color: "bg-teal-500" },
  pentru_proprietari_precalc: { ro: "Precalcul Proprietari", en: "Owners Precalc", color: "bg-indigo-500" },
  homepage_owners_teaser: { ro: "Homepage Proprietari", en: "Homepage Owners", color: "bg-sky-500" },
  lead_capture_form: { ro: "Formular Lead", en: "Lead Form", color: "bg-rose-500" },
  pagina_contact: { ro: "Pagina Contact", en: "Contact Page", color: "bg-slate-500" },
  quick_form: { ro: "Formular Rapid", en: "Quick Form", color: "bg-purple-500" },
  real_estate_contact: { ro: "Contact Imobiliare", en: "Real Estate Contact", color: "bg-orange-500" },
  "HostScan AI Report": { ro: "HostScan AI", en: "HostScan AI", color: "bg-emerald-500" },
  "AI Chat (Tools)": { ro: "Chat AI", en: "AI Chat", color: "bg-cyan-500" },
};


const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    const now = audioContext.currentTime;
    playTone(880, now, 0.15);
    playTone(1100, now + 0.15, 0.2);
    playTone(1320, now + 0.3, 0.25);
  } catch (error) {
    console.log("Could not play notification sound:", error);
  }
};

const LeadsManager = () => {
  const { language } = useLanguage();

  // Filters (server-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<LeadReadFilter>("all");
  const [dateFilter, setDateFilter] = useState<LeadDateFilter>("all");
  const [gradeFilter, setGradeFilter] = useState<LeadGradeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  // Selection
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activityLeadId, setActivityLeadId] = useState<string | null>(null);


  const {
    rows,
    total,
    pageCount,
    isLoading,
    isFetching,
    snapshot,
    invalidate,
    deleteLead,
    isDeletingId,
    toggleRead,
    isTogglingReadId,
    markAllRead,
    fetchAllFiltered,
    resendAlert,
    isResendingId,
  } = useLeads({
    page,
    pageSize,
    search: searchTerm,
    source: sourceFilter,
    read: readFilter,
    date: dateFilter,
    grade: gradeFilter,
    status: statusFilter,
    campaign: campaignFilter,
    dateFrom,
    dateTo,
  });


  const translations = {
    ro: {
      totalLeads: "Total Lead-uri (90d)",
      thisWeek: "Această săptămână",
      thisMonth: "Această lună",
      avgProfit: "Profit mediu",
      avgArea: "Suprafață medie",
      search: "Caută după nume, telefon sau email...",
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
      deleteError: "Nu am putut șterge lead-ul",
      perMonth: "/lună",
      perYear: "/an",
      leadsBySource: "Lead-uri după sursă (90d)",
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
    },
    en: {
      totalLeads: "Total Leads (90d)",
      thisWeek: "This Week",
      thisMonth: "This Month",
      avgProfit: "Average Profit",
      avgArea: "Average Area",
      search: "Search by name, phone or email...",
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
      deleteError: "Could not delete lead",
      perMonth: "/month",
      perYear: "/year",
      leadsBySource: "Leads by Source (90d)",
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
    },
  };
  const text = translations[language as keyof typeof translations] || translations.en;
  const lang: "ro" | "en" = language === "ro" ? "ro" : "en";

  // Realtime — INSERT plays sound + toast, both INSERT/DELETE invalidate queries.
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as { name: string; source: string | null };
          playNotificationSound();
          const sourceLabel =
            sourceLabels[newLead.source || "calculator"]?.[lang] || newLead.source;
          toast({
            title: lang === "ro" ? "🎉 Lead nou!" : "🎉 New Lead!",
            description:
              lang === "ro"
                ? `${newLead.name} a trimis un lead din ${sourceLabel}`
                : `${newLead.name} submitted a lead from ${sourceLabel}`,
          });
          invalidate();
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        () => invalidate(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => invalidate(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lang, invalidate]);

  const handleDelete = async (id: string) => {
    try {
      await deleteLead(id);
      toast({ title: text.deleteSuccess });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({ title: text.error, description: text.deleteError, variant: "destructive" });
    }
  };

  const handleToggleRead = async (lead: LeadRow) => {
    try {
      await toggleRead({ id: lead.id, is_read: lead.is_read });
    } catch (error) {
      console.error("Error toggling read status:", error);
      toast({ title: text.error, variant: "destructive" });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({ title: text.error, variant: "destructive" });
    }
  };

  const handleFollowUpChange = useCallback(() => {
    invalidate();
  }, [invalidate]);

  // ---- Stats + charts derived from snapshot (last 90 days) ----
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);
    const thisWeek = snapshot.filter((l) => new Date(l.created_at) > weekAgo).length;
    const thisMonth = snapshot.filter((l) => new Date(l.created_at) > monthAgo).length;
    const withProfit = snapshot.filter((l) => l.calculated_net_profit && l.calculated_net_profit > 0);
    const avgProfit = withProfit.length
      ? Math.round(withProfit.reduce((a, l) => a + (l.calculated_net_profit || 0), 0) / withProfit.length)
      : 0;
    const avgArea = snapshot.length
      ? Math.round(snapshot.reduce((a, l) => a + (l.property_area || 0), 0) / snapshot.length)
      : 0;
    const unreadCount = snapshot.filter((l) => !l.is_read).length;
    return { total: snapshot.length, thisWeek, thisMonth, avgProfit, avgArea, unreadCount };
  }, [snapshot]);

  const sourceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    snapshot.forEach((lead) => {
      const s = lead.source || "calculator";
      const normalized = s === "profit-calculator" ? "calculator" : s;
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return Object.entries(counts).map(([source, count]) => ({
      name: sourceLabels[source]?.[lang] || source,
      value: count,
    }));
  }, [snapshot, lang]);

  const trendChartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, "dd/MM");
      const key = format(date, "yyyy-MM-dd");
      const count = snapshot.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === key).length;
      days.push({ date: dateStr, count });
    }
    return days;
  }, [snapshot]);

  const propertyTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    snapshot.forEach((lead) => {
      const type = lead.property_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    const labels: Record<string, string> = {
      apartment: text.apartment,
      studio: text.studio,
      house: text.house,
      unknown: text.unknown,
    };
    return Object.entries(counts).map(([type, count]) => ({
      name: labels[type] || type,
      value: count,
    }));
  }, [snapshot, text]);

  // Secure CSV export of ALL rows matching the active filters (server-side query,
  // RLS-protected, capped at 5000). Values are escaped and formula-injection is
  // neutralised so the file can't execute anything when opened in Excel.
  const csvCell = (value: unknown) => {
    let s = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const all = await fetchAllFiltered();
      if (all.length === 0) {
        toast({
          title: lang === "ro" ? "Nimic de exportat" : "Nothing to export",
          description:
            lang === "ro"
              ? "Niciun lead nu corespunde filtrelor active."
              : "No leads match the active filters.",
        });
        return;
      }
      const headers = [
        "Nume",
        "Telefon",
        "Email",
        "Tip Proprietate",
        "Suprafață (m²)",
        "Profit Net",
        "Profit Anual",
        "Scor",
        "Grade",
        "Status",
        "Interacțiuni",
        "Sursă",
        "Campanie",
        "Alertă",
        "Data",
      ];
      const csvRows = all.map((lead) => [
        lead.name,
        lead.whatsapp_number,
        lead.email || "",
        lead.property_type,
        lead.property_area,
        lead.calculated_net_profit ?? "",
        lead.calculated_yearly_profit ?? "",
        lead.lead_score ?? "",
        lead.lead_grade ?? "",
        lead.engagement_status ?? "new",
        lead.touch_count ?? 1,
        lead.source || "calculator",
        lead.simulation_data?.campaign || lead.simulation_data?.utm_campaign || "",
        lead.alert_status ?? "",
        format(new Date(lead.created_at), "yyyy-MM-dd HH:mm"),
      ]);
      const csvContent = [
        headers.map(csvCell).join(","),
        ...csvRows.map((r) => r.map(csvCell).join(",")),
      ].join("\r\n");
      // BOM so Excel reads UTF-8 diacritics correctly
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leads_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: lang === "ro" ? "Export finalizat" : "Export complete",
        description:
          lang === "ro" ? `${all.length} lead-uri exportate.` : `${all.length} leads exported.`,
      });
    } catch (e) {
      toast({
        title: text.error,
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleResendAlert = async (id: string) => {
    try {
      const res = (await resendAlert(id)) as { attempts?: number } | undefined;
      toast({
        title: lang === "ro" ? "Alertă retrimisă" : "Alert resent",
        description:
          lang === "ro"
            ? `Notificarea a fost livrată${res?.attempts ? ` (${res.attempts} încercări)` : ""}.`
            : `Notification delivered${res?.attempts ? ` (${res.attempts} attempts)` : ""}.`,
      });
    } catch (e) {
      toast({
        title: lang === "ro" ? "Retrimiterea a eșuat" : "Resend failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };


  const rowLabels = {
    perMonth: text.perMonth,
    perYear: text.perYear,
    markAsRead: text.markAsRead,
    markAsUnread: text.markAsUnread,
    deleteConfirm: text.deleteConfirm,
    deleteDescription: text.deleteDescription,
    cancel: text.cancel,
    delete: text.delete,
    activityHistory: lang === "ro" ? "Istoric activitate" : "Activity history",
    resendAlert: lang === "ro" ? "Retrimite alerta" : "Resend alert",
    resendAlertHint:
      lang === "ro"
        ? "Livrarea alertei WhatsApp a eșuat — retrimite acum"
        : "WhatsApp alert delivery failed — resend now",
    language: lang,
  } as const;


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
                <p className="text-2xl font-bold text-foreground">
                  {stats.avgProfit.toLocaleString()}€
                </p>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <Select
                value={readFilter}
                onValueChange={(v) => {
                  setReadFilter(v as LeadReadFilter);
                  setPage(0);
                }}
              >
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
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSourceFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={text.source} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allSources}</SelectItem>
                  <SelectItem value="calculator">Profit Calculator</SelectItem>
                  <SelectItem value="rental-calculator">Rental Income</SelectItem>
                  <SelectItem value="quick_form">
                    {lang === "ro" ? "Formular Rapid" : "Quick Form"}
                  </SelectItem>
                  <SelectItem value="real_estate_contact">
                    {lang === "ro" ? "Contact Imobiliare" : "Real Estate"}
                  </SelectItem>
                  <SelectItem value="calculator_roi_widget">
                    {lang === "ro" ? "Proiecție Randament" : "Yield Projection"}
                  </SelectItem>
                  <SelectItem value="evaluare_gratuita">
                    {lang === "ro" ? "Evaluare Gratuită" : "Free Valuation"}
                  </SelectItem>
                  <SelectItem value="pentru_proprietari_precalc">
                    {lang === "ro" ? "Precalcul Proprietari" : "Owners Precalc"}
                  </SelectItem>
                  <SelectItem value="pagina_contact">
                    {lang === "ro" ? "Pagina Contact" : "Contact Page"}
                  </SelectItem>
                  <SelectItem value="HostScan AI Report">HostScan AI</SelectItem>

                  <SelectItem value="AI Chat (Tools)">
                    {lang === "ro" ? "Chat AI" : "AI Chat"}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v as LeadDateFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={text.period} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allTime}</SelectItem>
                  <SelectItem value="7days">{text.last7Days}</SelectItem>
                  <SelectItem value="30days">{text.last30Days}</SelectItem>
                  <SelectItem value="90days">{text.last90Days}</SelectItem>
                  <SelectItem value="custom">
                    {lang === "ro" ? "Interval personalizat" : "Custom range"}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Grade / score */}
              <Select
                value={gradeFilter}
                onValueChange={(v) => {
                  setGradeFilter(v as LeadGradeFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <Flame className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={lang === "ro" ? "Scor" : "Score"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {lang === "ro" ? "Toate scorurile" : "All scores"}
                  </SelectItem>
                  <SelectItem value="hot">🔥 Hot (80+)</SelectItem>
                  <SelectItem value="warm">⚡ Warm (60+)</SelectItem>
                  <SelectItem value="cool">🌤️ Cool</SelectItem>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                </SelectContent>
              </Select>

              {/* Engagement / alert status */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as LeadStatusFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[190px]">
                  <Activity className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {lang === "ro" ? "Toate statusurile" : "All statuses"}
                  </SelectItem>
                  <SelectItem value="new">{lang === "ro" ? "Noi" : "New"}</SelectItem>
                  <SelectItem value="re_engaged">
                    {lang === "ro" ? "Re-engaged" : "Re-engaged"}
                  </SelectItem>
                  <SelectItem value="alert_failed">
                    {lang === "ro" ? "Alertă eșuată" : "Alert failed"}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* UTM campaign */}
              <Input
                placeholder={lang === "ro" ? "Campanie UTM..." : "UTM campaign..."}
                value={campaignFilter}
                onChange={(e) => {
                  setCampaignFilter(e.target.value);
                  setPage(0);
                }}
                className="w-[180px]"
                aria-label={lang === "ro" ? "Filtrează după campanie UTM" : "Filter by UTM campaign"}
              />

              {dateFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(0);
                    }}
                    className="w-[150px]"
                    aria-label={lang === "ro" ? "De la data" : "From date"}
                  />
                  <span className="text-muted-foreground text-sm">→</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(0);
                    }}
                    className="w-[150px]"
                    aria-label={lang === "ro" ? "Până la data" : "To date"}
                  />
                </div>
              )}

              {(gradeFilter !== "all" ||
                statusFilter !== "all" ||
                campaignFilter ||
                sourceFilter !== "all" ||
                readFilter !== "all" ||
                dateFilter !== "all" ||
                searchTerm) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGradeFilter("all");
                    setStatusFilter("all");
                    setCampaignFilter("");
                    setSourceFilter("all");
                    setReadFilter("all");
                    setDateFilter("all");
                    setDateFrom("");
                    setDateTo("");
                    setSearchTerm("");
                    setPage(0);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  {lang === "ro" ? "Resetează filtrele" : "Reset filters"}
                </Button>
              )}

              <Button variant="outline" onClick={exportToCSV} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {text.export}
              </Button>
              {stats.unreadCount > 0 && (
                <Button variant="outline" onClick={handleMarkAllRead}>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
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
                  <TableHead>HostScan</TableHead>
                  <TableHead>{text.profit}</TableHead>
                  <TableHead>{text.source}</TableHead>
                  <TableHead>{text.date}</TableHead>
                  <TableHead className="w-[80px]">{text.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lead) => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    labels={rowLabels}
                    sourceBadge={sourceBadgeFor(lead.source, lang, sourceLabels)}
                    isDeleting={isDeletingId === lead.id}
                    isTogglingRead={isTogglingReadId === lead.id}
                    isResending={isResendingId === lead.id}
                    onSelect={(l) => {
                      setSelectedLead(l);
                      setDetailOpen(true);
                    }}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                    onFollowUpChange={handleFollowUpChange}
                    onShowActivity={setActivityLeadId}
                    onResendAlert={handleResendAlert}
                  />

                ))}
              </TableBody>
            </Table>
          )}
          <div className="border-t border-border">
            <AdminPagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(s) => {
                setPageSize(s);
                setPage(0);
              }}
              isFetching={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <LeadDetailDialog lead={selectedLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <LeadActivityDrawer
        leadId={activityLeadId}
        open={!!activityLeadId}
        onOpenChange={(o) => !o && setActivityLeadId(null)}
      />

    </div>
  );
};

export default LeadsManager;
