import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Radio, RotateCw } from "lucide-react";
import type { Run } from "./types";

type WorkerFailRow = {
  id: string;
  entity_id: string | null;
  created_at: string;
  details: { error?: string; kind?: string; idempotency_key?: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  ai_gemini_error: "AI (Gemini)",
  scrape_error: "Scrape (Firecrawl)",
  html_corrupt: "HTML / Sanitizer",
  worker_error: "Generic worker",
};

const KIND_BADGE: Record<string, string> = {
  ai_gemini_error: "border-purple-400 text-purple-700 dark:text-purple-300",
  scrape_error: "border-amber-400 text-amber-700 dark:text-amber-300",
  html_corrupt: "border-orange-400 text-orange-700 dark:text-orange-300",
  worker_error: "border-destructive/60 text-destructive",
};

function FanOutFailuresDialog({ count, loading }: { count: number; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkerFailRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [reprocessing, setReprocessing] = useState<Record<string, boolean>>({});

  const load = async () => {
    setBusy(true);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, entity_id, created_at, details")
      .eq("action", "auto_publish_worker_failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as unknown as WorkerFailRow[]);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const grouped = useMemo(() => {
    const m: Record<string, WorkerFailRow[]> = {};
    for (const r of rows) {
      const k = r.details?.kind || "worker_error";
      (m[k] = m[k] || []).push(r);
    }
    return m;
  }, [rows]);

  const forceReprocess = async (row: WorkerFailRow) => {
    if (!row.entity_id) return;
    setReprocessing((s) => ({ ...s, [row.id]: true }));
    try {
      const idempotency_key = `force:${row.entity_id}:${Date.now()}`;
      const { data, error } = await supabase.functions.invoke("auto-publish-listing-worker", {
        body: {
          prospect_id: row.entity_id,
          idempotency_key,
          force: true,
          triggered_by: "manual_reprocess",
        },
        headers: { "x-idempotency-key": idempotency_key },
      });
      if (error) throw error;
      const ok = (data as any)?.success && (data as any)?.published;
      toast({
        title: ok ? "Reprocesare reușită" : "Reprocesare trimisă",
        description: ok
          ? `Publicat ca ${(data as any).property_id?.slice(0, 8) || "—"}`
          : (data as any)?.reason || (data as any)?.error || "Worker invocat.",
      });
      load();
    } catch (e: any) {
      toast({ title: "Eșec reprocesare", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setReprocessing((s) => ({ ...s, [row.id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading || count === 0}
        className={`font-semibold tabular-nums underline-offset-2 ${
          count > 0
            ? "text-destructive hover:underline cursor-pointer"
            : "text-foreground cursor-default"
        } disabled:no-underline disabled:cursor-default`}
        title={count > 0 ? "Vezi diagnostic eșecuri" : "Niciun eșec în ultimele 24h"}
        aria-label={count > 0 ? "Vezi diagnostic eșecuri fan-out" : "Niciun eșec fan-out"}
      >
        {loading ? "…" : count}
      </button>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Diagnostic Eșecuri Fan-Out
          </DialogTitle>
          <DialogDescription>
            Prospecți cu tag <code className="text-[11px]">[worker-fail:…]</code> din ultimele 24h, grupați pe tip de eroare. Poți forța reprocesarea ignorând eroarea anterioară.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {busy ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Niciun eșec în ultimele 24h. ✅
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([kind, items]) => (
                <div key={kind} className="border rounded-md overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[11px] ${KIND_BADGE[kind] || ""}`}>
                        {KIND_LABEL[kind] || kind}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{items.length} eșec(uri)</span>
                    </div>
                  </div>
                  <div className="divide-y">
                    {items.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            <span className="font-mono">{r.entity_id?.slice(0, 8) || "—"}</span>
                          </div>
                          <div className="font-mono text-foreground/80 truncate" title={r.details?.error || ""}>
                            {r.details?.error || "—"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] shrink-0"
                          disabled={!r.entity_id || !!reprocessing[r.id]}
                          onClick={() => forceReprocess(r)}
                          aria-label="Forțează reprocesare prospect"
                        >
                          {reprocessing[r.id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          <span className="ml-1">Forțează</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function FanOutStatsCard({ runs, dismissedFailsBefore }: { runs: Run[]; dismissedFailsBefore: number }) {
  const [stats, setStats] = useState<{
    published24: number;
    pmsRuns24: number;
    dispatched24: number;
    workerFails24: number;
    updatedReservations24: number;
    pmsSuccess24: number;
    loading: boolean;
  }>({
    published24: 0, pmsRuns24: 0, dispatched24: 0,
    workerFails24: 0, updatedReservations24: 0, pmsSuccess24: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [
        { count: pubCount },
        { count: pmsCount },
        { count: failCount },
        { count: updatedResCount },
        pmsSuccessRes,
      ] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true })
          .gte("imported_at", since).not("import_source", "is", null),
        supabase.from("automation_runs").select("id", { count: "exact", head: true })
          .eq("job_key", "sync-ical-bookings").gte("started_at", since),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true })
          .eq("action", "auto_publish_worker_failed").gte("created_at", since),
        supabase.from("prospect_listings").select("id", { count: "exact", head: true })
          .eq("lifecycle_status", "updated_reservation" as any).gte("updated_at", since),
        supabase.from("automation_runs").select("id", { count: "exact", head: true })
          .eq("job_key", "sync-ical-bookings").eq("status", "success").gte("started_at", since),
      ]);
      const autoRuns24 = runs.filter(
        (r) => r.job_key === "auto-publish-listings" &&
          new Date(r.started_at).getTime() > Date.now() - 24 * 3600_000,
      );
      const dispatched24 = autoRuns24.reduce((acc, r) => {
        const o = (r.output_summary || {}) as Record<string, unknown>;
        return acc + (Number(o.dispatched) || 0);
      }, 0);
      if (!cancelled) setStats({
        published24: pubCount ?? 0,
        pmsRuns24: pmsCount ?? 0,
        dispatched24,
        workerFails24: failCount ?? 0,
        updatedReservations24: updatedResCount ?? 0,
        pmsSuccess24: pmsSuccessRes.count ?? 0,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [runs]);

  useEffect(() => {
    const cpuFails = runs.filter((r) =>
      r.job_key === "auto-publish-listings" &&
      (r.status === "failed" || r.status === "timeout") &&
      /cpu time|cpu_time|cpu limit/i.test(String((r.output_summary as any)?.error || r.error || "")),
    );
    if (cpuFails.length === 0) return;
    const lastFail = cpuFails[0];
    const successAfter = runs.find((r) =>
      r.job_key === "auto-publish-listings" && r.status === "success" &&
      new Date(r.started_at).getTime() > new Date(lastFail.started_at).getTime(),
    );
    if (successAfter) {
      const t = new Date(successAfter.started_at).getTime();
      if (t > dismissedFailsBefore) {
        window.localStorage.setItem("autom_fails_dismissed_until", String(t));
      }
    }
  }, [runs, dismissedFailsBefore]);

  const pmsMatch = stats.updatedReservations24 === 0
    ? "—"
    : stats.pmsSuccess24 >= stats.updatedReservations24
    ? "sincronizat"
    : "decalaj";

  return (
    <Card className="bg-card/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> Auto-publish fan-out · ultimele 24h
        </CardTitle>
        <CardDescription className="text-xs">
          Workerul izolat procesează o singură proprietate per invocare (sanitizer + AI rewrite + insert) — cu idempotency key per prospect, fără duplicate.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1 space-y-2">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.published24}</div>
            <div className="text-[11px] text-muted-foreground">publicate prin fan-out</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.dispatched24}</div>
            <div className="text-[11px] text-muted-foreground">workeri dispatched</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.pmsRuns24}</div>
            <div className="text-[11px] text-muted-foreground">sincronizări PMS</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
          <span className="flex items-center gap-1">
            Workeri eșuați (24h):{" "}
            <FanOutFailuresDialog count={stats.workerFails24} loading={stats.loading} />
          </span>
          <span>
            Audit PMS · updated_reservation: <span className="font-semibold tabular-nums text-foreground">{stats.updatedReservations24}</span>
            {" "}vs sync OK: <span className="font-semibold tabular-nums text-foreground">{stats.pmsSuccess24}</span>
            {" "}<span className={pmsMatch === "decalaj" ? "text-destructive" : "text-emerald-600"}>({pmsMatch})</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
