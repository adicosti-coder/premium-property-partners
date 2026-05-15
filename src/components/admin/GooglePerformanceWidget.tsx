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
const fmtCompact = (n: number) => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(v);
};

const TREND_LABELS: Record<string, { label: string; color: string; suffix?: string }> = {
  clicks: { label: "Clickuri", color: "hsl(var(--primary))" },
  impressions: { label: "Impresii", color: "hsl(var(--chart-2))" },
  leads: { label: "Lead-uri", color: "hsl(var(--accent))" },
  ctr: { label: "CTR", color: "hsl(var(--chart-3))", suffix: "%" },
  position: { label: "Poziție medie", color: "hsl(var(--chart-4))" },
};

const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const ctr = Number(row.ctr ?? 0);
  const pos = Number(row.position ?? 0);
  const clicks = Number(row.clicks ?? 0);
  const impressions = Number(row.impressions ?? 0);
  const leads = Number(row.leads ?? 0);
  const ctrTone = ctr >= 5 ? "text-emerald-600" : ctr >= 2 ? "text-amber-600" : "text-muted-foreground";
  const posTone = pos > 0 && pos <= 3 ? "text-emerald-600" : pos <= 10 ? "text-amber-600" : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs min-w-[220px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => {
          const meta = TREND_LABELS[p.dataKey] || { label: p.dataKey, color: p.color, suffix: "" };
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                {meta.label}
              </span>
              <span className="font-mono font-medium text-foreground">{fmt(p.value)}{meta.suffix || ""}</span>
            </div>
          );
        })}
        <div className="border-t border-border/60 pt-1.5 mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">CTR</span><span className={`font-mono font-medium ${ctrTone}`}>{ctr}%</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Poziție</span><span className={`font-mono font-medium ${posTone}`}>{pos || "—"}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Clk/Imp</span><span className="font-mono text-foreground">{impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0"}%</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Lead-uri</span><span className="font-mono text-foreground">{leads}</span></div>
        </div>
      </div>
    </div>
  );
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

const GooglePerformanceWidget = () => {
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState<7 | 28 | 90>(28);
  const [pageSize, setPageSize] = useState<number>(10);
  const [queryPage, setQueryPage] = useState(1);
  const [pagePage, setPagePage] = useState(1);
  const [sortBy, setSortBy] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

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
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={fmtCompact} width={48} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={fmtCompact} width={48} />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.2 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} name="Clickuri" dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Impresii" dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="left" type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} name="Lead-uri" dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top queries & pages */}
            {(() => {
              const convRate = data.leads?.conversionRate || 0; // %
              const estLeads = (clicks: number) => Math.round((clicks * convRate) / 100);
              const convBadge = (rate: number) =>
                rate >= 5
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                  : rate >= 2
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/5"
                  : "border-border text-muted-foreground";

              const sorter = (a: GSCRow, b: GSCRow) => {
                const dir = sortDir === 'asc' ? 1 : -1;
                if (sortBy === 'position') return (a.position - b.position) * dir;
                return ((b[sortBy] as number) - (a[sortBy] as number)) * dir;
              };
              const sortedQueries = [...data.topQueries].sort(sorter);
              const sortedPages = [...data.topPages].sort(sorter);

              const qTotal = sortedQueries.length;
              const pTotal = sortedPages.length;
              const qPages = Math.max(1, Math.ceil(qTotal / pageSize));
              const pPages = Math.max(1, Math.ceil(pTotal / pageSize));
              const qPage = Math.min(queryPage, qPages);
              const pPage = Math.min(pagePage, pPages);
              const qSlice = sortedQueries.slice((qPage - 1) * pageSize, qPage * pageSize);
              const pSlice = sortedPages.slice((pPage - 1) * pageSize, pPage * pageSize);

              const Pager = ({ page, pages, total, onPrev, onNext }: { page: number; pages: number; total: number; onPrev: () => void; onNext: () => void }) => (
                <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span>{total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} / {total}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={onPrev} disabled={page <= 1} className="px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                    <span className="font-mono">{page}/{pages}</span>
                    <button onClick={onNext} disabled={page >= pages} className="px-2 py-0.5 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                  </div>
                </div>
              );

              return (
                <>
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Sortare:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setQueryPage(1); setPagePage(1); }}
                        className="bg-background border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Sortare după"
                      >
                        <option value="clicks">Clickuri</option>
                        <option value="impressions">Impresii</option>
                        <option value="ctr">CTR</option>
                        <option value="position">Poziție</option>
                      </select>
                      <button
                        onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                        className="px-1.5 py-0.5 rounded border border-border hover:bg-muted text-muted-foreground"
                        title={sortDir === 'desc' ? 'Descendent' : 'Ascendent'}
                        aria-label={sortDir === 'desc' ? 'Sortare descendentă' : 'Sortare ascendentă'}
                      >
                        {sortDir === 'desc' ? '↓' : '↑'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Pagini:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setQueryPage(1); setPagePage(1); }}
                        className="bg-background border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Rânduri pe pagină"
                      >
                        {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}/pag</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center justify-between">
                        <span>Top căutări</span>
                        <span className="text-[10px] font-normal text-muted-foreground">conv. estimată @ {convRate}%</span>
                      </h4>
                      <div className="space-y-1.5">
                        {qSlice.map((q, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40"
                               title={`Clickuri: ${fmt(q.clicks)}\nImpresii: ${fmt(q.impressions)}\nCTR: ${q.ctr}%\nPoziție: ${q.position}`}>
                            <span className="truncate font-medium text-foreground flex-1">{q.query}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className="text-[10px]">{fmt(q.clicks)} clk</Badge>
                              <Badge variant="outline" className={`text-[10px] ${q.ctr >= 5 ? "border-emerald-500/40 text-emerald-600" : q.ctr >= 2 ? "border-amber-500/40 text-amber-600" : "border-border text-muted-foreground"}`}>
                                CTR {q.ctr}%
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${convBadge(convRate)}`} title="Lead-uri estimate (clickuri × rata globală de conversie)">
                                ~{estLeads(q.clicks)} lead
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {qTotal === 0 && <p className="text-xs text-muted-foreground">Fără date.</p>}
                      </div>
                      {qTotal > pageSize && (
                        <Pager page={qPage} pages={qPages} total={qTotal} onPrev={() => setQueryPage((p) => Math.max(1, p - 1))} onNext={() => setQueryPage((p) => Math.min(qPages, p + 1))} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center justify-between">
                        <span>Top pagini</span>
                        <span className="text-[10px] font-normal text-muted-foreground">conv. estimată @ {convRate}%</span>
                      </h4>
                      <div className="space-y-1.5">
                        {pSlice.map((p, i) => (
                          <a key={i} href={p.page} target="_blank" rel="noopener noreferrer"
                             title={`Clickuri: ${fmt(p.clicks)}\nImpresii: ${fmt(p.impressions)}\nCTR: ${p.ctr}%\nPoziție: ${p.position}`}
                             className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40 hover:bg-muted">
                            <span className="truncate font-medium text-foreground flex items-center gap-1 flex-1">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {p.page?.replace(/^https?:\/\/[^/]+/, "") || "/"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className="text-[10px]">{fmt(p.clicks)} clk</Badge>
                              <Badge variant="outline" className={`text-[10px] ${p.ctr >= 5 ? "border-emerald-500/40 text-emerald-600" : p.ctr >= 2 ? "border-amber-500/40 text-amber-600" : "border-border text-muted-foreground"}`}>
                                CTR {p.ctr}%
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${convBadge(convRate)}`} title="Lead-uri estimate (clickuri × rata globală de conversie)">
                                ~{estLeads(p.clicks)} lead
                              </Badge>
                            </div>
                          </a>
                        ))}
                        {pTotal === 0 && <p className="text-xs text-muted-foreground">Fără date.</p>}
                      </div>
                      {pTotal > pageSize && (
                        <Pager page={pPage} pages={pPages} total={pTotal} onPrev={() => setPagePage((p) => Math.max(1, p - 1))} onNext={() => setPagePage((p) => Math.min(pPages, p + 1))} />
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default GooglePerformanceWidget;
