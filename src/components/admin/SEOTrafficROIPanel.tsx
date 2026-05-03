import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  ZAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  Loader2, RefreshCw, Download, TrendingUp, TrendingDown, AlertTriangle, Activity,
} from "lucide-react";
import { toast } from "sonner";

interface GA4Row {
  id: string;
  url_path: string;
  sessions: number;
  conversions: number;
  engagement_rate: number;
  period_start: string;
  updated_at: string;
}

interface AuditRow {
  url: string;
  overall_score: number | null;
  created_at: string;
}

type FilterMode = "all" | "high_conv" | "declining" | "critical";

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return full.startsWith("/") ? full : "/";
  }
};

const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const csv = "\uFEFF" + rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
};

export const SEOTrafficROIPanel = () => {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["seo-ga4-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_ga4_metrics" as any)
        .select("*")
        .order("period_start", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as GA4Row[];
    },
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["seo-audits-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audits")
        .select("url, overall_score, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  // Latest audit score per path
  const scoreByPath = useMemo(() => {
    const m = new Map<string, number>();
    audits.forEach((a) => {
      const p = urlToPath(a.url);
      if (!m.has(p) && a.overall_score != null) m.set(p, a.overall_score);
    });
    return m;
  }, [audits]);

  // Aggregate latest period per path + previous period for trend
  const joined = useMemo(() => {
    const latest = new Map<string, GA4Row>();
    const previous = new Map<string, GA4Row>();
    metrics.forEach((m) => {
      const cur = latest.get(m.url_path);
      if (!cur || new Date(m.period_start) > new Date(cur.period_start)) {
        if (cur) previous.set(m.url_path, cur);
        latest.set(m.url_path, m);
      } else {
        const prev = previous.get(m.url_path);
        if (!prev || new Date(m.period_start) > new Date(prev.period_start)) {
          previous.set(m.url_path, m);
        }
      }
    });
    return Array.from(latest.values()).map((row) => {
      const prev = previous.get(row.url_path);
      const seoScore = scoreByPath.get(row.url_path) ?? null;
      const opportunityScore = seoScore && seoScore > 0 ? row.conversions / seoScore : row.conversions;
      const trend = prev ? row.sessions - prev.sessions : 0;
      const isCritical = row.sessions > 500 && (seoScore ?? 100) < 60;
      return {
        ...row,
        seoScore,
        opportunityScore: Math.round(opportunityScore * 100) / 100,
        trend,
        isCritical,
      };
    });
  }, [metrics, scoreByPath]);

  const filtered = useMemo(() => {
    let rows = joined;
    if (search) rows = rows.filter((r) => r.url_path.toLowerCase().includes(search.toLowerCase()));
    if (filter === "high_conv") rows = rows.filter((r) => r.conversions >= 5);
    if (filter === "declining") rows = rows.filter((r) => r.trend < 0);
    if (filter === "critical") rows = rows.filter((r) => r.isCritical);
    return rows.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [joined, filter, search]);

  const bubbleData = useMemo(
    () =>
      joined
        .filter((r) => r.seoScore != null)
        .map((r) => ({
          x: r.seoScore,
          y: r.sessions,
          z: Math.max(r.conversions, 1),
          path: r.url_path,
          isCritical: r.isCritical,
        })),
    [joined]
  );

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Conectare la GA4 (ultimele 30 de zile)…");
    try {
      const { data, error } = await supabase.functions.invoke("ga4-analytics-import", {
        body: { days: 30 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const imported = (data as any)?.imported ?? 0;
      toast.success(`GA4 sincronizat: ${imported} pagini importate`);
      qc.invalidateQueries({ queryKey: ["seo-ga4-metrics"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare la sincronizare GA4");
    } finally {
      setSyncing(false);
    }
  };

  const exportCSV = () => {
    const header = ["URL", "Sesiuni", "Conversii", "Engagement", "Scor SEO", "Opportunity Score", "Trend Sesiuni", "Critic"];
    const rows = [header, ...filtered.map((r) => [
      r.url_path,
      r.sessions,
      r.conversions,
      r.engagement_rate,
      r.seoScore ?? "",
      r.opportunityScore,
      r.trend,
      r.isCritical ? "DA" : "NU",
    ])];
    downloadCSV(`seo-roi-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Raport ROI exportat");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              SEO Traffic & ROI Insights
            </CardTitle>
            <CardDescription>
              Corelare GA4 ↔ Audit SEO. Identifică pagini cu trafic mare și optimizare slabă.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync GA4 Data
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
              <Download className="h-4 w-4" /> Export ROI Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">Prioritizare Inteligentă</TabsTrigger>
            <TabsTrigger value="bubble">Bubble Chart (SEO × Trafic × Conversii)</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Caută URL…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                Toate ({joined.length})
              </Button>
              <Button variant={filter === "high_conv" ? "default" : "outline"} size="sm" onClick={() => setFilter("high_conv")}>
                Conversii mari
              </Button>
              <Button variant={filter === "declining" ? "default" : "outline"} size="sm" onClick={() => setFilter("declining")}>
                <TrendingDown className="h-3.5 w-3.5" /> Trafic în scădere
              </Button>
              <Button variant={filter === "critical" ? "destructive" : "outline"} size="sm" onClick={() => setFilter("critical")}>
                <AlertTriangle className="h-3.5 w-3.5" /> Critice
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Se încarcă…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nu există date GA4 încă. Apasă <strong>Sync GA4 Data</strong> pentru a importa.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead className="text-right">Sesiuni</TableHead>
                      <TableHead className="text-right">Conversii</TableHead>
                      <TableHead className="text-right">Eng.</TableHead>
                      <TableHead className="text-right">Scor SEO</TableHead>
                      <TableHead className="text-right">Opportunity</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs max-w-[220px] truncate">{r.url_path}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.sessions.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{r.conversions}</TableCell>
                        <TableCell className="text-right tabular-nums">{(r.engagement_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-right">
                          {r.seoScore != null ? (
                            <Badge variant={r.seoScore >= 70 ? "default" : r.seoScore >= 50 ? "secondary" : "destructive"}>
                              {r.seoScore}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {r.opportunityScore.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center gap-1 text-xs ${r.trend > 0 ? "text-green-600" : r.trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {r.trend > 0 ? <TrendingUp className="h-3 w-3" /> : r.trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                            {r.trend > 0 ? "+" : ""}{r.trend}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.isCritical && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> CRITIC
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bubble">
            {bubbleData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Necesar: date GA4 + audituri SEO pentru a afișa graficul.
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Scor SEO"
                      domain={[0, 100]}
                      label={{ value: "Scor SEO", position: "insideBottom", offset: -10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Sesiuni"
                      label={{ value: "Sesiuni", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 600]} name="Conversii" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p: any = payload[0].payload;
                        return (
                          <div className="bg-background border rounded p-2 text-xs shadow-lg">
                            <div className="font-mono font-medium">{p.path}</div>
                            <div>Scor SEO: {p.x}</div>
                            <div>Sesiuni: {p.y}</div>
                            <div>Conversii: {p.z}</div>
                            {p.isCritical && <div className="text-destructive font-semibold">⚠ CRITIC</div>}
                          </div>
                        );
                      }}
                    />
                    <Scatter data={bubbleData} fill="hsl(var(--primary))">
                      {bubbleData.map((d, i) => (
                        <Cell key={i} fill={d.isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
