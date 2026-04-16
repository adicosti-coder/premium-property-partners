import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Target, Clock, Zap, BarChart3 } from "lucide-react";

interface AnalyticsLead {
  id: string;
  status: string;
  source: string | null;
  search_keyword: string | null;
  lead_score: number;
  created_at: string;
  is_priority?: boolean;
  neighborhood_slug?: string | null;
}

interface StatusHist {
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

const FUNNEL_ORDER = ["new", "reviewed", "contacted", "interested", "meeting", "converted"] as const;
const FUNNEL_LABELS: Record<string, string> = {
  new: "🆕 Noi", reviewed: "👁️ Revizuiți", contacted: "📱 Contactați",
  interested: "🤝 Interesați", meeting: "📅 Programați", converted: "✅ Clienți",
};
const COLORS = ["hsl(217 91% 60%)", "hsl(45 93% 58%)", "hsl(25 95% 58%)", "hsl(160 84% 45%)", "hsl(258 90% 66%)", "hsl(142 71% 45%)"];

interface Props {
  leads: AnalyticsLead[];
}

export const ScraperAnalyticsDashboard = ({ leads }: Props) => {
  // Pull status history for time-to-convert calc
  const { data: history = [] } = useQuery({
    queryKey: ["scraper-status-history-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_lead_status_history")
        .select("lead_id, old_status, new_status, changed_at")
        .order("changed_at", { ascending: true })
        .limit(2000);
      return (data || []) as StatusHist[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // 1. Funnel
  const funnel = useMemo(() => {
    const counts: Record<string, number> = {};
    FUNNEL_ORDER.forEach((s) => (counts[s] = 0));
    leads.forEach((l) => {
      const idx = FUNNEL_ORDER.indexOf(l.status as any);
      // Count this status AND all stages reached prior (cumulative)
      if (idx >= 0) for (let i = 0; i <= idx; i++) counts[FUNNEL_ORDER[i]]++;
      else if (l.status === "converted") FUNNEL_ORDER.forEach((s) => counts[s]++);
    });
    const total = counts.new || 1;
    return FUNNEL_ORDER.map((s) => ({
      stage: FUNNEL_LABELS[s],
      count: counts[s],
      pct: Math.round((counts[s] / total) * 100),
    }));
  }, [leads]);

  // 2. Conversion rate per source
  const sourceStats = useMemo(() => {
    const map = new Map<string, { total: number; converted: number; contacted: number }>();
    leads.forEach((l) => {
      const src = l.source || "Necunoscut";
      const cur = map.get(src) || { total: 0, converted: 0, contacted: 0 };
      cur.total++;
      if (l.status === "converted") cur.converted++;
      if (["contacted", "interested", "meeting", "converted"].includes(l.status)) cur.contacted++;
      map.set(src, cur);
    });
    return Array.from(map.entries())
      .map(([source, s]) => ({
        source,
        total: s.total,
        responseRate: Math.round((s.contacted / s.total) * 100),
        conversionRate: s.total ? Math.round((s.converted / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [leads]);

  // 3. Top keywords by volume + score avg
  const keywordStats = useMemo(() => {
    const map = new Map<string, { count: number; scoreSum: number; converted: number }>();
    leads.forEach((l) => {
      const kw = (l.search_keyword || "").trim();
      if (!kw) return;
      const cur = map.get(kw) || { count: 0, scoreSum: 0, converted: 0 };
      cur.count++;
      cur.scoreSum += l.lead_score || 0;
      if (l.status === "converted") cur.converted++;
      map.set(kw, cur);
    });
    return Array.from(map.entries())
      .map(([keyword, s]) => ({
        keyword: keyword.length > 30 ? keyword.slice(0, 28) + "…" : keyword,
        count: s.count,
        avgScore: Math.round(s.scoreSum / s.count),
        converted: s.converted,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [leads]);

  // 4. Avg time-to-convert (days)
  const timeToConvert = useMemo(() => {
    const byLead = new Map<string, { firstSeen?: number; converted?: number }>();
    history.forEach((h) => {
      const t = new Date(h.changed_at).getTime();
      const cur = byLead.get(h.lead_id) || {};
      if (!cur.firstSeen || t < cur.firstSeen) cur.firstSeen = t;
      if (h.new_status === "converted") cur.converted = t;
      byLead.set(h.lead_id, cur);
    });
    const durations: number[] = [];
    byLead.forEach((v) => {
      if (v.firstSeen && v.converted && v.converted > v.firstSeen) {
        durations.push((v.converted - v.firstSeen) / (1000 * 60 * 60 * 24));
      }
    });
    if (durations.length === 0) return { avg: 0, min: 0, max: 0, n: 0 };
    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.round(Math.min(...durations)),
      max: Math.round(Math.max(...durations)),
      n: durations.length,
    };
  }, [history]);

  // 5. Activity heatmap (day-of-week × hour)
  const activityHeatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    leads.forEach((l) => {
      const d = new Date(l.created_at);
      grid[d.getDay()][d.getHours()]++;
    });
    return grid;
  }, [leads]);

  const maxHeat = Math.max(1, ...activityHeatmap.flat());

  // 6. Overall conversion KPI
  const overallConv = useMemo(() => {
    const total = leads.length || 1;
    const converted = leads.filter((l) => l.status === "converted").length;
    const contacted = leads.filter((l) => ["contacted", "interested", "meeting", "converted"].includes(l.status)).length;
    return {
      conversionRate: Math.round((converted / total) * 100),
      responseRate: Math.round((contacted / total) * 100),
      converted,
      total: leads.length,
    };
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Target className="w-4 h-4" />} label="Rata conversie" value={`${overallConv.conversionRate}%`} sub={`${overallConv.converted}/${overallConv.total}`} color="text-emerald-500" />
        <KpiCard icon={<Zap className="w-4 h-4" />} label="Rata răspuns" value={`${overallConv.responseRate}%`} sub="contactați+" color="text-orange-500" />
        <KpiCard icon={<Clock className="w-4 h-4" />} label="Timp mediu conversie" value={timeToConvert.n ? `${timeToConvert.avg} zile` : "—"} sub={timeToConvert.n ? `${timeToConvert.min}–${timeToConvert.max} zile` : "fără date"} color="text-blue-500" />
        <KpiCard icon={<BarChart3 className="w-4 h-4" />} label="Lead-uri analizate" value={leads.length} sub="în filtrul curent" color="text-violet-500" />
      </div>

      {/* Funnel + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Funnel conversie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.map((f, i) => (
                <div key={f.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{f.stage}</span>
                    <span className="font-mono text-muted-foreground">{f.count} ({f.pct}%)</span>
                  </div>
                  <div className="h-6 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${f.pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performanță per sursă</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Fără date</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sourceStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="responseRate" name="% Răspuns" fill="hsl(25 95% 58%)" />
                  <Bar dataKey="conversionRate" name="% Conversie" fill="hsl(142 71% 45%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Keywords + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top cuvinte cheie</CardTitle>
          </CardHeader>
          <CardContent>
            {keywordStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Fără date</p>
            ) : (
              <div className="space-y-2">
                {keywordStats.map((k) => (
                  <div key={k.keyword} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 font-mono truncate" title={k.keyword}>{k.keyword}</span>
                    <Badge variant="outline" className="shrink-0">{k.count}</Badge>
                    <Badge variant="secondary" className="shrink-0">⌀ {k.avgScore}</Badge>
                    {k.converted > 0 && <Badge className="bg-green-500/15 text-green-600 border-green-500/20 shrink-0">✅ {k.converted}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Heatmap activitate (zi × oră)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="text-[9px] font-mono w-full">
                <thead>
                  <tr>
                    <th className="text-left pr-1"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="text-center px-0.5 text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["D", "L", "M", "Mi", "J", "V", "S"].map((day, di) => (
                    <tr key={day}>
                      <td className="pr-1 text-muted-foreground font-semibold">{day}</td>
                      {activityHeatmap[di].map((v, hi) => {
                        const intensity = v / maxHeat;
                        return (
                          <td key={hi} className="text-center p-0">
                            <div
                              className="w-full h-4 rounded-sm"
                              style={{ background: v ? `hsl(217 91% 60% / ${0.15 + intensity * 0.85})` : "hsl(var(--muted))" }}
                              title={`${day} ${hi}:00 — ${v} lead-uri`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground mt-2">💡 Identifică ferestrele cu cel mai mare volum pentru a calibra urmărirea.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const KpiCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) => (
  <Card>
    <CardContent className="p-3">
      <div className={`flex items-center gap-1.5 ${color} mb-1`}>{icon}<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);
