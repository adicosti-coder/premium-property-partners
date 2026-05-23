import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Activity, Brain, Loader2, Play, ShieldAlert, Sparkles, TrendingUp, Zap } from "lucide-react";

type Metric = {
  id: string;
  run_at: string;
  triggered_by: string | null;
  candidates: number;
  published: number;
  avg_quality_score: number | null;
  rejected_refusal: number;
  rejected_low_quality: number;
  rejected_no_content: number;
  rejected_duplicate: number;
  rejected_error: number;
};

type Learning = {
  id: string;
  pattern_type: string;
  pattern: string;
  evidence_count: number;
  confidence: number;
  is_active: boolean;
  first_seen: string;
};

type SourceHealth = {
  source_platform: string;
  total_approved: number;
  total_edited: number;
  total_user_rejected: number;
  approval_rate: number;
  consecutive_failures: number;
  auto_disabled_until: string | null;
};

type HealLogRow = {
  id: string;
  decided_at: string;
  decision: string;
  rationale: string | null;
};

export function ListingImportHealthPanel() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [logs, setLogs] = useState<HealLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [healing, setHealing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, s, lg] = await Promise.all([
        supabase.from("listing_import_metrics").select("*").order("run_at", { ascending: false }).limit(10),
        supabase.from("listing_import_learnings").select("*").order("evidence_count", { ascending: false }).limit(20),
        supabase.from("listing_import_source_health").select("*").order("approval_rate", { ascending: true }),
        supabase.from("listing_import_heal_log").select("id, decided_at, decision, rationale").order("decided_at", { ascending: false }).limit(15),
      ]);
      setMetrics((m.data || []) as Metric[]);
      setLearnings((l.data || []) as Learning[]);
      setSources((s.data || []) as SourceHealth[]);
      setLogs((lg.data || []) as HealLogRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSelfHeal = async () => {
    setHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("listing-import-self-heal", { body: {} });
      if (error) throw error;
      toast({
        title: "Self-heal rulat",
        description: `${data?.decisions_count ?? 0} decizii · ${data?.kpi?.published_24h ?? 0}/${data?.kpi?.candidates_24h ?? 0} publicate ultima zi.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare self-heal", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setHealing(false);
    }
  };

  const toggleLearning = async (id: string, current: boolean) => {
    await supabase.from("listing_import_learnings")
      .update({ is_active: !current, promoted_at: !current ? new Date().toISOString() : null })
      .eq("id", id);
    setLearnings((p) => p.map((l) => l.id === id ? { ...l, is_active: !current } : l));
  };

  const releaseSource = async (platform: string) => {
    await supabase.from("listing_import_source_health")
      .update({ auto_disabled_until: null, consecutive_failures: 0, notes: "Manual: re-enable din admin" })
      .eq("source_platform", platform);
    toast({ title: "Sursă re-activată", description: platform });
    await load();
  };

  // KPIs from last 10 runs
  const totals = metrics.reduce((acc, m) => {
    acc.cand += m.candidates || 0;
    acc.pub += m.published || 0;
    acc.lowQ += m.rejected_low_quality || 0;
    acc.qSum += Number(m.avg_quality_score || 0);
    acc.qN += m.avg_quality_score ? 1 : 0;
    return acc;
  }, { cand: 0, pub: 0, lowQ: 0, qSum: 0, qN: 0 });
  const pubRate = totals.cand > 0 ? Math.round((totals.pub / totals.cand) * 100) : 0;
  const avgQ = totals.qN > 0 ? Math.round(totals.qSum / totals.qN) : 0;

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4 text-emerald-600" /> Self-Healing & Învățare Continuă
              <Badge variant="secondary" className="text-[10px]">{learnings.filter((l) => l.is_active).length} learnings active</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Pipeline-ul învață din fiecare aprobare/editare/respingere și se auto-reglează: dezactivează surse slabe, promovează pattern-uri noi de filtrare, ajustează batch-ul.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reîmprospătează"}
            </Button>
            <Button size="sm" variant="default" onClick={runSelfHeal} disabled={healing} className="gap-1">
              {healing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Rulează self-heal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Rată publicare</div>
            <div className="text-xl font-bold">{pubRate}%</div>
            <div className="text-[10px] text-muted-foreground">{totals.pub}/{totals.cand} ultimele {metrics.length} rulări</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Calitate medie</div>
            <div className="text-xl font-bold">{avgQ}</div>
            <div className="text-[10px] text-muted-foreground">/100 (heuristic)</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Filtrate calitate</div>
            <div className="text-xl font-bold">{totals.lowQ}</div>
            <div className="text-[10px] text-muted-foreground">respinse automat sub prag</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Brain className="w-3 h-3" /> Pattern-uri învățate</div>
            <div className="text-xl font-bold">{learnings.length}</div>
            <div className="text-[10px] text-muted-foreground">{learnings.filter((l) => l.is_active).length} active</div>
          </div>
        </div>

        {/* Source health */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Activity className="w-3 h-3" /> Sănătate surse
          </div>
          {sources.length === 0 ? (
            <div className="text-xs text-muted-foreground">Încă nu există date de revizuire.</div>
          ) : (
            <div className="space-y-1">
              {sources.map((s) => {
                const disabled = s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() > Date.now();
                const samples = s.total_approved + s.total_edited + s.total_user_rejected;
                return (
                  <div key={s.source_platform} className="flex items-center justify-between gap-3 py-1 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{s.source_platform}</span>
                      {disabled && <Badge variant="destructive" className="text-[10px]">Auto-disabled</Badge>}
                      <span className="text-muted-foreground">{samples} mostre · {s.consecutive_failures} fail consec.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.approval_rate >= 60 ? "default" : s.approval_rate >= 35 ? "secondary" : "destructive"}>
                        {s.approval_rate}%
                      </Badge>
                      {disabled && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => releaseSource(s.source_platform)}>
                          Re-activează
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Learnings */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Pattern-uri auto-învățate (top 20)</span>
            <span className="text-[10px] text-muted-foreground normal-case">activează manual sau așteaptă ≥3 dovezi</span>
          </div>
          {learnings.length === 0 ? (
            <div className="text-xs text-muted-foreground">Niciun pattern învățat încă. Editează/respinge anunțuri din FastReview pentru a hrăni sistemul.</div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {learnings.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Switch checked={l.is_active} onCheckedChange={() => toggleLearning(l.id, l.is_active)} />
                    <span className="font-mono truncate">{l.pattern}</span>
                    <Badge variant="outline" className="text-[10px]">{l.pattern_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{l.evidence_count} dovezi</span>
                    <span>·</span>
                    <span>conf {Math.round(l.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heal decisions */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" /> Ultimele decizii self-heal
          </div>
          {logs.length === 0 ? (
            <div className="text-xs text-muted-foreground">Niciun istoric încă.</div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {logs.map((l) => (
                <div key={l.id} className="text-[11px] flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">{l.decision}</Badge>
                  <div className="min-w-0">
                    <div className="truncate">{l.rationale}</div>
                    <div className="text-muted-foreground text-[10px]">{new Date(l.decided_at).toLocaleString("ro-RO")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle className="text-sm">Cum se îmbunătățește singur</AlertTitle>
          <AlertDescription className="text-xs">
            La fiecare editare în FastReview, sistemul extrage fragmentele șterse de admin și le contează ca dovezi. La 3 dovezi același pattern se activează automat ca filtru. Sursele cu rată aprobare sub {35}% sunt suspendate 12h. Cron-ul rulează la fiecare 30 min.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Suppress unused import warning for Label (kept for future tuning UI)
void Label;
