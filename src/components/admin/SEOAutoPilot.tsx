import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bot, Undo2, ShieldAlert, Timer, Activity, Loader2, CheckCircle2, AlertCircle,
  Radio, Sparkles, History, PowerOff, Play, Rocket,
} from "lucide-react";

interface AuditRow {
  id: string;
  url: string;
  overall_score: number | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  keyword_gaps?: any;
  local_geo_keywords?: any;
  language: string;
  created_at: string;
}

interface OverrideRow {
  url_path: string;
  applied_at: string;
  is_active: boolean;
  title?: string | null;
  meta_description?: string | null;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

const CANONICAL_HOST = "www.realtrust.ro";
const AUTOPILOT_KEY = "seo_premium_plus_autopilot_v1";

interface AutopilotConfig {
  enabled: boolean;
  threshold: number;         // apply where score < threshold
  intervalMinutes: number;   // scan cadence
  maxPerCycle: number;       // safety cap per run
  reauditAfter: boolean;
  pingIndexNow: boolean;
}

const DEFAULT_CFG: AutopilotConfig = {
  enabled: false,
  threshold: 70,
  intervalMinutes: 30,
  maxPerCycle: 5,
  reauditAfter: true,
  pingIndexNow: true,
};

const urlToPath = (full: string) => {
  try { const u = new URL(full); let p = u.pathname.replace(/\/{2,}/g, "/"); if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1); return p || "/"; } catch { return full; }
};

const normalizeText = (v: string | null | undefined, max = 165) => {
  const clean = (v || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean || null;
  const cut = clean.slice(0, max + 1);
  const ls = cut.lastIndexOf(" ");
  return (ls > 40 ? clean.slice(0, ls) : clean.slice(0, max)).replace(/[,;:.!?\-–—]+$/, "").trim() || null;
};

const buildExtraKeywords = (a: AuditRow) => {
  const src = [
    ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
    ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
  ];
  const seen = new Set<string>();
  return src
    .map((k: any) => ({ keyword: normalizeText(k?.keyword || (typeof k === "string" ? k : ""), 70) || "", reason: k?.reason || null }))
    .filter((k) => {
      const key = k.keyword.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    })
    .slice(0, 12);
};

interface RunEvent {
  ts: number;
  kind: "cycle" | "applied" | "skipped" | "error" | "rollback" | "info";
  message: string;
  url?: string;
}

export const SEOAutoPilot = ({ history, overrides }: Props) => {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<AutopilotConfig>(() => {
    try {
      const raw = localStorage.getItem(AUTOPILOT_KEY);
      if (raw) return { ...DEFAULT_CFG, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_CFG;
  });
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [nextTickAt, setNextTickAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const cycleRunning = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem(AUTOPILOT_KEY, JSON.stringify(cfg)); } catch {}
  }, [cfg]);

  // 1s clock for countdown
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const pushEvent = (e: Omit<RunEvent, "ts">) => setEvents((prev) => [{ ts: Date.now(), ...e }, ...prev].slice(0, 60));

  // Realtime — recent premium runs feed
  useEffect(() => {
    const ch = supabase
      .channel("seo_pplus_autopilot_runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_premium_plus_runs" }, (payload) => {
        const row: any = payload.new || payload.old;
        if (!row) return;
        pushEvent({
          kind: row.status === "failed" || row.error_count > 0 ? "error" : "info",
          message: `Run [${row.mode}] ${row.status} — ${row.success_count ?? 0} ok / ${row.error_count ?? 0} err`,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const autopilotTargets = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((a) => (a.overall_score ?? 100) < cfg.threshold && (a.suggested_title || a.suggested_meta))
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      })
      .sort((a, b) => (a.overall_score ?? 100) - (b.overall_score ?? 100));
  }, [history, cfg.threshold]);

  const applyOne = async (a: AuditRow) => {
    const path = urlToPath(a.url);
    const { data, error } = await (supabase as any).rpc("seo_premium_plus_apply_override", {
      _url: path,
      _title: normalizeText(a.suggested_title, 70),
      _meta_description: normalizeText(a.suggested_meta, 165),
      _extra_keywords: buildExtraKeywords(a),
      _source_audit_id: a.id,
      _applied_by: null,
      _change_type: "autopilot",
      _notes: `AI Auto-Pilot @ threshold<${cfg.threshold}`,
    });
    if (error) throw error;
    return { path, res: data as any };
  };

  const runCycle = async () => {
    if (cycleRunning.current) return;
    cycleRunning.current = true;
    const targets = autopilotTargets.slice(0, cfg.maxPerCycle);
    pushEvent({ kind: "cycle", message: `Ciclu Auto-Pilot: ${targets.length} candidați (prag <${cfg.threshold})` });
    if (targets.length === 0) { cycleRunning.current = false; return; }

    const runId = await (async () => {
      const { data } = await (supabase as any).from("seo_premium_plus_runs")
        .insert({ mode: "autopilot", total_count: targets.length, config: cfg, status: "running" })
        .select("id").maybeSingle();
      return data?.id as string | null;
    })();

    let ok = 0, err = 0, skipped = 0;
    const appliedUrls: string[] = [];
    const results: any[] = [];
    for (const a of targets) {
      try {
        const { path, res } = await applyOne(a);
        if (res?.action === "skipped") { skipped++; pushEvent({ kind: "skipped", url: path, message: `Neschimbat: ${path}` }); }
        else { ok++; appliedUrls.push(`https://${CANONICAL_HOST}${path}`); pushEvent({ kind: "applied", url: path, message: `Aplicat: ${path}` }); }
        results.push({ url: path, status: res?.action || "ok" });
        if (cfg.reauditAfter) {
          supabase.functions.invoke("seo-ai-optimizer", { body: { url: `https://${CANONICAL_HOST}${path}`, language: a.language || "ro", forceRefresh: true } }).catch(() => null);
        }
      } catch (e: any) {
        err++;
        const path = urlToPath(a.url);
        pushEvent({ kind: "error", url: path, message: `Eroare: ${path} — ${e?.message || "unknown"}` });
        results.push({ url: path, status: "error", reason: e?.message });
      }
    }

    if (cfg.pingIndexNow && appliedUrls.length > 0) {
      try {
        await supabase.functions.invoke("indexnow-notify", { body: { urls: appliedUrls, triggered_by: "seo_autopilot" } });
        pushEvent({ kind: "info", message: `IndexNow trimis pentru ${appliedUrls.length} URL-uri` });
      } catch (e: any) {
        pushEvent({ kind: "error", message: `IndexNow eșuat: ${e?.message || "unknown"}` });
      }
    }

    if (runId) {
      await (supabase as any).from("seo_premium_plus_runs").update({
        status: err ? "completed_with_errors" : "completed",
        processed_count: targets.length, success_count: ok, error_count: err, skipped_count: skipped,
        results, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    cycleRunning.current = false;
  };

  // Scheduler
  useEffect(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (!cfg.enabled) { setNextTickAt(null); return; }
    const tick = async () => {
      await runCycle();
      const next = Date.now() + cfg.intervalMinutes * 60 * 1000;
      setNextTickAt(next);
      timerRef.current = window.setTimeout(tick, cfg.intervalMinutes * 60 * 1000);
    };
    // first tick after 5s to let UI settle
    const first = Date.now() + 5000;
    setNextTickAt(first);
    timerRef.current = window.setTimeout(tick, 5000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.enabled, cfg.intervalMinutes, cfg.threshold, cfg.maxPerCycle, cfg.reauditAfter, cfg.pingIndexNow]);

  const emergencyStop = () => {
    setCfg((c) => ({ ...c, enabled: false }));
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    setNextTickAt(null);
    pushEvent({ kind: "info", message: "⛔ Emergency stop — Auto-Pilot dezactivat" });
    toast.warning("Auto-Pilot oprit");
  };

  const secondsToNext = nextTickAt ? Math.max(0, Math.floor((nextTickAt - now) / 1000)) : null;

  /* ===== Rollback ===== */
  const recentOverrides = useMemo(() => {
    const seen = new Set<string>();
    return overrides
      .filter((o) => o.is_active)
      .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
      .filter((o) => { if (seen.has(o.url_path)) return false; seen.add(o.url_path); return true; })
      .slice(0, 20);
  }, [overrides]);

  const rollbackMutation = useMutation({
    mutationFn: async (url_path: string) => {
      const { data, error } = await (supabase as any).rpc("seo_premium_plus_rollback_override", { _url_path: url_path });
      if (error) throw error;
      return data as { ok: boolean; action?: string; reason?: string };
    },
    onSuccess: (d, url_path) => {
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      pushEvent({ kind: "rollback", url: url_path, message: `Rollback: ${url_path} (${d?.action || "ok"})` });
      if (d?.ok) toast.success(`Rollback pe ${url_path}`);
      else toast.error(`Rollback eșuat: ${d?.reason || "eroare"}`);
    },
    onError: (e: any) => toast.error(e?.message || "Rollback eșuat"),
  });

  /* ===== History count ===== */
  const { data: historyCount } = useQuery({
    queryKey: ["seo-override-history-count"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("seo_override_history").select("id", { count: "exact", head: true });
      return count as number || 0;
    },
    staleTime: 60_000,
  });

  return (
    <Card className="relative overflow-hidden border-purple-300/40 bg-gradient-to-br from-purple-50/70 via-background to-indigo-50/40 dark:from-purple-950/25 dark:via-background dark:to-indigo-950/15">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-400/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="relative">
                <Bot className="w-6 h-6 text-purple-600" />
                {cfg.enabled && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                )}
              </div>
              <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-500 bg-clip-text text-transparent">
                AI Auto-Pilot & Rollback
              </span>
              <Badge className={`ml-1 ${cfg.enabled ? "bg-emerald-500 hover:bg-emerald-500" : "bg-slate-400 hover:bg-slate-400"} text-white shadow-lg`}>
                <Radio className={`w-3 h-3 mr-1 ${cfg.enabled ? "animate-pulse" : ""}`} />
                {cfg.enabled ? "LIVE" : "STANDBY"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Aplică automat sugestiile AI pentru paginile sub prag, cu re-audit + IndexNow și rollback instant din istoric.
            </CardDescription>
          </div>

          {cfg.enabled ? (
            <Button variant="destructive" onClick={emergencyStop} className="gap-2 shadow-lg shadow-destructive/30">
              <PowerOff className="w-4 h-4" /> Emergency Stop
            </Button>
          ) : (
            <Button
              onClick={() => setCfg((c) => ({ ...c, enabled: true }))}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30"
            >
              <Play className="w-4 h-4" /> Pornește Auto-Pilot
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* Config grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-background/70 backdrop-blur p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Prag scor
            </div>
            <div className="text-2xl font-bold text-purple-700">&lt; {cfg.threshold}</div>
            <Slider min={40} max={95} step={5} value={[cfg.threshold]} onValueChange={([v]) => setCfg((c) => ({ ...c, threshold: v }))} />
            <div className="text-[10px] text-muted-foreground">{autopilotTargets.length} pagini calificate acum</div>
          </div>

          <div className="rounded-xl border bg-background/70 backdrop-blur p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Timer className="w-3 h-3" /> Interval scanare
            </div>
            <div className="text-2xl font-bold text-indigo-700">{cfg.intervalMinutes} min</div>
            <Slider min={5} max={240} step={5} value={[cfg.intervalMinutes]} onValueChange={([v]) => setCfg((c) => ({ ...c, intervalMinutes: v }))} />
            <div className="text-[10px] text-muted-foreground">
              {secondsToNext != null ? `Următorul ciclu în ${Math.floor(secondsToNext / 60)}m ${secondsToNext % 60}s` : "Inactiv"}
            </div>
          </div>

          <div className="rounded-xl border bg-background/70 backdrop-blur p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Rocket className="w-3 h-3" /> Cap pe ciclu
            </div>
            <div className="text-2xl font-bold text-emerald-700">{cfg.maxPerCycle} URL-uri</div>
            <Slider min={1} max={25} step={1} value={[cfg.maxPerCycle]} onValueChange={([v]) => setCfg((c) => ({ ...c, maxPerCycle: v }))} />
            <div className="text-[10px] text-muted-foreground">Siguranță — evită runaway</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center rounded-lg border bg-background/50 px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={cfg.reauditAfter} onCheckedChange={(v) => setCfg((c) => ({ ...c, reauditAfter: v }))} />
            Re-audit după fiecare aplicare
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={cfg.pingIndexNow} onCheckedChange={(v) => setCfg((c) => ({ ...c, pingIndexNow: v }))} />
            Ping IndexNow automat
          </label>
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <History className="w-3 h-3" /> {historyCount ?? 0} versiuni în istoric
          </div>
        </div>

        <Separator />

        {/* Live feed + Rollback list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live activity feed */}
          <div className="rounded-xl border bg-background/80 p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-purple-600" />
                Live Activity Feed
              </div>
              <Badge variant="secondary" className="text-[10px]">{events.length}</Badge>
            </div>
            <ScrollArea className="h-64 rounded-lg border bg-muted/20">
              {events.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  {cfg.enabled ? "Așteaptă primul ciclu…" : "Auto-Pilot inactiv. Pornește pentru activitate live."}
                </div>
              ) : (
                <ul className="divide-y text-xs">
                  {events.map((e, i) => (
                    <li key={i} className="px-3 py-2 flex items-start gap-2">
                      {e.kind === "applied" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      {e.kind === "skipped" && <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />}
                      {e.kind === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                      {e.kind === "cycle" && <Radio className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />}
                      {e.kind === "rollback" && <Undo2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                      {e.kind === "info" && <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-mono truncate">{e.message}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(e.ts).toLocaleTimeString("ro-RO")}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Rollback list */}
          <div className="rounded-xl border bg-background/80 p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2 text-sm">
                <Undo2 className="w-4 h-4 text-amber-600" />
                Rollback rapid — override-uri active
              </div>
              <Badge variant="secondary" className="text-[10px]">{recentOverrides.length}</Badge>
            </div>
            <ScrollArea className="h-64 rounded-lg border bg-muted/20">
              {recentOverrides.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">Niciun override activ.</div>
              ) : (
                <ul className="divide-y text-xs">
                  {recentOverrides.map((o) => {
                    const pending = rollbackMutation.isPending && rollbackMutation.variables === o.url_path;
                    return (
                      <li key={o.url_path} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono truncate">{o.url_path}</div>
                          <div className="text-[10px] text-muted-foreground">
                            aplicat {new Date(o.applied_at).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => rollbackMutation.mutate(o.url_path)}
                          className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                          Rollback
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
