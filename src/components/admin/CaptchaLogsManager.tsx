import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Download,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
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
} from "recharts";
import { toast } from "sonner";

interface CaptchaLog {
  id: string;
  created_at: string;
  success: boolean;
  score: number | null;
  hostname: string | null;
  form_type: string;
  ip_address: string | null;
  user_agent: string | null;
  error_codes: string[] | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

const CaptchaLogsManager = () => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const [logs, setLogs] = useState<CaptchaLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all");
  const [filterFormType, setFilterFormType] = useState<string>("all");

  const translations = {
    ro: {
      title: "Log-uri Captcha",
      description: "Monitorizează verificările hCaptcha și detectează potențialul spam",
      search: "Caută după IP sau form type...",
      filter: "Filtrează",
      all: "Toate",
      success: "Succes",
      failed: "Eșuate",
      exportCsv: "Export CSV",
      refresh: "Reîmprospătează",
      date: "Data",
      status: "Status",
      formType: "Tip Formular",
      ipAddress: "Adresă IP",
      score: "Scor",
      errorCodes: "Coduri Eroare",
      stats: {
        totalAttempts: "Total încercări",
        successRate: "Rată succes",
        spamRate: "Rată spam",
        blockedAttempts: "Încercări blocate",
      },
      noLogs: "Nu există log-uri captcha",
      charts: {
        trend: "Tendință Succes/Eșec (7 zile)",
        byStatus: "Distribuție Status",
        byFormType: "Încercări per Tip Formular",
      },
    },
    en: {
      title: "Captcha Logs",
      description: "Monitor hCaptcha verifications and detect potential spam",
      search: "Search by IP or form type...",
      filter: "Filter",
      all: "All",
      success: "Success",
      failed: "Failed",
      exportCsv: "Export CSV",
      refresh: "Refresh",
      date: "Date",
      status: "Status",
      formType: "Form Type",
      ipAddress: "IP Address",
      score: "Score",
      errorCodes: "Error Codes",
      stats: {
        totalAttempts: "Total Attempts",
        successRate: "Success Rate",
        spamRate: "Spam Rate",
        blockedAttempts: "Blocked Attempts",
      },
      noLogs: "No captcha logs found",
      charts: {
        trend: "Success/Failure Trend (7 days)",
        byStatus: "Status Distribution",
        byFormType: "Attempts by Form Type",
      },
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("captcha_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching captcha logs:", error);
      toast.error(language === "ro" ? "Eroare la încărcarea log-urilor" : "Error loading logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Get unique form types for filter
  const formTypes = useMemo(() => {
    const types = new Set(logs.map((log) => log.form_type));
    return Array.from(types);
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        log.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.form_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "success" && log.success) ||
        (filterStatus === "failed" && !log.success);

      const matchesFormType =
        filterFormType === "all" || log.form_type === filterFormType;

      return matchesSearch && matchesStatus && matchesFormType;
    });
  }, [logs, searchQuery, filterStatus, filterFormType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const successful = logs.filter((l) => l.success).length;
    const failed = logs.filter((l) => !l.success).length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : "0";
    const spamRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0";

    return {
      total,
      successful,
      failed,
      successRate,
      spamRate,
    };
  }, [logs]);

  // Chart data - Status distribution
  const statusData = useMemo(() => {
    return [
      { name: t.success, value: stats.successful },
      { name: t.failed, value: stats.failed },
    ];
  }, [stats, t]);

  // Chart data - By form type
  const formTypeData = useMemo(() => {
    const counts: Record<string, { success: number; failed: number }> = {};
    logs.forEach((log) => {
      if (!counts[log.form_type]) {
        counts[log.form_type] = { success: 0, failed: 0 };
      }
      if (log.success) {
        counts[log.form_type].success++;
      } else {
        counts[log.form_type].failed++;
      }
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      success: data.success,
      failed: data.failed,
    }));
  }, [logs]);

  // Chart data - Trend (last 7 days)
  const trendData = useMemo(() => {
    const last7Days: Record<string, { success: number; failed: number }> = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = format(date, "MM/dd");
      last7Days[key] = { success: 0, failed: 0 };
    }

    logs.forEach((log) => {
      const date = format(new Date(log.created_at), "MM/dd");
      if (last7Days[date]) {
        if (log.success) {
          last7Days[date].success++;
        } else {
          last7Days[date].failed++;
        }
      }
    });

    return Object.entries(last7Days).map(([date, data]) => ({
      date,
      success: data.success,
      failed: data.failed,
    }));
  }, [logs]);

  // Export to CSV
  const exportToCsv = () => {
    const headers = [
      "ID",
      "Date",
      "Status",
      "Form Type",
      "IP Address",
      "Score",
      "Hostname",
      "Error Codes",
      "User Agent",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          log.id,
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          log.success ? "Success" : "Failed",
          log.form_type,
          log.ip_address || "",
          log.score?.toString() || "",
          log.hostname || "",
          log.error_codes?.join(";") || "",
          `"${(log.user_agent || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `captcha-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      language === "ro"
        ? `${filteredLogs.length} log-uri exportate cu succes`
        : `${filteredLogs.length} logs exported successfully`
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.stats.totalAttempts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.successRate}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.stats.successRate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.spamRate}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.stats.spamRate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <ShieldX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.failed}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.stats.blockedAttempts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t.charts.trend}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name={t.success}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    name={t.failed}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.charts.byStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Type Chart */}
      {formTypeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.charts.byFormType}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formTypeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="success"
                    fill="hsl(var(--primary))"
                    name={t.success}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="failed"
                    fill="hsl(var(--destructive))"
                    name={t.failed}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(value: "all" | "success" | "failed") =>
                  setFilterStatus(value)
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="success">{t.success}</SelectItem>
                  <SelectItem value="failed">{t.failed}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterFormType}
                onValueChange={(value) => setFilterFormType(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t.formType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {formTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.refresh}
              </Button>
              <Button variant="default" size="sm" onClick={exportToCsv}>
                <Download className="w-4 h-4 mr-2" />
                {t.exportCsv}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.noLogs}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.formType}</TableHead>
                    <TableHead>{t.ipAddress}</TableHead>
                    <TableHead>{t.score}</TableHead>
                    <TableHead>{t.errorCodes}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", {
                          locale: dateLocale,
                        })}
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t.success}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t.failed}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.form_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell>
                        {log.score !== null ? log.score.toFixed(2) : "-"}
                      </TableCell>
                      <TableCell>
                        {log.error_codes?.length ? (
                          <span className="text-xs text-destructive">
                            {log.error_codes.join(", ")}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredLogs.length > 100 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  {language === "ro"
                    ? `Se afișează primele 100 din ${filteredLogs.length} rezultate. Folosiți Export CSV pentru toate.`
                    : `Showing first 100 of ${filteredLogs.length} results. Use Export CSV for all.`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaptchaLogsManager;
