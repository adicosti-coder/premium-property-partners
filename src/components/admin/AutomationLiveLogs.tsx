import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radio, Trash2, ArrowDownCircle, ArrowUpCircle, Pause, Play } from "lucide-react";

type LogRow = {
  id: string;
  source: string;
  level: "info" | "warning" | "error" | "success" | string;
  job_key: string | null;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
};

const LEVEL_COLORS: Record<string, string> = {
  info: "text-sky-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  error: "text-red-300",
};

const SOURCE_OPTIONS = ["__all__", "orchestrator", "self_healing"];

export const AutomationLiveLogs = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterSource, setFilterSource] = useState<string>("__all__");
  const [filterLevel, setFilterLevel] = useState<string>("__all__");
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // initial load
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("automation_live_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (data) setLogs((data as LogRow[]).reverse());
    })();
  }, []);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("automation-live-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "automation_live_logs" },
        (payload) => {
          if (pausedRef.current) return;
          const row = payload.new as LogRow;
          setLogs((prev) => [...prev, row].slice(-500));
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // auto-scroll
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const filtered = logs.filter((l) => {
    if (filterSource !== "__all__" && l.source !== filterSource) return false;
    if (filterLevel !== "__all__" && l.level !== filterLevel) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className={`w-4 h-4 ${connected ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
              Live Logs · {connected ? "conectat" : "conectare..."}
              {paused && <Badge variant="secondary">Pauzat</Badge>}
            </CardTitle>
            <CardDescription>
              Stream în timp real din <code>automation-orchestrator</code> și <code>automation-self-healing</code>.
              Buffer ultimele 500 linii.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s === "__all__" ? "Toate sursele" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toate nivelele</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="success">success</SelectItem>
                <SelectItem value="warning">warning</SelectItem>
                <SelectItem value="error">error</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)} className="gap-1">
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {paused ? "Reia" : "Pauză"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAutoScroll((s) => !s)} className="gap-1">
              {autoScroll ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
              {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLogs([])} className="gap-1">
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="font-mono text-[11px] leading-relaxed bg-zinc-950 text-zinc-100 rounded-md p-3 h-[520px] overflow-y-auto border border-zinc-800"
        >
          {filtered.length === 0 ? (
            <div className="text-zinc-500 text-center py-12">
              Nicio linie de log încă. Apasă <strong>Run All</strong> sau așteaptă următorul tick orchestrator.
            </div>
          ) : (
            filtered.map((l) => {
              const color = LEVEL_COLORS[l.level] ?? "text-zinc-200";
              const t = new Date(l.created_at).toLocaleTimeString("ro-RO", { hour12: false }) +
                "." + String(new Date(l.created_at).getMilliseconds()).padStart(3, "0");
              return (
                <div key={l.id} className="whitespace-pre-wrap break-words">
                  <span className="text-zinc-500">{t}</span>
                  {" "}
                  <span className="text-zinc-400">[{l.source}]</span>
                  {" "}
                  <span className={color}>{l.level.toUpperCase().padEnd(7, " ")}</span>
                  {l.job_key && <span className="text-violet-300"> {l.job_key}</span>}
                  <span className="text-zinc-100"> · {l.message}</span>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <span className="text-zinc-500"> {JSON.stringify(l.details)}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationLiveLogs;
