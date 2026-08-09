import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, MousePointerClick, TrendingUp, RefreshCw, Activity } from "lucide-react";

type EventRow = {
  event_type: "view" | "click";
  section_id: string;
  label: string | null;
  source: string | null;
  created_at: string;
};

type SectionStats = {
  section_id: string;
  views: number;
  clicks: number;
  rate: number; // clicks / views
};

const SECTION_LABELS: Record<string, string> = {
  "evaluare-pret": "Evaluare apartament (parent)",
  "evaluare-metoda-comparativa": "Metoda comparativă",
  "evaluare-metoda-capitalizarii": "Metoda capitalizării",
  "evaluare-factori-pret": "Factori care influențează prețul",
  "evaluare-formular": "Formular evaluare gratuită (CTA)",
};

const RANGE_OPTIONS = [
  { value: "1d", label: "24h", days: 1 },
  { value: "7d", label: "7 zile", days: 7 },
  { value: "30d", label: "30 zile", days: 30 },
  { value: "90d", label: "90 zile", days: 90 },
];

const EvaluareEngagementManager = () => {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");

  const fetchData = async () => {
    setLoading(true);
    const days = RANGE_OPTIONS.find((r) => r.value === range)?.days ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("evaluare_section_events")
      .select("event_type, section_id, label, source, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setRows(data as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const { stats, totalViews, totalClicks, overallRate } = useMemo(() => {
    const map = new Map<string, SectionStats>();
    Object.keys(SECTION_LABELS).forEach((id) =>
      map.set(id, { section_id: id, views: 0, clicks: 0, rate: 0 })
    );

    let v = 0;
    let c = 0;
    rows.forEach((r) => {
      const entry =
        map.get(r.section_id) ??
        map.set(r.section_id, { section_id: r.section_id, views: 0, clicks: 0, rate: 0 }).get(
          r.section_id
        )!;
      if (r.event_type === "view") {
        entry.views++;
        v++;
      } else {
        entry.clicks++;
        c++;
      }
    });

    map.forEach((s) => {
      s.rate = s.views > 0 ? (s.clicks / s.views) * 100 : 0;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.views + b.clicks - (a.views + a.clicks));
    return {
      stats: sorted,
      totalViews: v,
      totalClicks: c,
      overallRate: v > 0 ? (c / v) * 100 : 0,
    };
  }, [rows]);

  const sourceBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    rows
      .filter((r) => r.event_type === "click")
      .forEach((r) => {
        const key = r.source ?? "unknown";
        m.set(key, (m.get(key) ?? 0) + 1);
      });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Engagement Evaluare Apartament
          </h2>
          <p className="text-sm text-muted-foreground">
            Rate de conversie view → click pentru fiecare ancoră `#evaluare-*` din pagina /blog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {RANGE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Top-line KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Views totale
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Skeleton className="h-8 w-20" /> : totalViews.toLocaleString("ro-RO")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" /> Clicks totale
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Skeleton className="h-8 w-20" /> : totalClicks.toLocaleString("ro-RO")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Engagement rate
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Skeleton className="h-8 w-20" /> : `${overallRate.toFixed(1)}%`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Per-section breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performanță per secțiune</CardTitle>
          <CardDescription>
            Engagement = clicks / views. Procentaj mai mare = secțiune care convertește interesul în acțiune.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading
            ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            : stats.map((s) => (
                <div key={s.section_id} className="space-y-2 p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {SECTION_LABELS[s.section_id] ?? s.section_id}
                      </div>
                      <code className="text-xs text-muted-foreground">#{s.section_id}</code>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <Eye className="h-3 w-3" /> {s.views}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <MousePointerClick className="h-3 w-3" /> {s.clicks}
                      </Badge>
                      <Badge
                        variant={s.rate >= 20 ? "default" : s.rate >= 5 ? "outline" : "destructive"}
                        className="gap-1"
                      >
                        <TrendingUp className="h-3 w-3" /> {s.rate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min(s.rate, 100)} className="h-2" />
                </div>
              ))}
          {!loading && stats.every((s) => s.views === 0 && s.clicks === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nu există date în acest interval. Tracking-ul este live din momentul publicării.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Source attribution for clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Atribuție clicks pe sursă</CardTitle>
          <CardDescription>
            De unde dau utilizatorii click: TOC sticky, ancore inline din articol, sau CTA principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : sourceBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun click înregistrat în acest interval.</p>
          ) : (
            <div className="space-y-3">
              {sourceBreakdown.map(([source, count]) => {
                const pct = totalClicks > 0 ? (count / totalClicks) * 100 : 0;
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <code className="text-foreground">{source}</code>
                      <span className="text-muted-foreground">
                        {count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EvaluareEngagementManager;
