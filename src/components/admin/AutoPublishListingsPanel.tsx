import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2, Play, Sparkles, ShieldCheck, FileText, Eye, Zap, ChevronDown, ChevronUp, RotateCw, AlertCircle } from "lucide-react";
import { EnrichmentBacklogWidget } from "./EnrichmentBacklogWidget";
import { ProductionAlertsConfig } from "./ProductionAlertsConfig";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";


type Counts = {
  drafts: number;
  imported_total: number;
  imported_24h: number;
  candidates: number;
};

export function AutoPublishListingsPanel() {
  const [counts, setCounts] = useState<Counts>({ drafts: 0, imported_total: 0, imported_24h: 0, candidates: 0 });
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const [useAi, setUseAi] = useState(true);
  const [batch, setBatch] = useState(8);
  const [lastSummary, setLastSummary] = useState<any>(null);
  const [backfillProgress, setBackfillProgress] = useState<{
    dispatched: number;
    inserted: number;
    elapsedSec: number;
    done: boolean;
    failed: number;
    dispatchedIds: string[];
    failedIds: string[];
  } | null>(null);
  const [failedDetails, setFailedDetails] = useState<Array<{ id: string; title: string | null; reason: string }>>([]);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const [loadingFailedDetails, setLoadingFailedDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [drafts, total, recent, candidates] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("needs_review", true),
        supabase.from("properties").select("id", { count: "exact", head: true }).not("import_source", "is", null),
        supabase.from("properties").select("id", { count: "exact", head: true })
          .not("imported_at", "is", null)
          .gte("imported_at", new Date(Date.now() - 86400_000).toISOString()),
        supabase.from("prospect_listings").select("id", { count: "exact", head: true })
          .gte("lead_score", 55).eq("is_active", true).eq("prospect_type", "proprietar")
          .not("source_url", "is", null),
      ]);
      setCounts({
        drafts: drafts.count ?? 0,
        imported_total: total.count ?? 0,
        imported_24h: recent.count ?? 0,
        candidates: candidates.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    setLastSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: { batch_size: batch, use_ai_rewrite: useAi, triggered_by: "manual_admin" },
      });
      if (error) throw error;
      setLastSummary(data?.summary);
      toast({
        title: "Rulare completă",
        description: `Publicate: ${data?.summary?.published ?? 0} · refuzate (refuz colaborare): ${data?.summary?.rejected_refusal ?? 0}`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Eroare rulare", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const runBackfill = async () => {
    if (!confirm(`Backfill forțat: procesează imediat candidații acumulați (${counts.candidates}) cu batch_size=25 și prag scor relaxat. Continuă?`)) return;
    setBackfilling(true);
    setLastSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: { batch_size: 25, use_ai_rewrite: useAi, force: true, triggered_by: "manual_backfill" },
      });
      if (error) throw error;
      setLastSummary(data?.summary);
      toast({
        title: "Backfill complet",
        description: `Publicate: ${data?.summary?.published ?? 0} / ${data?.summary?.candidates ?? 0} candidați`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Eroare backfill", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  };

  const executeBackfillRun = async (opts: {
    confirmText: string;
    triggeredBy: string;
    invokeBody: Record<string, unknown>;
    setBusy: (b: boolean) => void;
  }) => {
    if (!confirm(opts.confirmText)) return;
    opts.setBusy(true);
    setLastSummary(null);
    setFailedDetails([]);
    setShowFailedDetails(false);
    setBackfillProgress({
      dispatched: 0, inserted: 0, elapsedSec: 0, done: false, failed: 0,
      dispatchedIds: [], failedIds: [],
    });
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: { ...opts.invokeBody, triggered_by: opts.triggeredBy },
      });
      if (error) throw error;

      const dispatched = Number(data?.summary?.dispatched ?? 0);
      const dispatchedIds: string[] = Array.isArray(data?.summary?.dispatched_ids)
        ? data.summary.dispatched_ids
        : [];
      setLastSummary(data?.summary);
      setBackfillProgress({
        dispatched, inserted: 0, elapsedSec: 0, done: false, failed: 0,
        dispatchedIds, failedIds: [],
      });

      if (dispatched === 0) {
        setBackfillProgress({
          dispatched: 0, inserted: 0, elapsedSec: 0, done: true, failed: 0,
          dispatchedIds: [], failedIds: [],
        });
        toast({ title: "Rulare completă", description: "Niciun candidat eligibil de procesat." });
        load();
        return;
      }

      // Poll properties inserted by workers (fan-out async).
      const MAX_MS = 90_000;
      const POLL_MS = 3_000;
      let inserted = 0;
      let stable = 0;
      let lastInsertedCount = 0;
      while (Date.now() - t0 < MAX_MS) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const { count } = await supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("import_source", opts.triggeredBy)
          .gte("imported_at", startedAt);
        inserted = count ?? 0;
        const elapsedSec = Math.round((Date.now() - t0) / 1000);
        setBackfillProgress((prev) => prev ? {
          ...prev, dispatched, inserted, elapsedSec, done: false, failed: 0,
        } : prev);
        if (inserted >= dispatched) break;
        if (inserted === lastInsertedCount) stable++; else stable = 0;
        lastInsertedCount = inserted;
        if (stable >= 3 && Date.now() - t0 > 15_000) break;
      }

      // Identify failed prospects: dispatched IDs that did NOT yield a property.
      let failedIds: string[] = [];
      if (dispatchedIds.length > 0) {
        const { data: succeeded } = await supabase
          .from("properties")
          .select("migrated_from_prospect_id")
          .in("migrated_from_prospect_id", dispatchedIds)
          .gte("imported_at", startedAt);
        const succeededSet = new Set(
          (succeeded || []).map((r: any) => r.migrated_from_prospect_id).filter(Boolean),
        );
        failedIds = dispatchedIds.filter((id) => !succeededSet.has(id));
      }
      const failed = failedIds.length > 0 ? failedIds.length : Math.max(0, dispatched - inserted);
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      setBackfillProgress({
        dispatched, inserted, elapsedSec, done: true, failed,
        dispatchedIds, failedIds,
      });

      toast({
        title: "Rulare completă",
        description: `${inserted}/${dispatched} drafts create${failed > 0 ? ` · ${failed} eșuate` : ""} (${elapsedSec}s)`,
        variant: failed > 0 ? "destructive" : undefined,
      });
      load();
    } catch (e: any) {
      setBackfillProgress((p) => p ? { ...p, done: true } : null);
      toast({ title: "Eroare rulare", description: e?.message || String(e), variant: "destructive" });
    } finally {
      opts.setBusy(false);
    }
  };

  const runBackfillToDrafts = () => executeBackfillRun({
    confirmText: `Backfill în Drafts: procesează candidații acumulați (${counts.candidates}) și îi salvează ca DRAFTS (is_active=false, needs_review=true) pentru revizuire în Fast Review. Continuă?`,
    triggeredBy: "manual_backfill_drafts",
    invokeBody: { batch_size: 25, use_ai_rewrite: useAi, force: true, pending_review_only: true },
    setBusy: setBackfilling,
  });

  const retryFailed = () => {
    const ids = backfillProgress?.failedIds || [];
    if (ids.length === 0) {
      toast({ title: "Nimic de reluat", description: "Nu există elemente eșuate de procesat." });
      return;
    }
    executeBackfillRun({
      confirmText: `Reluare backfill pentru ${ids.length} prospect${ids.length === 1 ? "" : "e"} eșuat${ids.length === 1 ? "" : "e"}. Continuă?`,
      triggeredBy: "manual_backfill_drafts_retry",
      invokeBody: {
        prospect_ids: ids,
        use_ai_rewrite: useAi,
        force: true,
        pending_review_only: true,
      },
      setBusy: setRetrying,
    });
  };

  const loadFailedDetails = async () => {
    const ids = backfillProgress?.failedIds || [];
    if (ids.length === 0) return;
    setLoadingFailedDetails(true);
    try {
      const { data } = await supabase
        .from("prospect_listings")
        .select("id, title, admin_notes, lifecycle_status")
        .in("id", ids);
      const items = (data || []).map((r: any) => {
        const notes: string = r.admin_notes || "";
        // Extract latest [worker...] reason if present.
        const match = notes.match(/\[worker[^\]]*\][^[]*$/);
        const reason = (match ? match[0] : notes).trim() || `Status: ${r.lifecycle_status || "necunoscut"} — fără detalii`;
        return { id: r.id, title: r.title || null, reason: reason.slice(0, 300) };
      });
      // Maintain original failed-ids order.
      const byId = new Map(items.map((i) => [i.id, i]));
      setFailedDetails(ids.map((id) => byId.get(id) || { id, title: null, reason: "Fără detalii în prospect_listings" }));
    } finally {
      setLoadingFailedDetails(false);
    }
  };

  const toggleFailedDetails = async () => {
    const next = !showFailedDetails;
    setShowFailedDetails(next);
    if (next && failedDetails.length === 0) {
      await loadFailedDetails();
    }
  };





  return (
    <div className="space-y-4">
      <EnrichmentBacklogWidget />
      <ProductionAlertsConfig />
      <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" /> Auto-publish Anunțuri (Site Injector)
              <Badge variant={counts.drafts > 0 ? "default" : "secondary"} className="text-[10px]">
                {counts.drafts} draft{counts.drafts === 1 ? "" : "uri"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Scrapează prospect_listings, sanitizează (fără telefon/adresă/cuvinte interzise), respinge anunțurile cu refuz „fără agenții", rescrie premium cu AI și publică ca DRAFT pe realtrust.ro.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="default" asChild>
              <a href="/admin/properties/fast-review">
                <Eye className="w-3 h-3 mr-1" /> Vedere Rapidă Revizuire
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reîmprospătează"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Candidați</div>
            <div className="text-xl font-bold">{counts.candidates}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Drafturi de revizuit</div>
            <div className="text-xl font-bold text-primary">{counts.drafts}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Importate (24h)</div>
            <div className="text-xl font-bold">{counts.imported_24h}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total importate</div>
            <div className="text-xl font-bold">{counts.imported_total}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
          <div>
            <Label htmlFor="batch-size" className="text-xs">Batch size</Label>
            <input
              id="batch-size"
              type="number" min={1} max={25}
              value={batch}
              onChange={(e) => setBatch(Math.min(25, Math.max(1, parseInt(e.target.value) || 8)))}
              className="mt-1 w-20 px-2 py-1.5 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="use-ai" checked={useAi} onCheckedChange={setUseAi} />
            <Label htmlFor="use-ai" className="text-xs flex items-center gap-1 cursor-pointer">
              <Sparkles className="w-3 h-3" /> Rescriere AI premium
            </Label>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Button
              onClick={runBackfillToDrafts}
              disabled={backfilling || running}
              variant="outline"
              className="gap-2"
              title="Procesează candidații acumulați și îi salvează DOAR ca drafts (inactive) pentru Fast Review — nu live pe site"
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Backfill în Drafts
            </Button>
            <Button
              onClick={runBackfill}
              disabled={backfilling || running}
              variant="secondary"
              className="gap-2"
              title="Rulează cu force=true, batch_size=25 și prag scor relaxat. PUBLICĂ direct (active) — recuperează candidații blocați"
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Backfill forțat (live)
            </Button>
            <Button onClick={runNow} disabled={running || backfilling} className="gap-2">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Procesare..." : "Rulează acum"}
            </Button>
          </div>


        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle className="text-sm">Garanții de conținut premium</AlertTitle>
          <AlertDescription className="text-xs">
            Sistemul elimină automat numere de telefon, adrese cu număr stradal, emailuri și cuvinte interzise pentru un site de agenție: <em>proprietar, persoană fizică, fără comision, direct proprietar, comision 0</em>. Dacă anunțul declară „nu colaborez cu agenții" este respins automat.
          </AlertDescription>
        </Alert>

        {backfillProgress && (
          <div className={`border rounded-lg p-3 space-y-2 ${backfillProgress.done ? (backfillProgress.failed > 0 ? "border-destructive/40 bg-destructive/5" : "border-green-500/40 bg-green-500/5") : "border-primary/40 bg-primary/5"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" />
                {backfillProgress.done ? "Backfill în Drafts — rezumat" : "Backfill în Drafts — în curs..."}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {backfillProgress.elapsedSec}s
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${backfillProgress.done ? (backfillProgress.failed > 0 ? "bg-destructive" : "bg-green-500") : "bg-primary"}`}
                style={{
                  width: `${backfillProgress.dispatched > 0 ? Math.min(100, Math.round((backfillProgress.inserted / backfillProgress.dispatched) * 100)) : 0}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-background/60 p-2">
                <div className="text-muted-foreground text-[10px] uppercase">Trimise</div>
                <div className="font-bold text-base">{backfillProgress.dispatched}</div>
              </div>
              <div className="rounded bg-background/60 p-2">
                <div className="text-muted-foreground text-[10px] uppercase">În pending_review</div>
                <div className="font-bold text-base text-green-600">{backfillProgress.inserted}</div>
              </div>
              <div className="rounded bg-background/60 p-2">
                <div className="text-muted-foreground text-[10px] uppercase">Eșuate</div>
                <div className={`font-bold text-base ${backfillProgress.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {backfillProgress.done ? backfillProgress.failed : "—"}
                </div>
              </div>
            </div>
            {backfillProgress.done && backfillProgress.failed > 0 && (
              <div className="space-y-2 pt-1 border-t border-destructive/20">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleFailedDetails}
                    disabled={loadingFailedDetails}
                    className="gap-1.5"
                  >
                    {loadingFailedDetails ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : showFailedDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showFailedDetails ? "Ascunde detalii eșuate" : `Show failed details (${backfillProgress.failed})`}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={retryFailed}
                    disabled={retrying || backfilling}
                    className="gap-1.5"
                    title="Reia procesarea doar pentru prospectele care au eșuat"
                  >
                    {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                    Retry failed ({backfillProgress.failed})
                  </Button>
                </div>
                {showFailedDetails && (
                  <div className="rounded border border-destructive/30 bg-background/60 max-h-60 overflow-y-auto divide-y divide-destructive/10">
                    {failedDetails.length === 0 && !loadingFailedDetails && (
                      <div className="p-2 text-[11px] text-muted-foreground">Nu am putut încărca detaliile.</div>
                    )}
                    {failedDetails.map((f) => (
                      <div key={f.id} className="p-2 text-[11px] space-y-0.5">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle className="w-3 h-3 mt-0.5 text-destructive shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" title={f.title || f.id}>
                              {f.title || `(fără titlu) ${f.id.slice(0, 8)}`}
                            </div>
                            <div className="text-muted-foreground font-mono text-[10px] break-words">
                              {f.reason}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {backfillProgress.done && backfillProgress.inserted > 0 && (
              <Button size="sm" variant="default" asChild className="w-full">
                <a href="/admin/properties/fast-review">
                  <Eye className="w-3 h-3 mr-1" /> Vezi {backfillProgress.inserted} drafturi în Fast Review
                </a>
              </Button>
            )}
          </div>
        )}



        {lastSummary && (
          <div className="text-xs border rounded-lg p-3 bg-muted/30 space-y-1">
            <div className="font-semibold flex items-center gap-1"><FileText className="w-3 h-3" /> Ultimul rezultat</div>
            <div>Candidați: {lastSummary.candidates} · Scrape-uite: {lastSummary.scraped} · Publicate: <strong>{lastSummary.published}</strong></div>
            <div>Respinse: refuz colaborare {lastSummary.rejected_refusal} · conținut insuficient {lastSummary.rejected_no_content} · duplicat {lastSummary.rejected_duplicate} · erori {lastSummary.rejected_error}</div>
            {lastSummary.errors?.length > 0 && (
              <details className="opacity-80">
                <summary className="cursor-pointer">Erori ({lastSummary.errors.length})</summary>
                <pre className="text-[10px] mt-1 whitespace-pre-wrap">{lastSummary.errors.slice(0, 5).join("\n")}</pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
