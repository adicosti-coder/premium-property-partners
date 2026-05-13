import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, PlayCircle, Download, TrendingUp } from "lucide-react";
import { formatDistanceToNow, format, startOfDay, subDays } from "date-fns";
import { ro } from "date-fns/locale";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface CronRun {
  id: number;
  job_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  details: any;
}

const TRACKED_JOBS = ["voice-agent-reconcile-5min"];
const PAGE_SIZE = 30;

export default function CronMonitor() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [trend, setTrend] = useState<Array<{ day: string; success_rate: number; total: number; failed: number; blacklist: number }>>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cron_run_log")
      .select("id, job_name, status, started_at, finished_at, duration_ms, error_message, details")
      .in("job_name", TRACKED_JOBS)
      .order("started_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    setRuns((data as CronRun[]) || []);
    setLoading(false);
  }, []);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    const since = subDays(startOfDay(new Date()), 6).toISOString();

    const [{ data: cronData, error: cronErr }, { data: blData, error: blErr }] = await Promise.all([
      supabase
        .from("cron_run_log")
        .select("status, started_at")
        .in("job_name", TRACKED_JOBS)
        .gte("started_at", since)
        .limit(5000),
      supabase
        .from("prospect_listings")
        .select("auto_blacklisted_at, auto_blacklist_reason")
        .ilike("auto_blacklist_reason", "%Voicemail x3%")
        .gte("auto_blacklisted_at", since)
        .limit(5000),
    ]);

    if (cronErr) toast({ title: "Eroare trend cron", description: cronErr.message, variant: "destructive" });
    if (blErr) toast({ title: "Eroare trend blacklist", description: blErr.message, variant: "destructive" });

    const buckets = new Map<string, { total: number; failed: number; blacklist: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      buckets.set(d, { total: 0, failed: 0, blacklist: 0 });
    }
    (cronData || []).forEach((r: any) => {
      if (["started", "running"].includes(r.status)) return;
      const d = format(new Date(r.started_at), "yyyy-MM-dd");
      const b = buckets.get(d);
      if (!b) return;
      b.total += 1;
      if (r.status !== "success") b.failed += 1;
    });
    (blData || []).forEach((r: any) => {
      if (!r.auto_blacklisted_at) return;
      const d = format(new Date(r.auto_blacklisted_at), "yyyy-MM-dd");
      const b = buckets.get(d);
      if (!b) return;
      b.blacklist += 1;
    });

    const arr = Array.from(buckets.entries()).map(([day, v]) => ({
      day: format(new Date(day), "dd MMM", { locale: ro }),
      total: v.total,
      failed: v.failed,
      blacklist: v.blacklist,
      success_rate: v.total > 0 ? Math.round(((v.total - v.failed) / v.total) * 100) : 0,
    }));
    setTrend(arr);
    setTrendLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadTrend();
    const channel = supabase
      .channel("cron_run_log_monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cron_run_log" },
        (payload) => {
          const row = (payload.new || payload.old) as CronRun;
          if (!row || !TRACKED_JOBS.includes(row.job_name)) return;

          setRuns((prev) => {
            const others = prev.filter((r) => r.id !== row.id);
            return [row, ...others].slice(0, PAGE_SIZE);
          });

          if (payload.eventType === "UPDATE" && row.status && !["started", "running", "success"].includes(row.status)) {
            toast({
              title: `🚨 ${row.job_name} → ${row.status}`,
              description: row.error_message || "Execuție eșuată. Verifică logurile.",
              variant: "destructive",
            });
            // Refresh trend on failure
            loadTrend();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, loadTrend]);

  const triggerNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-reconcile", { body: { limit: 10 } });
      if (error) throw error;
      toast({ title: "Reconcile pornit", description: `Verificate: ${data?.checked ?? 0}` });
      await load();
      await loadTrend();
    } catch (e: any) {
      toast({ title: "Eroare la rulare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = useCallback(async () => {
    toast({ title: "Pregătesc exportul...", description: "Descarc ultimele 7 zile de loguri." });
    const since = subDays(new Date(), 7).toISOString();
    const { data, error } = await supabase
      .from("cron_run_log")
      .select("id, job_name, status, started_at, finished_at, duration_ms, error_message, details")
      .in("job_name", TRACKED_JOBS)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(10000);

    if (error) {
      toast({ title: "Eroare export", description: error.message, variant: "destructive" });
      return;
    }

    const headers = ["id", "job_name", "status", "started_at", "finished_at", "duration_ms", "error_message", "details"];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(","),
      ...(data || []).map((r: any) => headers.map((h) => escape(r[h])).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cron-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Export complet", description: `${data?.length ?? 0} rânduri descărcate.` });
  }, []);

  const stats = useMemo(() => {
    const last24h = runs.filter((r) => Date.now() - new Date(r.started_at).getTime() < 86_400_000);
    const finals = last24h.filter((r) => !["started", "running"].includes(r.status));
    const failed = finals.filter((r) => r.status !== "success");
    const lastSuccess = runs.find((r) => r.status === "success");
    return {
      total24: finals.length,
      failed24: failed.length,
      lastSuccess: lastSuccess?.started_at,
      successRate: finals.length ? Math.round(((finals.length - failed.length) / finals.length) * 100) : null,
    };
  }, [runs]);

  const trendTotals = useMemo(() => {
    return trend.reduce(
      (acc, d) => ({ total: acc.total + d.total, failed: acc.failed + d.failed, blacklist: acc.blacklist + d.blacklist }),
      { total: 0, failed: 0, blacklist: 0 },
    );
  }, [trend]);

  const statusBadge = (status: string) => {
    if (status === "success")
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> success
        </Badge>
      );
    if (status === "started" || status === "running")
      return (
        <Badge variant="secondary">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {status}
        </Badge>
      );
    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" /> {status}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Cron Monitor — Voice Agent Reconcile
          </CardTitle>
          <CardDescription>
            Status live (5 min) pentru <code className="text-xs">voice-agent-reconcile-5min</code>. Alertele vizuale apar
            automat la statusuri ≠ success.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => { load(); loadTrend(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
          </Button>
          <Button size="sm" onClick={triggerNow} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            Rulează acum
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Rulări 24h</div>
            <div className="text-2xl font-bold">{stats.total24}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Eșuate 24h</div>
            <div className={`text-2xl font-bold ${stats.failed24 > 0 ? "text-destructive" : ""}`}>{stats.failed24}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Success rate</div>
            <div className="text-2xl font-bold">{stats.successRate !== null ? `${stats.successRate}%` : "—"}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Ultimul success</div>
            <div className="text-sm font-medium">
              {stats.lastSuccess
                ? formatDistanceToNow(new Date(stats.lastSuccess), { addSuffix: true, locale: ro })
                : "—"}
            </div>
          </div>
        </div>

        {/* 7-day trend chart */}
        <div className="border rounded-lg p-3 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">Trend ultimele 7 zile</h4>
            </div>
            <div className="text-xs text-muted-foreground">
              Total: <span className="font-medium text-foreground">{trendTotals.total}</span> · Eșuate:{" "}
              <span className={`font-medium ${trendTotals.failed > 0 ? "text-destructive" : "text-foreground"}`}>
                {trendTotals.failed}
              </span>{" "}
              · AMD blacklist: <span className="font-medium text-foreground">{trendTotals.blacklist}</span>
            </div>
          </div>
          <div className="w-full h-[260px]">
            {trendLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se încarcă trendul...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === "Success rate") return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="right"
                    dataKey="blacklist"
                    name="AMD blacklist"
                    fill="hsl(var(--destructive))"
                    opacity={0.6}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="failed"
                    name="Eșuate"
                    fill="hsl(var(--muted-foreground))"
                    opacity={0.5}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="success_rate"
                    name="Success rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Runs table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold bg-muted/50">
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Pornit</div>
            <div className="col-span-2">Durată</div>
            <div className="col-span-5">Detalii / Eroare</div>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {loading && runs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Se încarcă...
              </div>
            )}
            {!loading && runs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nicio rulare înregistrată încă. Cronul rulează la fiecare 5 min — așteaptă sau apasă „Rulează acum".
              </div>
            )}
            {runs.map((r) => {
              const isFail = !["success", "started", "running"].includes(r.status);
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center ${
                    isFail ? "bg-destructive/5" : ""
                  }`}
                >
                  <div className="col-span-2">{statusBadge(r.status)}</div>
                  <div className="col-span-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.started_at), { addSuffix: true, locale: ro })}
                  </div>
                  <div className="col-span-2 text-xs">{r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</div>
                  <div className="col-span-5 text-xs truncate">
                    {r.error_message ? (
                      <span className="text-destructive">{r.error_message}</span>
                    ) : r.details ? (
                      <span className="text-muted-foreground">
                        verificate: {r.details.checked ?? "—"} · reconciled: {r.details.reconciled_count ?? "—"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          🔔 Adminii primesc automat o notificare în panoul de notificări la orice execuție cu status diferit de
          „success". Exportul CSV include ultimele 7 zile de loguri.
        </p>
      </CardContent>
    </Card>
  );
}
