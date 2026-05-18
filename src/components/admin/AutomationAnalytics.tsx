import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity, Clock, Flame, TrendingUp, AlertTriangle, SlidersHorizontal, Filter } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

type RunRow = {
  job_key: string;
  started_at: string;
  duration_ms: number | null;
  status: "success" | "failed" | "timeout" | "skipped" | "running";
};

// Gemini approximative cost (USD) per call — used only as a directional indicator
const GEMINI_AVG_COST = 0.0008;
const AI_JOB_PREFIXES = ["ai.", "seo.auto_fill_meta", "seo.ai_optimizer_audit", "prospect.predictive_rescore", "lead.auto_classify_agency"];

const isAiJob = (k: string) => AI_JOB_PREFIXES.some((p) => k.startsWith(p) || k === p);
const categoryOf = (k: string) => (k.includes(".") ? k.split(".")[0] : "other");

type Thresholds = {
  successWarn: number;   // below = amber
  successBad: number;    // below = red
  costWarn: number;      // above = amber (USD per job, 7d)
  costBad: number;       // above = red
};

const DEFAULT_THRESHOLDS: Thresholds = {
  successWarn: 95,
  successBad: 80,
  costWarn: 0.05,
  costBad: 0.20,
};

const STORAGE_KEY = "automation_analytics_thresholds_v1";

const loadThresholds = (): Thresholds => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
};

export const AutomationAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    } catch { /* noop */ }
  }, [thresholds]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("automation_runs")
        .select("job_key, started_at, duration_ms, status")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(5000);
      if (alive) {
        setRuns((data ?? []) as RunRow[]);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Available categories (always derived from full dataset, before filtering)
  const categories = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => set.add(categoryOf(r.job_key)));
    return Array.from(set).sort();
  }, [runs]);

  // Filtered runs by category
  const filteredRuns = useMemo(
    () => (category === "all" ? runs : runs.filter((r) => categoryOf(r.job_key) === category)),
    [runs, category],
  );

  // 7d × 24h heatmap (local hours)
  const heatmap = useMemo(() => {
    const days: Array<Array<{ total: number; ok: number; failed: number }>> = [];
    for (let d = 0; d < 7; d++) {
      days.push(Array.from({ length: 24 }, () => ({ total: 0, ok: 0, failed: 0 })));
    }
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    filteredRuns.forEach((r) => {
      const t = new Date(r.started_at);
      const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
      const offset = Math.round((todayMidnight - dayStart) / (24 * 60 * 60 * 1000));
      if (offset < 0 || offset > 6) return;
      const hour = t.getHours();
      const cell = days[offset][hour];
      cell.total++;
      if (r.status === "success") cell.ok++;
      else if (r.status === "failed" || r.status === "timeout") cell.failed++;
    });
    return days;
  }, [filteredRuns]);

  const dayLabels = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "2-digit" });
    for (let d = 0; d < 7; d++) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      out.push(fmt.format(dt));
    }
    return out;
  }, []);

  // Per-job latency + cost
  const perJob = useMemo(() => {
    const map = new Map<string, { count: number; ok: number; failed: number; totalMs: number; maxMs: number }>();
    filteredRuns.forEach((r) => {
      const cur = map.get(r.job_key) ?? { count: 0, ok: 0, failed: 0, totalMs: 0, maxMs: 0 };
      cur.count++;
      if (r.status === "success") cur.ok++;
      if (r.status === "failed" || r.status === "timeout") cur.failed++;
      const ms = r.duration_ms ?? 0;
      cur.totalMs += ms;
      if (ms > cur.maxMs) cur.maxMs = ms;
      map.set(r.job_key, cur);
    });
    return Array.from(map.entries())
      .map(([job_key, v]) => ({
        job_key,
        count: v.count,
        ok: v.ok,
        failed: v.failed,
        avg_ms: v.count > 0 ? Math.round(v.totalMs / v.count) : 0,
        max_ms: v.maxMs,
        success_rate: v.count > 0 ? Math.round((v.ok / v.count) * 100) : 0,
        est_cost_usd: isAiJob(job_key) ? +(v.count * GEMINI_AVG_COST).toFixed(4) : 0,
      }))
      .sort((a, b) => b.avg_ms - a.avg_ms);
  }, [filteredRuns]);

  const totalRuns = filteredRuns.length;
  const totalFailed = filteredRuns.filter((r) => r.status === "failed" || r.status === "timeout").length;
  const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFailed) / totalRuns) * 100) : 100;
  const aiCalls = filteredRuns.filter((r) => isAiJob(r.job_key) && r.status === "success").length;
  const estCost = +(aiCalls * GEMINI_AVG_COST).toFixed(3);

  // Threshold helpers
  const successTone = (rate: number): "ok" | "warn" | "bad" =>
    rate < thresholds.successBad ? "bad" : rate < thresholds.successWarn ? "warn" : "ok";
  const costTone = (usd: number): "ok" | "warn" | "bad" =>
    usd >= thresholds.costBad ? "bad" : usd >= thresholds.costWarn ? "warn" : "ok";
  const toneBadgeVariant = (tone: "ok" | "warn" | "bad") =>
    tone === "ok" ? "default" : tone === "warn" ? "secondary" : "destructive";
  const toneCostClass = (tone: "ok" | "warn" | "bad") =>
    tone === "ok"
      ? "text-foreground"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400 font-semibold"
        : "text-destructive font-semibold";

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const latencyChart = perJob.slice(0, 10).map((j) => ({
    name: j.job_key.length > 22 ? j.job_key.slice(0, 22) + "…" : j.job_key,
    avg_ms: j.avg_ms,
  }));

  return (
    <div className="space-y-4">
      {/* Filters & Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filtre & Praguri alertă
          </CardTitle>
          <CardDescription className="text-xs">
            Segmentează datele pe categorii și ajustează pragurile vizuale pentru success rate și cost AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Categorie joburi
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate categoriile</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Success rate · warn &lt; %</Label>
              <Input
                type="number" min={0} max={100} className="h-9 w-24"
                value={thresholds.successWarn}
                onChange={(e) => setThresholds((t) => ({ ...t, successWarn: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Success rate · critic &lt; %</Label>
              <Input
                type="number" min={0} max={100} className="h-9 w-24"
                value={thresholds.successBad}
                onChange={(e) => setThresholds((t) => ({ ...t, successBad: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Cost AI/job · warn &gt; $</Label>
              <Input
                type="number" step="0.01" min={0} className="h-9 w-24"
                value={thresholds.costWarn}
                onChange={(e) => setThresholds((t) => ({ ...t, costWarn: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Cost AI/job · critic &gt; $</Label>
              <Input
                type="number" step="0.01" min={0} className="h-9 w-24"
                value={thresholds.costBad}
                onChange={(e) => setThresholds((t) => ({ ...t, costBad: Number(e.target.value) || 0 }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              className="h-9 px-3 text-[11px] text-muted-foreground hover:text-foreground underline self-end"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Activity className="w-3.5 h-3.5" />} label="Rulaje 7z" value={totalRuns} />
        <MetricCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Success rate"
          value={`${successRate}%`}
          tone={successTone(successRate)}
        />
        <MetricCard
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Eșecuri"
          value={totalFailed}
          tone={totalFailed === 0 ? "ok" : totalFailed > 10 ? "bad" : "warn"}
        />
        <MetricCard
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Cost AI estimat"
          value={`$${estCost.toFixed(3)}`}
          tone={costTone(estCost)}
        />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4" /> Heatmap rulaje · ultimele 7 zile × 24h
            {category !== "all" && (
              <Badge variant="outline" className="text-[10px] ml-1">categorie: {category}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Intensitatea = număr rulaje pe oră. Roșu = ore cu eșecuri/timeout. Identifici instant ferestrele problematice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-16 text-left text-muted-foreground font-normal pr-2"></th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="w-6 text-center font-normal text-muted-foreground">
                      {h % 3 === 0 ? h : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayLabels.map((label, dayIdx) => (
                  <tr key={dayIdx}>
                    <td className="text-right pr-2 text-muted-foreground whitespace-nowrap">{label}</td>
                    {heatmap[dayIdx].map((cell, h) => {
                      const intensity = Math.min(1, cell.total / 8);
                      const hasFail = cell.failed > 0;
                      const bg = hasFail
                        ? `hsl(var(--destructive) / ${0.25 + 0.6 * intensity})`
                        : cell.total > 0
                          ? `hsl(var(--primary) / ${0.15 + 0.55 * intensity})`
                          : "hsl(var(--muted) / 0.25)";
                      return (
                        <td
                          key={h}
                          className="w-6 h-6 border border-background"
                          style={{ background: bg }}
                          title={`${label} ${String(h).padStart(2, "0")}:00 · ${cell.total} rulaje${cell.failed > 0 ? ` · ${cell.failed} eșec(uri)` : ""}`}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(var(--muted) / 0.4)" }} /> 0 rulaje
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary) / 0.6)" }} /> activ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(var(--destructive) / 0.7)" }} /> eșecuri
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Latency chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Latență medie · top 10 joburi
            {category !== "all" && (
              <Badge variant="outline" className="text-[10px] ml-1">categorie: {category}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Joburi cu durată mare → candidate la optimizare sau spargere în pași. Pragul intern de timeout este 50.000 ms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latencyChart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Niciun rulaj încă.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, latencyChart.length * 28)}>
              <BarChart data={latencyChart} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} ms`, "Durată medie"]}
                />
                <Bar dataKey="avg_ms" radius={[0, 4, 4, 0]}>
                  {latencyChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.avg_ms > 30000 ? "hsl(var(--destructive))" : entry.avg_ms > 10000 ? "hsl(38 92% 50%)" : "hsl(var(--primary))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-job table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistici per job (7 zile)</CardTitle>
          <CardDescription>
            Success rate și cost AI sunt colorate conform pragurilor setate mai sus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perJob.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Niciun rulaj încă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-1.5 pr-3 font-medium">Job</th>
                    <th className="py-1.5 px-2 font-medium text-right">Rulaje</th>
                    <th className="py-1.5 px-2 font-medium text-right">Success</th>
                    <th className="py-1.5 px-2 font-medium text-right">Avg (ms)</th>
                    <th className="py-1.5 px-2 font-medium text-right">Max (ms)</th>
                    <th className="py-1.5 pl-2 font-medium text-right">Cost AI</th>
                  </tr>
                </thead>
                <tbody>
                  {perJob.map((j) => {
                    const sTone = successTone(j.success_rate);
                    const cTone = costTone(j.est_cost_usd);
                    return (
                      <tr key={j.job_key} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-1.5 pr-3 font-mono text-[11px]">{j.job_key}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{j.count}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">
                          <Badge variant={toneBadgeVariant(sTone)} className="text-[10px]">
                            {j.success_rate}%
                          </Badge>
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{j.avg_ms.toLocaleString("ro-RO")}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{j.max_ms.toLocaleString("ro-RO")}</td>
                        <td className={`py-1.5 pl-2 text-right tabular-nums ${j.est_cost_usd > 0 ? toneCostClass(cTone) : ""}`}>
                          {j.est_cost_usd > 0 ? `$${j.est_cost_usd.toFixed(4)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  label, value, icon, tone,
}: { label: string; value: string | number; icon?: React.ReactNode; tone?: "ok" | "warn" | "bad" }) => {
  const toneClass =
    tone === "ok" ? "border-primary/30" :
    tone === "warn" ? "border-amber-500/40" :
    tone === "bad" ? "border-destructive/40" : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          {icon}{label}
        </div>
        <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
};
