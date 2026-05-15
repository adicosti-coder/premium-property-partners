import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MousePointerClick, Eye, TrendingUp, AlertTriangle, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface GSCRow {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCResponse {
  summary: { clicks: number; impressions: number; ctr: number; position: number; startDate: string; endDate: string; site: string };
  trend: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number; leads?: number }>;
  topQueries: GSCRow[];
  topPages: GSCRow[];
  leads?: { total: number; byDay: Array<{ date: string; leads: number }>; conversionRate: number };
  error?: string;
}

const fmt = (n: number) => new Intl.NumberFormat("ro-RO").format(Math.round(n));

const GooglePerformanceWidget = () => {
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState<7 | 28 | 90>(28);

  const { data, isLoading, error, refetch, isFetching } = useQuery<GSCResponse>({
    queryKey: ["gsc-performance", days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-performance", { body: { days } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const runIndexCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-indexing-alerts", { body: {} });
      if (error) throw error;
      if (data?.issues > 0) {
        toast({ title: `⚠️ ${data.issues} probleme de indexare`, description: `Verificate ${data.checked} pagini. Detalii trimise pe email.`, variant: "destructive" });
      } else {
        toast({ title: "✅ Indexare OK", description: `${data?.checked || 0} pagini verificate, fără probleme.` });
      }
    } catch (e: any) {
      toast({ title: "Eroare verificare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5 text-primary" />
            Performanță Google (Search Console)
          </CardTitle>
          {data?.summary && (
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.site} · {data.summary.startDate} → {data.summary.endDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border overflow-hidden">
            {[7, 28, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d as 7 | 28 | 90)}
                className={`px-2.5 py-1 text-xs font-medium transition ${days === d ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                aria-pressed={days === d}
              >
                {d}z
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={runIndexCheck} disabled={running}>
            {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
            Verifică indexare
          </Button>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Se încarcă date GSC...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        ) : data ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><MousePointerClick className="w-3.5 h-3.5" />Clickuri</div>
                <p className="text-2xl font-bold text-foreground mt-1">{fmt(data.summary.clicks)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="w-3.5 h-3.5" />Impresii</div>
                <p className="text-2xl font-bold text-foreground mt-1">{fmt(data.summary.impressions)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" />CTR mediu</div>
                <p className="text-2xl font-bold text-foreground mt-1">{data.summary.ctr}%</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Search className="w-3.5 h-3.5" />Poziție medie</div>
                <p className="text-2xl font-bold text-foreground mt-1">{data.summary.position}</p>
              </div>
              {data.leads && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 col-span-2 lg:col-span-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5 text-primary" />Conversie SEO → Lead-uri</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Lead-uri în perioadă: <span className="font-semibold text-foreground">{fmt(data.leads.total)}</span> · CTR mediu: <span className="font-semibold text-foreground">{data.summary.ctr}%</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{data.leads.conversionRate}%</p>
                      <p className="text-[10px] text-muted-foreground">lead-uri / clickuri Google</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trend chart */}
            {data.trend.length > 0 && (
              <div className="h-[260px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs fill-muted-foreground" tickFormatter={(d) => d.slice(5)} />
                    <YAxis yAxisId="left" className="text-xs fill-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} name="Clickuri" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Impresii" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} name="Lead-uri" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top queries & pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Top căutări</h4>
                <div className="space-y-1.5">
                  {data.topQueries.slice(0, 8).map((q, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40">
                      <span className="truncate font-medium text-foreground">{q.query}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">{fmt(q.clicks)} clk</Badge>
                        <span className="text-muted-foreground">poz. {q.position}</span>
                      </div>
                    </div>
                  ))}
                  {data.topQueries.length === 0 && <p className="text-xs text-muted-foreground">Fără date.</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Top pagini</h4>
                <div className="space-y-1.5">
                  {data.topPages.slice(0, 8).map((p, i) => (
                    <a key={i} href={p.page} target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40 hover:bg-muted">
                      <span className="truncate font-medium text-foreground flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {p.page?.replace(/^https?:\/\/[^/]+/, "") || "/"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{fmt(p.clicks)} clk</Badge>
                    </a>
                  ))}
                  {data.topPages.length === 0 && <p className="text-xs text-muted-foreground">Fără date.</p>}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default GooglePerformanceWidget;
