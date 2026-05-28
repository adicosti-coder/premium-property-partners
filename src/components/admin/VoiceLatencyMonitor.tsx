import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Zap } from "lucide-react";

const LATENCY_THRESHOLD_MS = 2500;
const WARN_THRESHOLD_MS = 2000;
const MAX_POINTS = 40;

interface TtsLog {
  id: string;
  created_at: string;
  provider: string;
  ttfb_ms: number | null;
  total_duration_ms: number | null;
  text_length: number | null;
  http_status: number | null;
  fallback_used: boolean;
  retry_count: number;
  error: string | null;
}

export default function VoiceLatencyMonitor() {
  const [logs, setLogs] = useState<TtsLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("voice_tts_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_POINTS);
    setLogs(((data as TtsLog[]) || []).reverse());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("rt-voice-tts-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voice_tts_request_logs" },
        (payload) => {
          setLogs((prev) => {
            const next = [...prev, payload.new as TtsLog];
            return next.slice(-MAX_POINTS);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const stats = useMemo(() => {
    if (!logs.length) return null;
    const ttfbs = logs.map((l) => l.ttfb_ms).filter((x): x is number => typeof x === "number");
    const avg = ttfbs.length ? Math.round(ttfbs.reduce((a, b) => a + b, 0) / ttfbs.length) : 0;
    const max = ttfbs.length ? Math.max(...ttfbs) : 0;
    const fallbacks = logs.filter((l) => l.fallback_used).length;
    const breaches = logs.filter((l) => (l.ttfb_ms ?? 0) >= LATENCY_THRESHOLD_MS).length;
    return { avg, max, fallbacks, breaches, total: logs.length };
  }, [logs]);

  // Sparkline geometry
  const chart = useMemo(() => {
    const W = 600;
    const H = 140;
    const padding = 8;
    const maxY = Math.max(LATENCY_THRESHOLD_MS + 500, ...logs.map((l) => l.ttfb_ms ?? 0));
    const minY = 0;
    const xStep = logs.length > 1 ? (W - padding * 2) / (logs.length - 1) : 0;
    const yScale = (v: number) => H - padding - ((v - minY) / (maxY - minY)) * (H - padding * 2);
    const points = logs.map((l, i) => ({
      x: padding + i * xStep,
      y: yScale(l.ttfb_ms ?? 0),
      log: l,
    }));
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    return { W, H, padding, maxY, yScale, points, path };
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Monitorizare Latență Andrei (TTS)
        </CardTitle>
        <CardDescription>
          TTFB ElevenLabs în timp real. Prag de alertă: <strong>{LATENCY_THRESHOLD_MS}ms</strong>.
          Fallback automat către OpenAI TTS la erori sau breaker deschis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground">TTFB mediu</div>
            <div className="text-xl font-bold">{stats ? `${stats.avg}ms` : "—"}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground">TTFB max</div>
            <div className={`text-xl font-bold ${stats && stats.max >= LATENCY_THRESHOLD_MS ? "text-destructive" : ""}`}>
              {stats ? `${stats.max}ms` : "—"}
            </div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground">Fallback OpenAI</div>
            <div className="text-xl font-bold">{stats?.fallbacks ?? 0}/{stats?.total ?? 0}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground">Breach &gt; {LATENCY_THRESHOLD_MS}ms</div>
            <div className="text-xl font-bold">{stats?.breaches ?? 0}</div>
          </div>
        </div>

        {/* Sparkline chart */}
        <div className="rounded-md border bg-card p-2 overflow-x-auto">
          {loading ? (
            <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">Se încarcă…</div>
          ) : !logs.length ? (
            <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
              Niciun log încă. Sintetizează o voce pentru a popula graficul.
            </div>
          ) : (
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-[140px]" preserveAspectRatio="none">
              {/* Threshold lines */}
              <line
                x1={chart.padding} x2={chart.W - chart.padding}
                y1={chart.yScale(LATENCY_THRESHOLD_MS)} y2={chart.yScale(LATENCY_THRESHOLD_MS)}
                stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="4 4" opacity={0.7}
              />
              <line
                x1={chart.padding} x2={chart.W - chart.padding}
                y1={chart.yScale(WARN_THRESHOLD_MS)} y2={chart.yScale(WARN_THRESHOLD_MS)}
                stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 4" opacity={0.4}
              />
              {/* Line path */}
              <path d={chart.path} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
              {/* Points */}
              {chart.points.map((p, i) => {
                const ttfb = p.log.ttfb_ms ?? 0;
                const isBreach = ttfb >= LATENCY_THRESHOLD_MS;
                const isFallback = p.log.fallback_used;
                const color = isFallback
                  ? "hsl(var(--destructive))"
                  : isBreach
                  ? "hsl(var(--destructive))"
                  : ttfb >= WARN_THRESHOLD_MS
                  ? "hsl(38 92% 50%)"
                  : "hsl(var(--primary))";
                return (
                  <g key={p.log.id}>
                    <circle cx={p.x} cy={p.y} r={isFallback || isBreach ? 4 : 2.5} fill={color}>
                      <title>
                        {new Date(p.log.created_at).toLocaleTimeString("ro-RO")} — {p.log.provider} {ttfb}ms{p.log.fallback_used ? " (fallback)" : ""}{p.log.retry_count ? ` retry×${p.log.retry_count}` : ""}
                      </title>
                    </circle>
                  </g>
                );
              })}
              {/* Axis labels */}
              <text x={chart.padding + 2} y={chart.yScale(LATENCY_THRESHOLD_MS) - 2} fontSize="9" fill="hsl(var(--destructive))">
                {LATENCY_THRESHOLD_MS}ms
              </text>
            </svg>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> ElevenLabs OK</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "hsl(38 92% 50%)" }} /> &gt; {WARN_THRESHOLD_MS}ms</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Breach / Fallback OpenAI</span>
        </div>

        {/* Recent log list */}
        <div className="border rounded max-h-56 overflow-auto divide-y text-xs">
          {[...logs].reverse().slice(0, 12).map((l) => {
            const ttfb = l.ttfb_ms ?? 0;
            const breach = ttfb >= LATENCY_THRESHOLD_MS;
            return (
              <div key={l.id} className="p-2 flex items-center gap-2">
                <Badge variant={l.fallback_used ? "destructive" : l.provider === "elevenlabs" ? "default" : "secondary"}>
                  {l.provider}
                </Badge>
                <span className={breach ? "font-semibold text-destructive" : "font-medium"}>
                  {ttfb}ms TTFB
                </span>
                {l.total_duration_ms != null && (
                  <span className="text-muted-foreground">/ {l.total_duration_ms}ms total</span>
                )}
                {l.text_length != null && (
                  <span className="text-muted-foreground">· {l.text_length} chars</span>
                )}
                {l.retry_count > 0 && (
                  <Badge variant="outline" className="gap-1"><Zap className="h-3 w-3" />retry×{l.retry_count}</Badge>
                )}
                {l.fallback_used && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />fallback</Badge>
                )}
                {l.http_status && <Badge variant="outline">HTTP {l.http_status}</Badge>}
                <span className="ml-auto text-muted-foreground">
                  {new Date(l.created_at).toLocaleTimeString("ro-RO")}
                </span>
              </div>
            );
          })}
          {!logs.length && !loading && (
            <div className="p-3 text-muted-foreground">Niciun request logat încă.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
