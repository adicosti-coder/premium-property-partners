import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Play, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

type Counts = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  retry_due: number;
  exhausted: number;
};

const EMPTY: Counts = { pending: 0, processing: 0, done: 0, failed: 0, retry_due: 0, exhausted: 0 };

export function EnrichmentBacklogWidget() {
  const [c, setC] = useState<Counts>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const base = supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        .eq("prospect_type", "proprietar")
        .eq("is_active", true)
        .not("source_url", "is", null);
      const nowIso = new Date().toISOString();
      const [pending, processing, done, failed, retryDue, exhausted] = await Promise.all([
        base.or("enrichment_status.is.null,enrichment_status.eq.pending"),
        base.eq("enrichment_status", "processing"),
        base.eq("enrichment_status", "done"),
        base.eq("enrichment_status", "failed"),
        base.eq("enrichment_status", "failed").lt("enrichment_attempts", 3)
          .or(`enrichment_next_retry_at.is.null,enrichment_next_retry_at.lte.${nowIso}`),
        base.eq("enrichment_status", "failed").gte("enrichment_attempts", 3),
      ]);
      setC({
        pending: pending.count ?? 0,
        processing: processing.count ?? 0,
        done: done.count ?? 0,
        failed: failed.count ?? 0,
        retry_due: retryDue.count ?? 0,
        exhausted: exhausted.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrichment-backlog-worker", {
        body: { batch_size: 10 },
      });
      if (error) throw error;
      setLastResult(data);
      toast({
        title: "Backlog procesat",
        description: `${data?.succeeded ?? 0}/${data?.picked ?? 0} reușite${data?.failed ? ` · ${data.failed} eșuate` : ""}`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare backlog", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const resetExhausted = async () => {
    const { error } = await supabase
      .from("prospect_listings")
      .update({ enrichment_attempts: 0, enrichment_next_retry_at: null, enrichment_error: null })
      .eq("prospect_type", "proprietar")
      .eq("is_active", true)
      .eq("enrichment_status", "failed")
      .gte("enrichment_attempts", 3);
    if (error) {
      toast({ title: "Eroare reset", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Retry resetat", description: "Anunțurile epuizate vor fi reluate la următoarea rulare." });
    await load();
  };

  return (
    <Card className="border-purple-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-purple-600" /> Backlog Enrichment AI (auto, cron */5m)
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
            </Button>
            <Button size="sm" onClick={runNow} disabled={running} className="gap-1">
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Rulează acum
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Stat label="Pending" value={c.pending} icon={<Clock className="w-3 h-3" />} tone="default" />
          <Stat label="În lucru" value={c.processing} tone="secondary" />
          <Stat label="Done" value={c.done} icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />} tone="default" />
          <Stat label="Failed total" value={c.failed} tone="secondary" />
          <Stat label="Retry scadent" value={c.retry_due} tone={c.retry_due > 0 ? "default" : "secondary"} />
          <Stat label="Epuizate (3/3)" value={c.exhausted} icon={<AlertTriangle className="w-3 h-3 text-orange-600" />} tone={c.exhausted > 0 ? "destructive" : "secondary"} />
        </div>

        {c.exhausted > 0 && (
          <div className="flex items-center justify-between text-xs border rounded-lg p-2 bg-orange-500/5 border-orange-500/30">
            <span className="text-muted-foreground">
              {c.exhausted} anunțuri au atins limita de 3 încercări. Poți reseta contoarele.
            </span>
            <Button size="sm" variant="ghost" className="h-7" onClick={resetExhausted}>
              Reset retry
            </Button>
          </div>
        )}

        {lastResult && (
          <div className="text-[11px] text-muted-foreground border-t pt-2">
            Ultima rulare: picked <strong>{lastResult.picked}</strong> · reușite <strong className="text-emerald-600">{lastResult.succeeded}</strong> · eșuate <strong className="text-orange-600">{lastResult.failed}</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone: "default" | "secondary" | "destructive" }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-lg font-bold">{value}</span>
        {value > 0 && tone !== "secondary" && (
          <Badge variant={tone} className="text-[9px] px-1 py-0">!</Badge>
        )}
      </div>
    </div>
  );
}
