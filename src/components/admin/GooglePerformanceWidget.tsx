import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MousePointerClick, Eye, TrendingUp, AlertTriangle, RefreshCw, ExternalLink, ShieldCheck, Send, BarChart3, Activity, FileDown, KeyRound } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { notifyIndexNow } from "@/hooks/useIndexNowNotify";

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
  const [reindexing, setReindexing] = useState<string | null>(null);
  const [bulkReindexing, setBulkReindexing] = useState(false);
  const [days, setDays] = useState<7 | 28 | 90>(28);
  const [pageSize, setPageSize] = useState<number>(10);
  const [queryPage, setQueryPage] = useState(1);
  const [pagePage, setPagePage] = useState(1);
  const [sortBy, setSortBy] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [tab, setTab] = useState<'performance' | 'keywords' | 'indexing'>('performance');
  const [exporting, setExporting] = useState(false);

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

  const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded">
          <Skeleton className="h-4 w-3/5" />
          <div className="ml-auto flex gap-1.5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );

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

  const requestReindex = async (url: string) => {
    if (!url) return;
    setReindexing(url);
    try {
      await notifyIndexNow([url]);
      toast({ title: "🔄 Re-indexare cerută", description: `Trimis la IndexNow (Bing/Yandex). Pentru Google, deschide URL Inspection în Search Console.` });
    } catch (e: any) {
      toast({ title: "Eroare re-indexare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setReindexing(null);
    }
  };

  const requestBulkReindex = async (urls: string[]) => {
    if (!urls.length) return;
    setBulkReindexing(true);
    try {
      await notifyIndexNow(urls);
      toast({ title: `🔄 Re-indexare bulk cerută`, description: `${urls.length} pagini trimise la IndexNow (Bing/Yandex).` });
    } catch (e: any) {
      toast({ title: "Eroare re-indexare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setBulkReindexing(false);
    }
  };

  const gscInspectUrl = (url: string) => {
    const site = data?.summary?.site || "";
    const sc = encodeURIComponent(site);
    const u = encodeURIComponent(url);
    return `https://search.google.com/search-console/inspect?resource_id=${sc}&id=${u}`;
  };

  const exportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      // Header
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, pageW, 70, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Raport SEO — Search Console", margin, 32);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(212, 175, 55);
      doc.text(`${data.summary.site}  ·  ${data.summary.startDate} → ${data.summary.endDate}  ·  ${days} zile`, margin, 52);
      y = 100;

      // Summary KPIs
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Sumar performanță", margin, y);
      y += 6;
      autoTable(doc, {
        startY: y + 6,
        head: [["Metric", "Valoare"]],
        body: [
          ["Clickuri", fmt(data.summary.clicks)],
          ["Impresii", fmt(data.summary.impressions)],
          ["CTR mediu", `${data.summary.ctr}%`],
          ["Poziție medie", String(data.summary.position)],
        ],
        theme: "striped",
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Conversion summary
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text("Sumar rate de conversie (SEO → Lead-uri)", margin, y);
      y += 6;
      const convRate = data.leads?.conversionRate || 0;
      const totalLeads = data.leads?.total || 0;
      const totalClicks = data.summary.clicks || 0;
      const impressionToClick = data.summary.impressions > 0 ? (totalClicks / data.summary.impressions) * 100 : 0;
      const impressionToLead = data.summary.impressions > 0 ? (totalLeads / data.summary.impressions) * 100 : 0;
      autoTable(doc, {
        startY: y + 6,
        head: [["Metric conversie", "Valoare", "Detalii"]],
        body: [
          ["Lead-uri în perioadă", fmt(totalLeads), `${days} zile`],
          ["Rata conversie SEO → Lead", `${convRate}%`, "lead-uri / clickuri Google"],
          ["Rata click-through (CTR)", `${impressionToClick.toFixed(2)}%`, "clickuri / impresii"],
          ["Funnel total Impresii → Lead", `${impressionToLead.toFixed(3)}%`, "lead-uri / impresii"],
          ["Estimat lead-uri @ +10% trafic", fmt(Math.round((totalClicks * 1.1 * convRate) / 100)), "proiecție"],
        ],
        theme: "grid",
        headStyles: { fillColor: [212, 175, 55], textColor: 20 },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Top queries
      const sorter = (a: GSCRow, b: GSCRow) => (b.clicks - a.clicks);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Top căutări (cuvinte cheie)", margin, y);
      autoTable(doc, {
        startY: y + 10,
        head: [["#", "Query", "Clk", "Imp", "CTR", "Poz", "Lead est."]],
        body: [...data.topQueries].sort(sorter).slice(0, 25).map((q, i) => [
          String(i + 1),
          q.query || "—",
          fmt(q.clicks),
          fmt(q.impressions),
          `${q.ctr}%`,
          String(q.position),
          String(Math.round((q.clicks * convRate) / 100)),
        ]),
        theme: "striped",
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { cellWidth: 200 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      if (y > 700) { doc.addPage(); y = margin; }

      // Top pages
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Top pagini", margin, y);
      autoTable(doc, {
        startY: y + 10,
        head: [["#", "Pagină", "Clk", "Imp", "CTR", "Poz", "Lead est."]],
        body: [...data.topPages].sort(sorter).slice(0, 25).map((p, i) => [
          String(i + 1),
          (p.page || "/").replace(/^https?:\/\/[^/]+/, "") || "/",
          fmt(p.clicks),
          fmt(p.impressions),
          `${p.ctr}%`,
          String(p.position),
          String(Math.round((p.clicks * convRate) / 100)),
        ]),
        theme: "striped",
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { cellWidth: 220 } },
        margin: { left: margin, right: margin },
      });

      // Footer pe fiecare pagină
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `RealTrust · Raport generat ${new Date().toLocaleDateString("ro-RO")} · pag. ${i}/${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 20
        );
      }

      doc.save(`raport-seo-${data.summary.startDate}_${data.summary.endDate}.pdf`);
      toast({ title: "📄 Raport SEO exportat", description: "PDF descărcat cu sumar conversii." });
    } catch (e: any) {
      toast({ title: "Eroare export PDF", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setExporting(false);
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
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exporting || !data} className="h-7 text-xs">
            {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
            Export PDF
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Performanță</TabsTrigger>
              <TabsTrigger value="keywords" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" />Cuvinte cheie</TabsTrigger>
              <TabsTrigger value="indexing" className="gap-1.5"><Activity className="w-3.5 h-3.5" />Status indexare</TabsTrigger>
            </TabsList>
            <TabsContent value="performance" className="space-y-4 mt-0">
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
              <div className="h-[260px] mt-2 font-sans relative">
                {isFetching && (
                  <div className="absolute top-1 right-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-0.5 rounded-full border border-border">
                    <Loader2 className="w-3 h-3 animate-spin" /> Actualizare...
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'inherit' }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'inherit' }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={fmtCompact} width={48} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'inherit' }} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={fmtCompact} width={48} />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.2 }} wrapperStyle={{ fontFamily: 'inherit' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: 'inherit' }} iconType="circle" />
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
            </TabsContent>

            <TabsContent value="indexing" className="space-y-4 mt-0">
              {/* Bulk actions */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" /> Verificare & re-indexare
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Rulează auditul de indexare sau cere re-indexare pentru paginile cu trafic.
                      Re-indexarea folosește IndexNow (Bing/Yandex) — pentru Google deschide URL Inspection.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={runIndexCheck} disabled={running}>
                      {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                      Verifică indexare
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => requestBulkReindex(data.topPages.map(p => p.page!).filter(Boolean))}
                      disabled={bulkReindexing || !data.topPages.length}
                    >
                      {bulkReindexing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                      Re-indexare top {data.topPages.length}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Per-page indexing controls */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Pagini cu trafic — control indexare</h4>
                <div className="space-y-1.5">
                  {data.topPages.length === 0 && (
                    <p className="text-xs text-muted-foreground">Fără pagini de afișat.</p>
                  )}
                  {data.topPages.map((p, i) => {
                    const url = p.page || "";
                    const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
                    const isLoading = reindexing === url;
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <a href={url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-foreground hover:underline">
                            {path}
                          </a>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{fmt(p.clicks)} clk</Badge>
                          <Badge variant="outline" className="text-[10px] shrink-0">poz. {p.position}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={gscInspectUrl(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1"
                            title="Deschide URL Inspection în Google Search Console"
                          >
                            GSC <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => requestReindex(url)}
                            disabled={isLoading || !url}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                            Re-indexare
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default GooglePerformanceWidget;
