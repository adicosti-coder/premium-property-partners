import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Zap, RefreshCw, Globe2, Loader2, AlertTriangle, CheckCircle2,
  AlertCircle, TrendingUp, Trophy, Gauge, Crown, Rocket, ArrowUpRight, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AuditRow {
  id: string;
  url: string;
  overall_score: number | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  keyword_gaps?: any;
  local_geo_keywords?: any;
  issues?: any;
  language: string;
  created_at: string;
}

interface OverrideRow {
  url_path: string;
  applied_at: string;
  is_active: boolean;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

const CANONICAL_HOST = "www.realtrust.ro";
const urlToPath = (full: string) => {
  try { const u = new URL(full); let p = u.pathname.replace(/\/{2,}/g, "/"); if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1); return p || "/"; } catch { return full; }
};

type ScoreDelta = { before: number | null; after: number | null; status: "pending" | "running" | "done" | "error" };

export const SEOPremiumPlusPanel = ({ history, overrides }: Props) => {
  const qc = useQueryClient();

  /* ============ Score deltas (before/after re-audit) ============ */
  const [scoreDeltas, setScoreDeltas] = useState<Record<string, ScoreDelta>>({});

  const reauditAndCapture = async (path: string, beforeScore: number | null, language: string) => {
    setScoreDeltas((s) => ({ ...s, [path]: { before: beforeScore, after: null, status: "running" } }));
    try {
      const url = `https://${CANONICAL_HOST}${path}`;
      const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
        body: { url, language: language || "ro", forceRefresh: true },
      });
      if (error) throw error;
      const after = (data as any)?.audit?.overall_score ?? (data as any)?.overall_score ?? null;
      setScoreDeltas((s) => ({ ...s, [path]: { before: beforeScore, after, status: "done" } }));
      return after;
    } catch (e) {
      setScoreDeltas((s) => ({ ...s, [path]: { before: beforeScore, after: null, status: "error" } }));
      return null;
    }
  };

  /* ============ 1. MASTER ONE-CLICK (apply all <80 site-wide) ============ */
  const [masterOpen, setMasterOpen] = useState(false);
  const [masterRunning, setMasterRunning] = useState(false);
  const [masterProgress, setMasterProgress] = useState({ done: 0, total: 0, ok: 0, err: 0 });
  const [masterLog, setMasterLog] = useState<{ url: string; status: string; reason?: string; before?: number | null; after?: number | null }[]>([]);
  const [masterReaudit, setMasterReaudit] = useState(true);

  const targetsBelow = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((a) => (a.overall_score ?? 100) < 80 && (a.suggested_title || a.suggested_meta))
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 200);
  }, [history]);

  const runMaster = async () => {
    setMasterRunning(true);
    setMasterProgress({ done: 0, total: targetsBelow.length, ok: 0, err: 0 });
    setMasterLog([]);
    let ok = 0, err = 0;
    for (let i = 0; i < targetsBelow.length; i++) {
      const a = targetsBelow[i];
      const path = urlToPath(a.url);
      let before = a.overall_score ?? null;
      let after: number | null = null;
      try {
        const extra_keywords = [
          ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
          ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
        ]
          .map((k: any) => ({ keyword: k.keyword || (typeof k === "string" ? k : ""), reason: k.reason || null }))
          .filter((k) => k.keyword)
          .slice(0, 12);

        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("seo_overrides").upsert({
          url_path: path,
          title: a.suggested_title || null,
          meta_description: (a.suggested_meta || "").slice(0, 160) || null,
          extra_keywords,
          source_audit_id: a.id,
          applied_by: userRes.user?.id || null,
          applied_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "url_path" });
        if (error) throw error;
        ok++;
        if (masterReaudit) {
          after = await reauditAndCapture(path, before, a.language);
        }
        setMasterLog((l) => [...l, { url: path, status: "ok", before, after }]);
      } catch (e: any) {
        err++;
        setMasterLog((l) => [...l, { url: path, status: "error", reason: e.message, before, after }]);
      }
      setMasterProgress({ done: i + 1, total: targetsBelow.length, ok, err });
      await new Promise((r) => setTimeout(r, 200));
    }
    setMasterRunning(false);
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    toast.success(`Master One-Click finalizat: ${ok} aplicate, ${err} erori`);
  };

  /* ============ 2. AI CONTENT REFRESH DETECTOR ============ */
  const refreshTargets = useMemo(() => {
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    return history
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        const old = new Date(a.created_at).getTime() < sixtyDaysAgo;
        const lowScore = (a.overall_score ?? 100) < 75;
        return old || lowScore;
      })
      .slice(0, 30);
  }, [history]);

  const refreshMutation = useMutation({
    mutationFn: async (a: AuditRow) => {
      const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
        body: { url: a.url, language: a.language || "ro", forceRefresh: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, a) => {
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
      toast.success(`Re-analizat: ${urlToPath(a.url)}`);
    },
    onError: (e: any) => toast.error(e.message || "Eșec re-analiză"),
  });

  /* ============ 3. BULK INDEXNOW + SITEMAP ============ */
  const todayOverrides = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return overrides.filter((o) => o.is_active && new Date(o.applied_at).getTime() >= since);
  }, [overrides]);

  const indexnowMutation = useMutation({
    mutationFn: async () => {
      const urls = todayOverrides.map((o) => `https://${CANONICAL_HOST}${o.url_path}`);
      if (urls.length === 0) throw new Error("Niciun override aplicat în ultimele 24h");
      const { data, error } = await supabase.functions.invoke("indexnow-notify", { body: { urls } });
      if (error) throw error;
      try {
        await fetch(`https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/generate-sitemap?t=${Date.now()}`);
      } catch {}
      return { count: urls.length, indexnow: data };
    },
    onSuccess: (d) => toast.success(`${d.count} URL-uri trimise la IndexNow + sitemap regenerat`),
    onError: (e: any) => toast.error(e.message || "Eșec ping"),
  });

  /* ============ 4. PRIORITATE OPTIMIZARE ============ */
  const priorityTargets = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        return (a.overall_score ?? 100) < 95 && (a.suggested_title || a.suggested_meta);
      })
      .sort((a, b) => (a.overall_score ?? 100) - (b.overall_score ?? 100))
      .slice(0, 10);
  }, [history]);

  const applySingleMutation = useMutation({
    mutationFn: async (a: AuditRow) => {
      const path = urlToPath(a.url);
      const before = a.overall_score ?? null;
      const extra_keywords = [
        ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
        ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
      ]
        .map((k: any) => ({ keyword: k.keyword || (typeof k === "string" ? k : ""), reason: k.reason || null }))
        .filter((k) => k.keyword)
        .slice(0, 12);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("seo_overrides").upsert({
        url_path: path,
        title: a.suggested_title || null,
        meta_description: (a.suggested_meta || "").slice(0, 160) || null,
        extra_keywords,
        source_audit_id: a.id,
        applied_by: userRes.user?.id || null,
        applied_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "url_path" });
      if (error) throw error;
      // Re-audit to capture new score
      await reauditAndCapture(path, before, a.language);
      return path;
    },
    onSuccess: (path) => {
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      toast.success(`Aplicat & re-auditat: ${path}`);
    },
    onError: (e: any) => toast.error(e.message || "Eșec aplicare"),
  });

  const [priorityRunning, setPriorityRunning] = useState(false);
  const [priorityProgress, setPriorityProgress] = useState({ done: 0, total: 0, ok: 0, err: 0 });
  const [failedTargets, setFailedTargets] = useState<AuditRow[]>([]);
  const [priorityReaudit, setPriorityReaudit] = useState(true);

  const runPrioritySequence = async (items: AuditRow[], label: string) => {
    setPriorityRunning(true);
    setPriorityProgress({ done: 0, total: items.length, ok: 0, err: 0 });
    setFailedTargets([]);
    const failures: AuditRow[] = [];
    let ok = 0, err = 0;
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      const path = urlToPath(a.url);
      const before = a.overall_score ?? null;
      try {
        const extra_keywords = [
          ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
          ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
        ]
          .map((k: any) => ({ keyword: k.keyword || (typeof k === "string" ? k : ""), reason: k.reason || null }))
          .filter((k) => k.keyword)
          .slice(0, 12);
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("seo_overrides").upsert({
          url_path: path,
          title: a.suggested_title || null,
          meta_description: (a.suggested_meta || "").slice(0, 160) || null,
          extra_keywords,
          source_audit_id: a.id,
          applied_by: userRes.user?.id || null,
          applied_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "url_path" });
        if (error) throw error;
        ok++;
        if (priorityReaudit) {
          await reauditAndCapture(path, before, a.language);
        }
      } catch {
        err++;
        failures.push(items[i]);
      }
      setPriorityProgress({ done: i + 1, total: items.length, ok, err });
      await new Promise((r) => setTimeout(r, 200));
    }
    setFailedTargets(failures);
    setPriorityRunning(false);
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    if (err === 0) {
      toast.success(`${label}: ${ok} aplicate cu succes`);
    } else {
      toast.warning(`${label}: ${ok} aplicate, ${err} erori — folosește „Reluare din erori"`);
    }
  };

  const runPriorityAll = () => runPrioritySequence(priorityTargets, "Prioritate optimizare");
  const retryFailed = () => runPrioritySequence(failedTargets, "Reluare erori");

  /* ============ AGGREGATE STATS ============ */
  const stats = useMemo(() => {
    const seen = new Map<string, AuditRow>();
    history.forEach((a) => {
      const k = urlToPath(a.url);
      const existing = seen.get(k);
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) seen.set(k, a);
    });
    const latest = Array.from(seen.values());
    const scores = latest.map((a) => a.overall_score ?? 0).filter((s) => s > 0);
    const avg = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
    const excellent = latest.filter((a) => (a.overall_score ?? 0) >= 90).length;
    const critical = latest.filter((a) => (a.overall_score ?? 100) < 70).length;
    return { total: latest.length, avg, excellent, critical };
  }, [history]);

  const totalGain = useMemo(() => {
    return Object.values(scoreDeltas)
      .filter((d) => d.status === "done" && d.before != null && d.after != null)
      .reduce((sum, d) => sum + ((d.after! - d.before!) || 0), 0);
  }, [scoreDeltas]);

  const ScoreDeltaBadge = ({ path }: { path: string }) => {
    const d = scoreDeltas[path];
    if (!d) return null;
    if (d.status === "running") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" /> re-audit...
      </span>
    );
    if (d.status === "error") return <span className="text-[10px] text-rose-500">re-audit eșuat</span>;
    if (d.status === "done" && d.after != null) {
      const delta = (d.after ?? 0) - (d.before ?? 0);
      const positive = delta > 0;
      const neutral = delta === 0;
      return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded
          ${positive ? "bg-emerald-100 text-emerald-700" : neutral ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}`}>
          {d.before ?? "—"} → {d.after}
          {!neutral && (
            <>
              <ArrowUpRight className={`w-3 h-3 ${positive ? "" : "rotate-90"}`} />
              {positive ? "+" : ""}{delta}
            </>
          )}
        </span>
      );
    }
    return null;
  };

  return (
    <Card className="relative overflow-hidden border-amber-300/40 bg-gradient-to-br from-amber-50/60 via-background to-amber-50/30 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Crown className="w-6 h-6 text-amber-500" />
              <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-500 bg-clip-text text-transparent">
                SEO Premium Plus
              </span>
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                <Sparkles className="w-3 h-3 mr-1" /> ELITE
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Operațiuni site-wide cu un click — aplică sugestii AI, re-auditează automat și vezi câștigul de scor în timp real.
            </CardDescription>
          </div>
          {totalGain !== 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-90">Câștig total scor</div>
                <div className="font-bold text-lg leading-none">+{totalGain} pct</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl border bg-background/60 backdrop-blur p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Gauge className="w-3 h-3" /> Scor mediu</div>
            <div className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-amber-800 bg-clip-text text-transparent">{stats.avg}<span className="text-xs text-muted-foreground">/100</span></div>
          </div>
          <div className="rounded-xl border bg-background/60 backdrop-blur p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Trophy className="w-3 h-3" /> Excelente</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.excellent}<span className="text-xs text-muted-foreground">/{stats.total}</span></div>
          </div>
          <div className="rounded-xl border bg-background/60 backdrop-blur p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><AlertCircle className="w-3 h-3" /> Critice</div>
            <div className="text-2xl font-bold text-rose-600">{stats.critical}</div>
          </div>
          <div className="rounded-xl border bg-background/60 backdrop-blur p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Activity className="w-3 h-3" /> Override-uri 24h</div>
            <div className="text-2xl font-bold text-blue-600">{todayOverrides.length}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* PRIORITATE OPTIMIZARE */}
        <div className="rounded-xl border-2 border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-transparent dark:from-rose-950/20 p-4 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-md shadow-rose-500/30">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                Prioritate optimizare — top {priorityTargets.length} pagini cu scor mic
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-10">
                Aplică sugestiile AI pentru paginile cu cel mai mic scor (sub 95) + re-audit automat.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={priorityReaudit}
                  onChange={(e) => setPriorityReaudit(e.target.checked)}
                  className="rounded"
                />
                Re-audit după
              </label>
              {failedTargets.length > 0 && !priorityRunning && (
                <Button
                  onClick={retryFailed}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reluare erori ({failedTargets.length})
                </Button>
              )}
              <Button
                onClick={runPriorityAll}
                disabled={priorityRunning || priorityTargets.length === 0}
                className="gap-2 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 shadow-lg shadow-rose-500/30"
              >
                {priorityRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {priorityRunning
                  ? `Rulează ${priorityProgress.done}/${priorityProgress.total}`
                  : `Aplică toate (${priorityTargets.length})`}
              </Button>
            </div>
          </div>
          {priorityRunning && (
            <Progress value={(priorityProgress.done / Math.max(priorityProgress.total, 1)) * 100} className="h-2" />
          )}
          {!priorityRunning && priorityProgress.total > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">✅ {priorityProgress.ok} aplicate</span>
              {priorityProgress.err > 0 && <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-medium">❌ {priorityProgress.err} erori</span>}
              {failedTargets.length > 0 && <span className="text-destructive">{failedTargets.length} de re-rulat</span>}
            </div>
          )}
          {priorityTargets.length > 0 ? (
            <ScrollArea className="h-64 rounded-lg border bg-background/80 backdrop-blur">
              <ul className="divide-y text-sm">
                {priorityTargets.map((a) => {
                  const path = urlToPath(a.url);
                  const score = a.overall_score ?? 0;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/30 transition">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={score < 70 ? "destructive" : score < 85 ? "secondary" : "default"}
                            className="font-mono text-[10px] tabular-nums"
                          >
                            {score}/100
                          </Badge>
                          <span className="truncate text-xs font-mono">{path}</span>
                          <ScoreDeltaBadge path={path} />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        disabled={applySingleMutation.isPending && applySingleMutation.variables?.id === a.id}
                        onClick={() => applySingleMutation.mutate(a)}
                      >
                        {applySingleMutation.isPending && applySingleMutation.variables?.id === a.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle2 className="w-3 h-3" />}
                        <span className="ml-1">Aplică</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground italic">Toate paginile au scor ≥ 95. 🎉</p>
          )}
        </div>

        {/* MASTER ONE-CLICK */}
        <div className="rounded-xl border-2 border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-transparent dark:from-amber-950/20 p-4 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Master One-Click — TOATE sugestiile (&lt;80 score)
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-10">
                Iterează prin {targetsBelow.length} pagini cu scor sub 80, aplică title + meta + keywords și re-auditează.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterReaudit}
                  onChange={(e) => setMasterReaudit(e.target.checked)}
                  className="rounded"
                />
                Re-audit după
              </label>
              <Button
                onClick={() => setMasterOpen(true)}
                disabled={masterRunning || targetsBelow.length === 0}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 shadow-lg shadow-amber-500/30"
              >
                {masterRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {masterRunning ? `Rulează ${masterProgress.done}/${masterProgress.total}` : `Aplică toate (${targetsBelow.length})`}
              </Button>
            </div>
          </div>
          {masterRunning && (
            <Progress value={(masterProgress.done / Math.max(masterProgress.total, 1)) * 100} className="h-2" />
          )}
          {masterLog.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">✅ {masterProgress.ok} aplicate</span>
                {masterProgress.err > 0 && <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-medium">❌ {masterProgress.err} erori</span>}
              </div>
              <ScrollArea className="h-48 rounded-lg border bg-background/80 backdrop-blur">
                <ul className="divide-y text-xs">
                  {masterLog.map((l, i) => {
                    const delta = l.after != null && l.before != null ? l.after - l.before : null;
                    return (
                      <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {l.status === "ok" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          )}
                          <span className="font-mono truncate">{l.url}</span>
                        </div>
                        {delta != null ? (
                          <span className={`font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded
                            ${delta > 0 ? "bg-emerald-100 text-emerald-700" : delta === 0 ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}`}>
                            {l.before} → {l.after} ({delta > 0 ? "+" : ""}{delta})
                          </span>
                        ) : l.status === "ok" && masterReaudit ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </>
          )}
        </div>

        {/* AI CONTENT REFRESH */}
        <div className="rounded-xl border bg-background/80 p-4 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                AI Content Refresh Detector
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-10">
                Pagini cu audit &gt; 60 zile sau scor &lt; 75 — re-rulează audit AI pentru title/meta/keywords actuale.
              </p>
            </div>
            <Badge variant="secondary">{refreshTargets.length} pagini</Badge>
          </div>
          {refreshTargets.length > 0 ? (
            <ScrollArea className="h-48 rounded-lg border bg-background">
              <ul className="divide-y text-sm">
                {refreshTargets.map((a) => {
                  const ageDays = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (24 * 3600 * 1000));
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-mono">{urlToPath(a.url)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Scor {a.overall_score ?? "—"} · acum {ageDays} zile
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={refreshMutation.isPending && refreshMutation.variables?.id === a.id}
                        onClick={() => refreshMutation.mutate(a)}
                      >
                        {refreshMutation.isPending && refreshMutation.variables?.id === a.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Sparkles className="w-3 h-3" />}
                        <span className="ml-1">Re-analizează</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground italic">Toate auditurile sunt actuale și au scor bun.</p>
          )}
        </div>

        {/* BULK INDEXNOW + SITEMAP */}
        <div className="rounded-xl border bg-background/80 p-4 space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <Globe2 className="w-4 h-4 text-white" />
                </div>
                Bulk IndexNow + Sitemap (ultimele 24h)
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-10">
                Trimite la Bing/Yandex/IndexNow toate URL-urile cu override aplicat în ultimele 24h și regenerează sitemap-ul.
              </p>
            </div>
            <Button
              onClick={() => indexnowMutation.mutate()}
              disabled={indexnowMutation.isPending || todayOverrides.length === 0}
              className="gap-2"
              variant={todayOverrides.length === 0 ? "outline" : "default"}
            >
              {indexnowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
              Submit {todayOverrides.length} URL-uri
            </Button>
          </div>
          {todayOverrides.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Niciun override aplicat în ultimele 24h.</p>
          )}
        </div>
      </CardContent>

      {/* CONFIRM DIALOG MASTER */}
      <AlertDialog open={masterOpen} onOpenChange={setMasterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmi aplicarea în masă?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vei aplica title, meta și keywords AI pentru <strong>{targetsBelow.length} pagini</strong> cu scor sub 80.
              {masterReaudit && <> După fiecare aplicare se va rula automat un re-audit AI pentru a măsura câștigul de scor.</>}
              <br /><br />
              Durată estimată: ~{Math.ceil(targetsBelow.length * (masterReaudit ? 8 : 0.3))}s. Toate suprascrierile precedente vor fi înlocuite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setMasterOpen(false); runMaster(); }}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm & rulează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SEOPremiumPlusPanel;
