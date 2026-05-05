import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GraduationCap, Play, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus,
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, BookOpen, Brain, Target,
  Activity, FileText, Sparkles, History, Download, Repeat, Settings2,
} from "lucide-react";

type GatingMode = "all_auto" | "low_only" | "low_medium" | "all_manual";
const GATING_KEY = "voice_agent_gating_mode";
const GATING_LABEL: Record<GatingMode, string> = {
  all_auto: "Toate automat",
  low_only: "Doar Low automat",
  low_medium: "Low + Medium automat (default)",
  all_manual: "Tot manual (necesită aprobare)",
};

type Category = "obiectii_clasice" | "knowledge_timisoara" | "compliance_ton";

interface Scenario {
  id: string; category: Category; title: string; user_message: string;
  expected_keywords: string[]; forbidden_keywords: string[];
  difficulty: number; is_active: boolean;
}
interface DrillRun {
  id: string; scenario_id: string; ai_reply: string | null;
  passed: boolean; score: number | null; judge_notes: string | null;
  duration_ms: number | null; expected_hits: string[] | null;
  forbidden_hits: string[] | null; triggered_by: string | null; created_at: string;
}
interface DailyRow { day: string; total: number; passed: number; pass_rate: number; by_category: any; }
interface KPI { day: string; total_calls: number; scheduled: number; success_rate: number; sentiment_avg: number | null; top_objections: any[]; drift_vs_prev: number | null; computed_at?: string | null; }
interface Lesson {
  id: string; lesson: string; severity: string; is_active: boolean;
  auto_applied: boolean; awaiting_approval: boolean; applied_at: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  obiectii_clasice: "Obiecții clasice",
  knowledge_timisoara: "Knowledge Timișoara",
  compliance_ton: "Compliance & Ton",
};
const CATEGORY_ICON: Record<Category, any> = {
  obiectii_clasice: Target, knowledge_timisoara: BookOpen, compliance_ton: ShieldCheck,
};

export default function VoiceAgentTrainingLab() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<DrillRun[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [runningCat, setRunningCat] = useState<Category | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [computingKpi, setComputingKpi] = useState(false);
  const [detail, setDetail] = useState<DrillRun | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [gatingMode, setGatingMode] = useState<GatingMode>(() => {
    if (typeof window === "undefined") return "low_medium";
    return ((localStorage.getItem(GATING_KEY) as GatingMode) || "low_medium");
  });
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [kpiAlert, setKpiAlert] = useState<{ kind: string; current: number; avg: number; drop: number } | null>(null);
  const persistGating = (m: GatingMode) => {
    setGatingMode(m);
    try { localStorage.setItem(GATING_KEY, m); } catch {}
    toast({ title: "Prag auto-aplicare actualizat", description: GATING_LABEL[m] });
  };

  // KPI alert: detect >15% drop vs 7-day average for success rate or drill pass-rate
  useEffect(() => {
    if (!kpis.length && !daily.length) return;
    const checkDrop = (current: number | null, history: number[], kind: string) => {
      if (current == null || history.length < 2) return null;
      const avg = history.reduce((a, b) => a + b, 0) / history.length;
      const drop = avg - current;
      if (drop > 15) return { kind, current, avg: Math.round(avg * 10) / 10, drop: Math.round(drop * 10) / 10 };
      return null;
    };
    const successHist = kpis.slice(1, 8).map((k) => k.success_rate).filter((n) => n != null) as number[];
    const passHist = daily.slice(1, 8).map((d) => d.pass_rate).filter((n) => n != null) as number[];
    const a = checkDrop(kpis[0]?.success_rate ?? null, successHist, "Success Rate apeluri");
    const b = checkDrop(daily[0]?.pass_rate ?? null, passHist, "Pass Rate drill-uri");
    const alert = a || b;
    if (alert) {
      setKpiAlert(alert);
      toast({
        variant: "destructive",
        title: `⚠️ ${alert.kind} în scădere`,
        description: `${alert.current}% acum vs media 7 zile ${alert.avg}% (−${alert.drop}%)`,
      });
    } else {
      setKpiAlert(null);
    }
  }, [kpis, daily]);

  const loadAll = async () => {
    setLoading(true);
    const [s, r, d, k, l] = await Promise.all([
      supabase.from("voice_agent_drill_scenarios").select("*").order("category").order("difficulty"),
      supabase.from("voice_agent_drill_runs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("voice_agent_drill_daily").select("*").order("day", { ascending: false }).limit(14),
      supabase.from("voice_agent_kpi_snapshots").select("*").order("day", { ascending: false }).limit(14),
      supabase.from("voice_agent_playbook_addendum").select("id, lesson, severity, is_active, auto_applied, awaiting_approval, applied_at, created_at").order("created_at", { ascending: false }).limit(30),
    ]);
    setScenarios((s.data as any) || []);
    setRuns((r.data as any) || []);
    setDaily((d.data as any) || []);
    setKpis((k.data as any) || []);
    setLessons((l.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const runDrill = async (params: { scenario_ids?: string[]; category?: Category; all?: boolean }) => {
    const { data, error } = await supabase.functions.invoke("voice-agent-drill-runner", {
      body: { ...params, triggered_by: "manual" },
    });
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Drill eșuat", description: (data as any)?.error || error?.message });
      return null;
    }
    return data;
  };

  const runOne = async (s: Scenario) => {
    setRunning(s.id);
    const data = await runDrill({ scenario_ids: [s.id] });
    setRunning(null);
    if (data) {
      const res = data.results?.[0];
      toast({
        title: res?.passed ? "✅ Trecut" : "❌ Eșuat",
        description: `${s.title} — scor ${res?.score ?? "?"}/100`,
        className: res?.passed ? "bg-emerald-600 text-white" : "",
      });
      loadAll();
    }
  };

  const runCategory = async (c: Category) => {
    setRunningCat(c);
    const data = await runDrill({ category: c });
    setRunningCat(null);
    if (data) {
      const passed = (data.results || []).filter((r: any) => r.passed).length;
      toast({ title: `Drill ${CATEGORY_LABEL[c]}`, description: `${passed}/${data.ran} trecute` });
      loadAll();
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    const data = await runDrill({ all: true });
    setRunningAll(false);
    if (data) {
      const passed = (data.results || []).filter((r: any) => r.passed).length;
      toast({ title: "🎓 Drill complet", description: `${passed}/${data.ran} trecute` });
      loadAll();
    }
  };

  const computeKPI = async () => {
    setComputingKpi(true);
    try {
      // Preflight: verify there are calls today before invoking the edge function
      const today = new Date().toISOString().slice(0, 10);
      const start = `${today}T00:00:00Z`;
      const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString();
      const { count, error: cntErr } = await supabase
        .from("voice_call_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start).lt("created_at", end);
      if (cntErr) {
        toast({ variant: "destructive", title: "Eroare de conexiune la bază", description: cntErr.message });
        return;
      }
      if (!count || count === 0) {
        toast({
          variant: "destructive",
          title: "Lipsă date pentru ziua curentă",
          description: "Niciun apel real procesat azi. Recalcularea KPI a fost evitată.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("voice-agent-kpi-snapshot", { body: {} });

      if (error) {
        const msg = String(error.message || error).toLowerCase();
        let title = "KPI eșuat";
        let description = error.message || "Eroare necunoscută";
        if (msg.includes("failed to send") || msg.includes("fetch")) {
          title = "Funcție în curs de deploy sau indisponibilă";
          description = "Edge function-ul nu răspunde. Așteaptă ~30s și reîncearcă.";
        } else if (msg.includes("not found") || msg.includes("404")) {
          title = "Funcție inexistentă";
          description = "voice-agent-kpi-snapshot nu este deployat încă.";
        } else if (msg.includes("network") || msg.includes("connection")) {
          title = "Eroare de conexiune la bază";
        } else if (msg.includes("429")) {
          title = "Rate limit atins"; description = "Prea multe cereri. Așteaptă 1 minut.";
        } else if (msg.includes("402")) {
          title = "Credit AI epuizat"; description = "Adaugă fonduri în workspace pentru AI Gateway.";
        }
        toast({ variant: "destructive", title, description });
        return;
      }
      if ((data as any)?.error) {
        toast({ variant: "destructive", title: "KPI eșuat în execuție", description: (data as any).error });
        return;
      }

      const d = data as any;
      toast({
        title: "📊 KPI actualizat",
        description: `${d.total_calls} apeluri · ${d.success_rate}% succes · salvat în istoric`,
      });
      await loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Eroare neașteptată", description: e?.message || String(e) });
    } finally {
      setComputingKpi(false);
    }
  };

  const applyLesson = async (l: Lesson, approve: boolean) => {
    const { error } = await supabase.from("voice_agent_playbook_addendum").update({
      is_active: approve,
      auto_applied: false,
      awaiting_approval: false,
      applied_at: approve ? new Date().toISOString() : null,
    }).eq("id", l.id);
    if (error) { toast({ variant: "destructive", title: "Eroare", description: error.message }); return; }
    toast({ title: approve ? "✅ Lecție aplicată" : "❌ Lecție respinsă" });
    loadAll();
  };

  const replayDrill = async (r: DrillRun) => {
    setReplayingId(r.id);
    const data = await runDrill({ scenario_ids: [r.scenario_id] });
    setReplayingId(null);
    if (data) {
      const res = data.results?.[0];
      toast({
        title: res?.passed ? "✅ Replay trecut" : "❌ Replay eșuat",
        description: `Scor anterior: ${r.score ?? "?"} → acum: ${res?.score ?? "?"}/100`,
      });
      await loadAll();
      // open detail of the new run if available
      if (res?.run_id) {
        const { data: nr } = await supabase.from("voice_agent_drill_runs").select("*").eq("id", res.run_id).maybeSingle();
        if (nr) setDetail(nr as any);
      }
    }
  };

  const exportHistoryCSV = async () => {
    const { data, error } = await supabase
      .from("voice_agent_drill_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error || !data) {
      toast({ variant: "destructive", title: "Export eșuat", description: error?.message });
      return;
    }
    const scenMap = new Map(scenarios.map((s) => [s.id, s]));
    const escape = (v: any) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };
    const headers = ["created_at", "scenario_id", "scenario_title", "category", "passed", "score", "judge_notes", "ai_reply", "expected_hits", "forbidden_hits", "duration_ms", "triggered_by"];
    const rows = (data as any[]).map((r) => {
      const s: any = scenMap.get(r.scenario_id);
      return [r.created_at, r.scenario_id, s?.title || "", s?.category || "", r.passed, r.score, r.judge_notes, r.ai_reply, (r.expected_hits || []).join("|"), (r.forbidden_hits || []).join("|"), r.duration_ms, r.triggered_by].map(escape).join(",");
    });
    const csv = headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `andrei-drill-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Export complet", description: `${rows.length} execuții drill exportate` });
  };

  const today = useMemo(() => daily[0], [daily]);
  const todayKpi = useMemo(() => kpis[0], [kpis]);
  const pendingLessons = useMemo(() => lessons.filter((l) => l.awaiting_approval), [lessons]);
  const activeLessons = useMemo(() => lessons.filter((l) => l.is_active), [lessons]);

  const driftIcon = (n: number | null) => {
    if (n === null) return <Minus className="h-3 w-3" />;
    if (n > 0) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
    if (n < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3" />;
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Training Lab — Andrei
              <Badge variant="secondary" className="ml-2">Perfecționare continuă</Badge>
            </CardTitle>
            <CardDescription>
              Auto-corecție post-apel + drill-uri zilnice + scoreboard KPI. Lecțiile cu severitate ≤ medium se aplică automat sub control; cele critice așteaptă aprobare.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {kpiAlert && (
          <div className="mb-3 p-3 rounded-lg border-2 border-destructive/60 bg-destructive/10 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-destructive">{kpiAlert.kind} în scădere — alertă automată</div>
              <div className="text-muted-foreground">
                Valoare azi: <b>{kpiAlert.current}%</b> · media ultimelor 7 zile: <b>{kpiAlert.avg}%</b> · scădere <b>−{kpiAlert.drop}%</b> (prag 15%).
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setKpiAlert(null)}>×</Button>
          </div>
        )}
        <Tabs defaultValue="scoreboard">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scoreboard"><Activity className="h-3.5 w-3.5 mr-1" /> Scoreboard</TabsTrigger>
            <TabsTrigger value="drills"><Target className="h-3.5 w-3.5 mr-1" /> Drill-uri</TabsTrigger>
            <TabsTrigger value="lessons">
              <Brain className="h-3.5 w-3.5 mr-1" /> Lecții
              {pendingLessons.length > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{pendingLessons.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> Istoric</TabsTrigger>
          </TabsList>

          {/* SCOREBOARD */}
          <TabsContent value="scoreboard" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox label="Drill pass-rate azi" value={today ? `${today.pass_rate}%` : "—"} hint={today ? `${today.passed}/${today.total}` : "Niciun drill"} accent />
              <KpiBox label="Apeluri reale azi" value={todayKpi?.total_calls ?? "—"} hint={todayKpi ? `${todayKpi.scheduled} programate` : "—"} />
              <KpiBox
                label="Rată succes apeluri"
                value={todayKpi ? `${todayKpi.success_rate}%` : "—"}
                hint={todayKpi?.drift_vs_prev != null ? `${todayKpi.drift_vs_prev > 0 ? "+" : ""}${todayKpi.drift_vs_prev}% vs ieri` : "—"}
                accent
                trail={driftIcon(todayKpi?.drift_vs_prev ?? null)}
              />
              <KpiBox label="Sentiment mediu" value={todayKpi?.sentiment_avg ? `${todayKpi.sentiment_avg}/10` : "—"} hint="din transcripts" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={computeKPI} disabled={computingKpi}>
                {computingKpi ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Recalculează KPI azi
              </Button>
              <Button size="sm" variant="outline" onClick={runAll} disabled={runningAll}>
                {runningAll ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                Rulează toate drill-urile
              </Button>
            </div>

            {/* Top obiecții */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Top obiecții (apeluri reale azi)</h4>
              {todayKpi?.top_objections?.length ? (
                <div className="flex flex-wrap gap-2">
                  {todayKpi.top_objections.map((o: any, i: number) => (
                    <Badge key={i} variant="outline">{o.key} <span className="ml-1 text-muted-foreground">×{o.count}</span></Badge>
                  ))}
                </div>
              ) : <div className="text-xs text-muted-foreground">Nicio obiecție majoră (sau KPI nerecalculat).</div>}
            </div>

            {/* Pass-rate per categorie azi */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pass-rate drill per categorie</h4>
              <div className="space-y-2">
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
                  const stat = today?.by_category?.[c];
                  const pct = stat?.total ? Math.round((stat.passed / stat.total) * 100) : 0;
                  const Icon = CATEGORY_ICON[c];
                  return (
                    <div key={c} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs">
                          <span>{CATEGORY_LABEL[c]}</span>
                          <span className="font-mono">{stat ? `${stat.passed}/${stat.total}` : "—"}</span>
                        </div>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Istoric KPI auto-salvat */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <History className="h-3 w-3" /> Istoric recalculări KPI ({kpis.length})
              </h4>
              {kpis.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Nicio recalculare salvată încă.</div>
              ) : (
                <ScrollArea className="max-h-48 border rounded">
                  <ul className="divide-y text-xs">
                    {kpis.map((k) => (
                      <li key={k.day} className="px-2 py-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px]">{k.day}</span>
                          <Badge variant="outline" className="text-[9px]">{k.total_calls} apel</Badge>
                          <Badge variant="secondary" className="text-[9px]">{k.success_rate}% succes</Badge>
                          {k.sentiment_avg != null && <Badge variant="outline" className="text-[9px]">😊 {k.sentiment_avg}/10</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          {driftIcon(k.drift_vs_prev ?? null)}
                          {k.drift_vs_prev != null ? `${k.drift_vs_prev > 0 ? "+" : ""}${k.drift_vs_prev}%` : "—"}
                          {k.computed_at && <span className="ml-1">· {new Date(k.computed_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            {/* Drift Map — dual sparkline + tabel colapsabil */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Drift Map 14 zile (drill vs apeluri reale)</h4>
              {(() => {
                const days = Array.from({ length: 14 }).map((_, i) => {
                  const day = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
                  const dr = daily.find((d) => d.day === day);
                  const kp = kpis.find((k) => k.day === day);
                  return { day, drill: dr?.pass_rate ?? null, call: kp?.success_rate ?? null };
                });
                const W = 280, H = 60;
                const toPath = (key: "drill" | "call") => {
                  const pts = days.map((d, i) => ({ x: (i / 13) * W, y: d[key] == null ? null : H - ((d[key] as number) / 100) * H }));
                  let path = ""; let started = false;
                  pts.forEach((p) => {
                    if (p.y == null) { started = false; return; }
                    path += (started ? " L " : "M ") + p.x.toFixed(1) + " " + p.y.toFixed(1); started = true;
                  });
                  return path;
                };
                // Pearson correlation
                const pairs = days.filter((d) => d.drill != null && d.call != null);
                let corr: number | null = null;
                if (pairs.length >= 3) {
                  const mx = pairs.reduce((s, p) => s + (p.drill as number), 0) / pairs.length;
                  const my = pairs.reduce((s, p) => s + (p.call as number), 0) / pairs.length;
                  let num = 0, dx2 = 0, dy2 = 0;
                  pairs.forEach((p) => { const dx = (p.drill as number) - mx; const dy = (p.call as number) - my; num += dx * dy; dx2 += dx * dx; dy2 += dy * dy; });
                  corr = dx2 && dy2 ? Math.round((num / Math.sqrt(dx2 * dy2)) * 100) / 100 : null;
                }
                return (
                  <div className="border rounded-lg p-3 space-y-2">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
                      <path d={toPath("drill")} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                      <path d={toPath("call")} fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeDasharray="3 2" />
                    </svg>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-2">
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-primary"></span>Drill pass-rate</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-destructive border-dashed"></span>Apeluri success-rate</span>
                      <span>Corelație: <b className={corr == null ? "" : corr > 0.5 ? "text-emerald-600" : corr < -0.2 ? "text-destructive" : ""}>{corr ?? "—"}</b></span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">Tabel detaliat audit</summary>
                      <div className="border rounded text-xs mt-2">
                        <div className="grid grid-cols-4 gap-2 px-2 py-1 bg-muted font-semibold">
                          <span>Zi</span><span>Drill %</span><span>Apel succes %</span><span>Drift</span>
                        </div>
                        {Array.from({ length: 14 }).map((_, i) => {
                          const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
                          const dr = daily.find((d) => d.day === day);
                          const kp = kpis.find((k) => k.day === day);
                          return (
                            <div key={day} className="grid grid-cols-4 gap-2 px-2 py-1 border-t">
                              <span className="font-mono">{day.slice(5)}</span>
                              <span>{dr ? `${dr.pass_rate}%` : "—"}</span>
                              <span>{kp ? `${kp.success_rate}%` : "—"}</span>
                              <span className="flex items-center gap-1">{driftIcon(kp?.drift_vs_prev ?? null)}{kp?.drift_vs_prev ?? "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* DRILLS */}
          <TabsContent value="drills" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-foreground">
                {scenarios.length} scenarii active · acoperire: obiecții clasice + knowledge Timișoara + compliance/ton
              </div>
              <Button size="sm" onClick={runAll} disabled={runningAll}>
                {runningAll ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                Rulează tot
              </Button>
            </div>

            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
              const list = scenarios.filter((s) => s.category === c);
              const Icon = CATEGORY_ICON[c];
              return (
                <div key={c} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-primary" /> {CATEGORY_LABEL[c]}
                      <Badge variant="secondary" className="ml-1">{list.length}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => runCategory(c)} disabled={runningCat === c}>
                      {runningCat === c ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      Rulează categoria
                    </Button>
                  </div>
                  <ul className="divide-y">
                    {list.map((s) => {
                      const lastRun = runs.find((r) => r.scenario_id === s.id);
                      return (
                        <li key={s.id} className="px-3 py-2 flex items-start gap-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate flex items-center gap-2">
                              {s.title}
                              <Badge variant="outline" className="text-[9px]">D{s.difficulty}</Badge>
                              {lastRun && (lastRun.passed
                                ? <Badge className="text-[9px] bg-emerald-600">✓ {lastRun.score}</Badge>
                                : <Badge className="text-[9px]" variant="destructive">✗ {lastRun.score ?? "—"}</Badge>)}
                            </div>
                            <div className="text-muted-foreground italic truncate">"{s.user_message}"</div>
                          </div>
                          {lastRun && (
                            <Button size="sm" variant="ghost" onClick={() => setDetail(lastRun)}>
                              <FileText className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => runOne(s)} disabled={running === s.id}>
                            {running === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </TabsContent>

          {/* LESSONS */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Auto-aplicare sub control</div>
                  <div className="text-xs text-muted-foreground">Activează bucla de auto-aplicare a lecțiilor.</div>
                </div>
                <Switch checked={autoMode} onCheckedChange={setAutoMode} />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">Prag de gating (severitate auto-aplicată)</div>
                  <div className="text-[11px] text-muted-foreground">Restul lecțiilor așteaptă aprobare manuală.</div>
                </div>
                <Select value={gatingMode} onValueChange={(v) => persistGating(v as GatingMode)} disabled={!autoMode}>
                  <SelectTrigger className="w-[230px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GATING_LABEL) as GatingMode[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-xs">{GATING_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {pendingLessons.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-amber-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Așteaptă aprobare ({pendingLessons.length})
                </h4>
                <ul className="space-y-2">
                  {pendingLessons.map((l) => (
                    <li key={l.id} className="border rounded p-2 text-xs space-y-2 bg-amber-500/5 border-amber-500/40">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive" className="text-[9px]">{l.severity}</Badge>
                        <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("ro-RO")}</span>
                      </div>
                      <div>{l.lesson}</div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => applyLesson(l, true)}><CheckCircle2 className="h-3 w-3 mr-1" /> Aprobă</Button>
                        <Button size="sm" variant="outline" onClick={() => applyLesson(l, false)}><XCircle className="h-3 w-3 mr-1" /> Respinge</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Lecții active în playbook ({activeLessons.length})
              </h4>
              <ScrollArea className="max-h-72">
                <ul className="space-y-1">
                  {activeLessons.map((l) => (
                    <li key={l.id} className="border rounded p-2 text-xs flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div>{l.lesson}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {l.severity} · {l.auto_applied ? "auto" : "manual"} · {new Date(l.created_at).toLocaleDateString("ro-RO")}
                        </div>
                      </div>
                    </li>
                  ))}
                  {activeLessons.length === 0 && <li className="text-xs text-muted-foreground italic">Nicio lecție activă încă.</li>}
                </ul>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-foreground">Ultimele 50 de execuții drill (export include max 5000)</div>
              <Button size="sm" variant="outline" onClick={exportHistoryCSV}>
                <Download className="h-3 w-3 mr-1" /> Exportă istoricul drill-urilor (CSV)
              </Button>
            </div>
            <ScrollArea className="max-h-[500px]">
              <ul className="space-y-1">
                {runs.map((r) => {
                  const s = scenarios.find((x) => x.id === r.scenario_id);
                  return (
                    <li key={r.id} className="border rounded p-2 text-xs flex items-start gap-2">
                      {r.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5" /> : <XCircle className="h-3 w-3 text-destructive mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s?.title || r.scenario_id.slice(0, 8)}</div>
                        <div className="text-muted-foreground truncate">{r.judge_notes || "—"}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{r.score ?? "?"}/100</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                        <FileText className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
                {runs.length === 0 && <li className="text-xs text-muted-foreground italic">Niciun drill rulat încă.</li>}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* RUN DETAIL */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Detaliu execuție drill
            </DialogTitle>
            <DialogDescription>
              {detail && new Date(detail.created_at).toLocaleString("ro-RO")} · scor {detail?.score ?? "—"}/100
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Scenariu</div>
                <div className="text-xs">{scenarios.find((s) => s.id === detail.scenario_id)?.title || detail.scenario_id}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Răspuns Andrei</div>
                <Textarea readOnly value={detail.ai_reply || ""} rows={6} className="text-xs font-mono" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Verdict judecător AI</div>
                <div className="border rounded p-2 text-xs bg-muted/30">{detail.judge_notes || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold text-emerald-600 mb-0.5">✓ Așteptate găsite</div>
                  {(detail.expected_hits || []).length === 0 ? <span className="text-muted-foreground">—</span> :
                    <ul>{(detail.expected_hits || []).map((k, i) => <li key={i}>· {k}</li>)}</ul>}
                </div>
                <div>
                  <div className="font-semibold text-destructive mb-0.5">⚠ Interzise găsite</div>
                  {(detail.forbidden_hits || []).length === 0 ? <span className="text-muted-foreground">—</span> :
                    <ul>{(detail.forbidden_hits || []).map((k, i) => <li key={i}>· {k}</li>)}</ul>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {detail && (
              <Button
                variant="default"
                onClick={() => replayDrill(detail)}
                disabled={replayingId === detail.id}
              >
                {replayingId === detail.id
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <Repeat className="h-3 w-3 mr-1" />}
                Replay drill cu feedback
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function KpiBox({ label, value, hint, accent, trail }: { label: string; value: any; hint?: string; accent?: boolean; trail?: any }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold flex items-center gap-1 ${accent ? "text-primary" : ""}`}>{value}{trail}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
