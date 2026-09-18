import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, Play, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RunRow {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
  stats: any;
}

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

const statusLabel: Record<string, string> = {
  running: "În curs",
  success: "Finalizat",
  partial: "Parțial",
  failed: "Eșuat",
};

export default function KeywordRadarLiveReport() {
  const [run, setRun] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("keyword_radar_runs")
        .select("id,run_type,status,started_at,finished_at,duration_ms,error,stats")
        .eq("run_type", "scan")
        .order("started_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      setRun(((data || [])[0] as RunRow) || null);
    } catch (e: any) {
      toast({ title: "Eroare raport radar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Progres în timp real: realtime pe rulare + reîmprospătare de siguranță la 3s.
  const isRunning = run?.status === "running" && !run?.finished_at;
  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(load, isRunning ? 3000 : 20000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [isRunning, load]);

  useEffect(() => {
    const ch = supabase
      .channel("keyword-radar-runs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "keyword_radar_runs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const startScan = async () => {
    setStarting(true);
    try {
      const { error } = await supabase.functions.invoke("keyword-radar-scan", {
        body: { triggered_by: "admin_manual", limit: 12 },
      });
      if (error) throw error;
      toast({ title: "Scanare pornită", description: "Progresul se actualizează automat mai jos." });
    } catch (e: any) {
      toast({ title: "Eroare scanare", description: e.message, variant: "destructive" });
    } finally {
      setStarting(false);
      load();
    }
  };

  const p = run?.stats?.progress || {};
  const total = Number(p.total_keywords || 0);
  const idx = Number(p.keyword_index || run?.stats?.keywords_scanned || 0);
  const pct = total > 0 ? Math.min(100, Math.round((idx / total) * 100)) : (run?.finished_at ? 100 : 0);
  const elapsedMs = Number(run?.duration_ms || p.elapsed_ms || 0);
  const details: any[] = Array.isArray(run?.stats?.details) ? run!.stats.details : [];

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-blue-500/30 bg-background/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-blue-600" />
          Raport scanare — progres în timp real
          {run && (
            <Badge variant={run.status === "failed" ? "destructive" : run.status === "running" ? "default" : "secondary"} className="text-[10px]">
              {statusLabel[run.status] || run.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Reîmprospătează raportul" className="min-h-[44px] sm:min-h-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={startScan} disabled={starting || isRunning} className="min-h-[44px] sm:min-h-0">
            {starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Rulează scanarea
          </Button>
        </div>
      </div>

      {!run ? (
        <p className="text-xs text-muted-foreground">Nicio scanare încă. Apasă „Rulează scanarea".</p>
      ) : (
        <>
          <Progress value={pct} className="h-2" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{total > 0 ? `Cuvânt ${idx} / ${total}` : `Cuvinte scanate: ${run.stats?.keywords_scanned ?? 0}`}</span>
            <span>Verificări surse: {run.stats?.platforms_called ?? 0}</span>
            <span className="text-foreground font-medium">Anunțuri noi: {run.stats?.total_results ?? 0}</span>
            <span>Erori: {run.stats?.errors ?? 0}</span>
            {run.stats?.timeouts ? <span>Surse abandonate (prea lente): {run.stats.timeouts}</span> : null}
            {run.stats?.skipped_keyword_budget ? <span>Sărite (buget cuvânt): {run.stats.skipped_keyword_budget}</span> : null}
            {run.stats?.skipped_time_budget ? <span>Amânate la rularea următoare: {run.stats.skipped_time_budget}</span> : null}
            <span>Durată: {Math.round(elapsedMs / 1000)}s</span>
            <span>Start: {fmtTime(run.started_at)}</span>
            <span>Ultima actualizare: {fmtTime(run.finished_at || p.updated_at || run.started_at)}</span>
          </div>

          {isRunning && (
            <div className="text-xs flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
              <span className="truncate">
                Acum: <strong>{p.current_keyword || "pregătesc lista"}</strong>
                {p.current_platform ? ` · ${p.current_platform}` : ""}
              </span>
            </div>
          )}

          {run.error && <p className="text-xs text-destructive">{run.error}</p>}

          {details.length > 0 && (
            <div className="border rounded-lg divide-y max-h-[260px] overflow-y-auto text-xs">
              {details.slice().reverse().map((d, i) => (
                <div key={`${d.id || i}`} className="p-2 space-y-1">
                  <div className="font-medium truncate">{d.keyword}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(d.platforms || {}).map(([plat, v]: any) => (
                      <Badge
                        key={plat}
                        variant={v?.skipped ? "outline" : v?.ok ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {plat}
                        {v?.skipped ? " · sărit" : v?.timeout_ms ? " · prea lent" : ` · ${v?.inserted ?? 0}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
