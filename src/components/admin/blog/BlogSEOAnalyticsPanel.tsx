import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Coins, Search, LineChart as LineIcon, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const CPC_EUR = 0.45;
const RANGES = [7, 30, 90] as const;
type Range = typeof RANGES[number];

interface DayRow {
  day: string; score: number | null; clicks: number;
}

export const BlogSEOAnalyticsPanel = () => {
  const [range, setRange] = useState<Range>(30);
  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - range); return d.toISOString();
  }, [range]);
  const prevSince = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - range * 2); return d.toISOString();
  }, [range]);

  const { data: audits = [], isLoading: la } = useQuery({
    queryKey: ["blog-seo-audits", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audits")
        .select("url, overall_score, created_at")
        .gte("created_at", prevSince)
        .ilike("url", "%/blog/%")
        .order("created_at", { ascending: true })
        .limit(3000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: gsc = [], isLoading: lg } = useQuery({
    queryKey: ["blog-gsc-daily", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_gsc_daily" as any)
        .select("date, clicks, impressions, page")
        .gte("date", prevSince.slice(0, 10))
        .ilike("page", "%/blog/%")
        .order("date", { ascending: true })
        .limit(5000);
      if (error) return [];
      return (data as any[]) ?? [];
    },
  });

  const series: DayRow[] = useMemo(() => {
    const map = new Map<string, { scores: number[]; clicks: number }>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), { scores: [], clicks: 0 });
    }
    audits.forEach((a: any) => {
      const day = new Date(a.created_at).toISOString().slice(0, 10);
      const entry = map.get(day); if (entry && a.overall_score != null) entry.scores.push(a.overall_score);
    });
    gsc.forEach((g: any) => {
      const day = String(g.date).slice(0, 10);
      const entry = map.get(day); if (entry) entry.clicks += g.clicks ?? 0;
    });
    return Array.from(map.entries()).map(([day, v]) => ({
      day: day.slice(5),
      score: v.scores.length ? Math.round((v.scores.reduce((s, x) => s + x, 0) / v.scores.length) * 10) / 10 : null,
      clicks: v.clicks,
    }));
  }, [audits, gsc, range]);

  const totals = useMemo(() => {
    const clicksNow = series.reduce((s, r) => s + r.clicks, 0);
    // previous period from gsc
    const cutStart = new Date(prevSince).getTime();
    const cutMid = new Date(since).getTime();
    let clicksPrev = 0;
    gsc.forEach((g: any) => {
      const t = new Date(g.date).getTime();
      if (t >= cutStart && t < cutMid) clicksPrev += g.clicks ?? 0;
    });
    const scores = series.filter((r) => r.score != null).map((r) => r.score as number);
    const scoreAvg = scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : null;
    const roi = Math.round(clicksNow * CPC_EUR * 100) / 100;
    const roiPrev = Math.round(clicksPrev * CPC_EUR * 100) / 100;
    const delta = clicksPrev > 0 ? Math.round(((clicksNow - clicksPrev) / clicksPrev) * 1000) / 10 : null;
    return { clicksNow, clicksPrev, scoreAvg, roi, roiPrev, delta };
  }, [series, gsc, since, prevSince]);

  const loading = la || lg;

  return (
    <div className="space-y-4">
      {/* Range toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Interval:</span>
        {RANGES.map((r) => (
          <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
            {r} zile
          </Button>
        ))}
      </div>

      {/* Premium ROI card */}
      <Card
        className="relative overflow-hidden border-0"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
          boxShadow: "0 10px 40px -10px rgba(212,175,55,0.35), inset 0 0 0 1px rgba(212,175,55,0.35)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{ background: "radial-gradient(ellipse at top right, rgba(212,175,55,0.25), transparent 60%)" }}
        />
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" style={{ color: "#D4AF37" }} />
                ROI SEO Estimat · Blog
              </CardTitle>
              <CardDescription>
                Clicks organice × <span className="font-semibold">{CPC_EUR.toFixed(2)} €</span> CPC estimat (regim hotelier)
              </CardDescription>
            </div>
            {totals.delta != null && (
              <Badge variant="outline" className={`gap-1 ${totals.delta >= 0 ? "text-green-600 border-green-500/40" : "text-destructive border-destructive/40"}`}>
                {totals.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {totals.delta > 0 ? "+" : ""}{totals.delta}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">ROI perioada</div>
              <div className="mt-1 text-4xl font-bold tabular-nums" style={{ color: "#D4AF37" }}>
                {totals.roi.toLocaleString("ro-RO", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                vs. perioada anterioară: {totals.roiPrev.toLocaleString("ro-RO", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Clicks organice</div>
              <div className="mt-1 text-4xl font-bold tabular-nums">{totals.clicksNow.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Search className="h-3 w-3" /> Google Search Console · /blog/*
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Scor SEO mediu</div>
              <div className="mt-1 text-4xl font-bold tabular-nums">
                {totals.scoreAvg != null ? totals.scoreAvg : "—"}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">audituri /blog/*</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineIcon className="h-4 w-4 text-primary" /> Evoluție scor SEO & trafic organic
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Se încarcă…
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis yAxisId="score" domain={[0, 100]} stroke="hsl(var(--primary))" fontSize={11} />
                  <YAxis yAxisId="clicks" orientation="right" stroke="#D4AF37" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="score" type="monotone" dataKey="score" name="Scor SEO" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                  <Line yAxisId="clicks" type="monotone" dataKey="clicks" name="Clicks organice" stroke="#D4AF37" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogSEOAnalyticsPanel;
