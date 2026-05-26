import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";
import { TrendingDown, TrendingUp, MousePointerClick, Target, Euro, Activity } from "lucide-react";

// Cost estimates (EUR) – ajustabile dintr-un singur loc
const COST_DEWATERMARK_PER_IMG = 0.01;
const COST_GEMINI_PER_ENRICHMENT = 0.005;

const STALE = 5 * 60 * 1000; // 5 min

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const dateDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10);

type Snapshot = {
  date: string;
  gsc_impressions: number;
  gsc_clicks: number;
  ga4_users: number;
  ad_spend_eur: number;
};

type Prospect = {
  id: string;
  source_platform: string | null;
  enrichment_status: string | null;
  created_at: string | null;
};

function useMarketingSnapshots(days: number) {
  return useQuery({
    queryKey: ["marketing_snapshot", days],
    staleTime: STALE,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("marketing_snapshot")
        .select("date, gsc_impressions, gsc_clicks, ga4_users, ad_spend_eur")
        .gte("date", dateDaysAgo(days))
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
  });
}

function useProspects(days: number) {
  return useQuery({
    queryKey: ["prospect_listings_perf", days],
    staleTime: STALE,
    queryFn: async (): Promise<Prospect[]> => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id, source_platform, enrichment_status, created_at")
        .gte("created_at", isoDaysAgo(days))
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Prospect[];
    },
  });
}


function usePublishedDrafts(days: number) {
  return useQuery({
    queryKey: ["published_drafts_perf", days],
    staleTime: STALE,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .not("imported_at", "is", null)
        .gte("imported_at", isoDaysAgo(days));
      if (error) throw error;
      return count ?? 0;
    },
  });
}

const Kpi = ({
  label, value, hint, icon: Icon, trend,
}: { label: string; value: string; hint?: string; icon: any; trend?: "up" | "down" | null }) => (
  <Card>
    <CardContent className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="text-xl font-bold mt-1 flex items-center gap-2">
        {value}
        {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </CardContent>
  </Card>
);

export function PerformanceROIPanel() {
  const snap30 = useMarketingSnapshots(30);
  const snap14 = useMarketingSnapshots(14);
  const prospects30 = useProspects(30);
  const drafts30 = usePublishedDrafts(30);

  const loading =
    snap30.isLoading || snap14.isLoading || prospects30.isLoading || drafts30.isLoading;

  // Compute CPL
  const adSpend30 = (snap30.data ?? []).reduce((s, r) => s + Number(r.ad_spend_eur || 0), 0);
  const allProspects = prospects30.data ?? [];
  const doneProspects = allProspects.filter((p) => p.enrichment_status === "done");
  const enrichedCount = allProspects.filter((p) =>
    ["done", "enriching", "processing"].includes(p.enrichment_status ?? ""),
  ).length;
  // Estimate: ~4 images per enrichment processing
  const apiCost = enrichedCount * (COST_GEMINI_PER_ENRICHMENT + 4 * COST_DEWATERMARK_PER_IMG);
  const totalCost = adSpend30 + apiCost;
  const cpl = doneProspects.length > 0 ? totalCost / doneProspects.length : 0;

  // CPL trend: compare last 15d vs prior 15d
  const half = (snap30.data ?? []).slice(-15);
  const halfSpend = half.reduce((s, r) => s + Number(r.ad_spend_eur || 0), 0);
  const priorSpend = adSpend30 - halfSpend;
  const cplTrend: "up" | "down" | null =
    halfSpend > priorSpend ? "up" : halfSpend < priorSpend ? "down" : null;

  const clicks30 = (snap30.data ?? []).reduce((s, r) => s + (r.gsc_clicks || 0), 0);

  // Conversion rate
  const convRate =
    allProspects.length > 0 ? ((drafts30.data ?? 0) / allProspects.length) * 100 : 0;

  // Chart data: last 14 days, clicks vs prospects entering enrichment
  const chartData = (() => {
    const map = new Map<string, { date: string; clicks: number; enrichment: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), clicks: 0, enrichment: 0 });
    }
    for (const s of snap14.data ?? []) {
      const k = s.date.slice(5);
      const entry = [...map.values()].find((v) => v.date === k);
      if (entry) entry.clicks = s.gsc_clicks || 0;
    }
    for (const p of allProspects) {
      const k = p.created_at.slice(0, 10);
      const entry = map.get(k);
      if (entry && ["done", "enriching", "processing"].includes(p.enrichment_status ?? "")) {
        entry.enrichment += 1;
      }
    }
    return [...map.values()];
  })();

  // Source efficiency
  const sources = (() => {
    const acc = new Map<string, { total: number; done: number }>();
    for (const p of allProspects) {
      const key = (p.source || "necunoscut").toLowerCase();
      const cur = acc.get(key) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (p.enrichment_status === "done") cur.done += 1;
      acc.set(key, cur);
    }
    return [...acc.entries()]
      .map(([source, v]) => ({
        source,
        total: v.total,
        done: v.done,
        rate: v.total > 0 ? (v.done / v.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  })();

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const noSnapshotData = (snap30.data ?? []).length === 0;

  return (
    <div className="space-y-4">
      {noSnapshotData && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 text-xs flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" />
            <span>
              Încă nu există date în <code>marketing_snapshot</code>. Conectează un flux Make.com care să facă upsert zilnic cu GSC + GA4. KPI-urile bazate pe trafic vor afișa 0 până atunci.
            </span>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Kpi
          label="CPL Mediu (30z)"
          value={cpl > 0 ? `${cpl.toFixed(2)} €` : "—"}
          hint={`Total cost: ${totalCost.toFixed(2)}€ · Leads done: ${doneProspects.length}`}
          icon={Euro}
          trend={cplTrend}
        />
        <Kpi
          label="Clicuri Google (30z)"
          value={clicks30.toLocaleString("ro-RO")}
          hint={`Impresii: ${(snap30.data ?? []).reduce((s, r) => s + (r.gsc_impressions || 0), 0).toLocaleString("ro-RO")}`}
          icon={MousePointerClick}
        />
        <Kpi
          label="Conversie Pipeline"
          value={`${convRate.toFixed(1)}%`}
          hint={`${drafts30.data ?? 0} drafturi / ${allProspects.length} prospecți`}
          icon={Target}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Corelație trafic vs. oportunități (14z)</CardTitle>
          <CardDescription className="text-xs">
            Clicuri Google Search (linie) comparativ cu prospecți intrați în enrichment (bar).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="enrichment" name="Prospecți → Enrichment" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicuri GSC"
                  stroke="hsl(var(--accent-foreground))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Source efficiency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Eficiență pe sursă (30z)</CardTitle>
          <CardDescription className="text-xs">
            Câți prospecți au intrat din fiecare sursă vs. câți au trecut filtrele până la „done".
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sources.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">Niciun prospect în ultimele 30 zile.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sursă</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                  <TableHead className="text-right">Rată</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="capitalize font-medium">{s.source}</TableCell>
                    <TableCell className="text-right">{s.total}</TableCell>
                    <TableCell className="text-right">{s.done}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.rate >= 30 ? "default" : s.rate >= 15 ? "secondary" : "outline"}>
                        {s.rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-[10px] text-muted-foreground px-1">
        Costuri API estimate: {COST_DEWATERMARK_PER_IMG}€/poză Dewatermark · {COST_GEMINI_PER_ENRICHMENT}€/enrichment Gemini · cache 5 min.
      </div>
    </div>
  );
}

export default PerformanceROIPanel;
