import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, MapPin, MousePointerClick, LayoutGrid, Percent, Download, FileText, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfDay, endOfDay, format, subDays, eachDayOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Brush } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugifyLocation } from "@/lib/blogLocations";

interface HubRow {
  id: string;
  created_at: string;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface AggRow {
  location: string;
  locationSlug: string;
  inline: number;
  card: number;
  total: number;
  uniqueTotal: number;
  impressions: number;
  ctr: number; // %
}

const PRESET_RANGES = ["7", "30", "90", "365"] as const;
type PresetRange = (typeof PRESET_RANGES)[number];

const BlogHubClicksDashboard = () => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState< PresetRange | "custom">("30");
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [trendLocation, setTrendLocation] = useState<string>("all");
  const [trendChartType, setTrendChartType] = useState<"line" | "bar">("line");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isCustom = dateRange === "custom";
  const days = isCustom ? 0 : parseInt(dateRange);

  const startDate = useMemo(() => {
    if (isCustom) return startOfDay(new Date(customStart));
    return startOfDay(subDays(new Date(), days));
  }, [isCustom, customStart, days]);

  const endDate = useMemo(() => {
    if (isCustom) return endOfDay(new Date(customEnd));
    return endOfDay(new Date());
  }, [isCustom, customEnd]);

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  const dateLabel = isCustom
    ? `${format(startDate, "dd.MM.yyyy")} – ${format(endDate, "dd.MM.yyyy")}`
    : `Ultimele ${days} zile`;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["blog-hub-clicks"] });
      await queryClient.invalidateQueries({ queryKey: ["blog-hub-impressions"] });
      await queryClient.refetchQueries({ queryKey: ["blog-hub-clicks"] });
      await queryClient.refetchQueries({ queryKey: ["blog-hub-impressions"] });
      toast.success("Date reîmprospătate din baza de date.");
    } catch (e) {
      toast.error("Refresh eșuat. Încearcă din nou.");
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const { data: clicks, isLoading } = useQuery({
    queryKey: ["blog-hub-clicks", dateRange, customStart, customEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cta_analytics")
        .select("id, created_at, session_id, metadata")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .eq("cta_type", "form_submit")
        .filter("metadata->>event", "eq", "blog_location_hub_click")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as HubRow[];
    },
  });

  const { data: impressions } = useQuery({
    queryKey: ["blog-hub-impressions", dateRange, customStart, customEnd],
    queryFn: async () => {
      if (isCustom) {
        const { data, error } = await supabase.rpc("get_blog_hub_impressions_range", {
          p_start_date: startIso,
          p_end_date: endIso,
        });
        if (error) throw error;
        return (data ?? []) as Array<{ geo_location: string; impressions: number }>;
      }
      const { data, error } = await supabase.rpc("get_blog_hub_impressions", { p_days: days });
      if (error) throw error;
      return (data ?? []) as Array<{ geo_location: string; impressions: number }>;
    },
  });

  const { rows, totals } = useMemo(() => {
    const impMap = new Map<string, number>();
    (impressions ?? []).forEach((r) => {
      if (r.geo_location) impMap.set(slugifyLocation(r.geo_location), Number(r.impressions) || 0);
    });

    const map = new Map<string, AggRow & { uniqKeys: Set<string> }>();
    let inlineTotal = 0;
    let cardTotal = 0;
    (clicks ?? []).forEach((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const location = String(meta.location ?? "—");
      const locationSlug = String(meta.location_slug ?? slugifyLocation(location));
      const source = String(meta.source ?? "inline");
      if (!map.has(locationSlug)) {
        map.set(locationSlug, {
          location,
          locationSlug,
          inline: 0,
          card: 0,
          total: 0,
          uniqueTotal: 0,
          impressions: impMap.get(locationSlug) ?? 0,
          ctr: 0,
          uniqKeys: new Set<string>(),
        });
      }
      const row = map.get(locationSlug)!;
      if (source === "card") {
        row.card += 1;
        cardTotal += 1;
      } else {
        row.inline += 1;
        inlineTotal += 1;
      }
      row.total += 1;
      if (r.session_id) row.uniqKeys.add(`${r.session_id}|${source}`);
    });

    const rows: AggRow[] = Array.from(map.values())
      .map((r) => {
        const uniqueTotal = r.uniqKeys.size || r.total;
        const ctr = r.impressions > 0 ? (uniqueTotal / r.impressions) * 100 : 0;
        return {
          location: r.location,
          locationSlug: r.locationSlug,
          inline: r.inline,
          card: r.card,
          total: r.total,
          uniqueTotal,
          impressions: r.impressions,
          ctr,
        };
      })
      .sort((a, b) => b.total - a.total);

    const totalImpressions = Array.from(impMap.values()).reduce((a, b) => a + b, 0);
    const totalUnique = rows.reduce((a, b) => a + b.uniqueTotal, 0);
    return {
      rows,
      totals: {
        inline: inlineTotal,
        card: cardTotal,
        total: inlineTotal + cardTotal,
        locations: rows.length,
        impressions: totalImpressions,
        avgCtr: totalImpressions > 0 ? (totalUnique / totalImpressions) * 100 : 0,
      },
    };
  }, [clicks, impressions]);

  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const byDay = new Map<string, { date: string; total: number; uniqKeys: Set<string> }>();
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      byDay.set(key, { date: format(d, "dd.MM"), total: 0, uniqKeys: new Set() });
    });
    (clicks ?? []).forEach((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const slug = String(meta.location_slug ?? slugifyLocation(String(meta.location ?? "")));
      if (trendLocation !== "all" && slug !== trendLocation) return;
      const key = format(new Date(r.created_at), "yyyy-MM-dd");
      const entry = byDay.get(key);
      if (!entry) return;
      entry.total += 1;
      const source = String(meta.source ?? "inline");
      if (r.session_id) entry.uniqKeys.add(`${r.session_id}|${source}`);
    });
    return Array.from(byDay.values()).map((d) => ({
      date: d.date,
      total: d.total,
      unique: d.uniqKeys.size,
    }));
  }, [clicks, startDate, endDate, trendLocation]);

  const handleExportSummary = useCallback(() => {
    const headers = ["Locatie", "Afisari", "Click-uri Inline", "Click-uri Card", "Total Click-uri", "Click-uri Unice", "CTR %"];
    const csvRows = rows.map((r) => [
      r.location,
      r.impressions,
      r.inline,
      r.card,
      r.total,
      r.uniqueTotal,
      r.ctr.toFixed(2),
    ]);
    const csv = [headers.join(";"), ...csvRows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hub-clicks-rezumat-${dateRange === "custom" ? "custom" : dateRange + "zile"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, dateRange]);

  const handleExportDetails = useCallback(() => {
    const headers = ["Data", "Locatie", "Location Slug", "Sursa", "Article Slug", "Session ID"];
    const csvRows = (clicks ?? []).map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return [
        format(new Date(r.created_at), "dd.MM.yyyy HH:mm"),
        String(meta.location ?? ""),
        String(meta.location_slug ?? ""),
        String(meta.source ?? "inline"),
        String(meta.article_slug ?? ""),
        r.session_id ?? "",
      ];
    });
    const csv = [headers.join(";"), ...csvRows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hub-clicks-detalii-${dateRange === "custom" ? "custom" : dateRange + "zile"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [clicks, dateRange]);

  const fmtCtr = (v: number) => (v > 0 ? `${v.toFixed(2)}%` : "—");

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Hub Clicks – Locații Blog
          </h2>
          <p className="text-sm text-muted-foreground">
            Click-uri pe linkurile către hub-urile de locație din articole + CTR vs. afișările articolelor.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="default" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> {isRefreshing ? "Se reîncarcă..." : "Run Now"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSummary} className="gap-1.5">
              <Download className="w-4 h-4" /> Export rezumat
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportDetails} className="gap-1.5">
              <FileText className="w-4 h-4" /> Export detalii evenimente
            </Button>
            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as PresetRange | "custom")}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ultimele 7 zile</SelectItem>
                <SelectItem value="30">Ultimele 30 zile</SelectItem>
                <SelectItem value="90">Ultimele 90 zile</SelectItem>
                <SelectItem value="365">Ultimul an</SelectItem>
                <SelectItem value="custom">Personalizat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isCustom && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">Perioada selectată: {dateLabel}</div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<MousePointerClick className="w-4 h-4" />} label="Total click-uri" value={totals.total.toLocaleString("ro-RO")} />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Link inline" value={totals.inline.toLocaleString("ro-RO")} />
        <StatCard icon={<LayoutGrid className="w-4 h-4" />} label="Card final" value={totals.card.toLocaleString("ro-RO")} />
        <StatCard icon={<MapPin className="w-4 h-4" />} label="Afișări articole" value={totals.impressions.toLocaleString("ro-RO")} />
        <StatCard icon={<Percent className="w-4 h-4" />} label="CTR mediu" value={fmtCtr(totals.avgCtr)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Evoluție zilnică
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={trendChartType} onValueChange={(v) => setTrendChartType(v as "line" | "bar")}>
              <TabsList className="h-9">
                <TabsTrigger value="line" className="text-xs px-3">Linii</TabsTrigger>
                <TabsTrigger value="bar" className="text-xs px-3">Bare</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={trendLocation} onValueChange={setTrendLocation}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Total site (toate locațiile)</SelectItem>
                {rows.map((r) => (
                  <SelectItem key={r.locationSlug} value={r.locationSlug}>
                    {r.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {trendChartType === "line" ? (
                <LineChart data={dailyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="Total click-uri" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="unique" name="Click-uri unice" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  {dailyTrend.length > 7 && (
                    <Brush
                      dataKey="date"
                      height={24}
                      stroke="hsl(var(--primary))"
                      travellerWidth={8}
                      startIndex={Math.max(0, dailyTrend.length - 30)}
                    />
                  )}
                </LineChart>
              ) : (
                <BarChart data={dailyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Total click-uri" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="unique" name="Click-uri unice" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                  {dailyTrend.length > 7 && (
                    <Brush
                      dataKey="date"
                      height={24}
                      stroke="hsl(var(--primary))"
                      travellerWidth={8}
                      startIndex={Math.max(0, dailyTrend.length - 30)}
                    />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Filtrare: {trendLocation === "all" ? "tot site-ul" : rows.find((r) => r.locationSlug === trendLocation)?.location ?? trendLocation}. Trage de selecția de jos pentru zoom pe interval.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Click-uri per locație</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Nu există click-uri în intervalul selectat.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="location" angle={-25} textAnchor="end" interval={0} height={60} className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inline" name="Inline" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="card" name="Card" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalii per locație</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Locație</th>
                  <th className="text-right px-4 py-2">Inline</th>
                  <th className="text-right px-4 py-2">Card</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Unice</th>
                  <th className="text-right px-4 py-2">Afișări</th>
                  <th className="text-right px-4 py-2">CTR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.locationSlug} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium text-foreground">{r.location}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.inline}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.card}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{r.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.uniqueTotal}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.impressions || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{fmtCtr(r.ctr)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Niciun click înregistrat încă.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border">
            CTR = click-uri unice (per sesiune + sursă) / afișări articole din locație × 100.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
    </CardContent>
  </Card>
);

export default BlogHubClicksDashboard;
