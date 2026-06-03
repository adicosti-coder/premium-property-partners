import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2, Play, Sparkles, ShieldCheck, FileText, Eye, Zap } from "lucide-react";
import { EnrichmentBacklogWidget } from "./EnrichmentBacklogWidget";
import { ProductionAlertsConfig } from "./ProductionAlertsConfig";


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

  const runBackfillToDrafts = async () => {
    if (!confirm(`Backfill în Drafts: procesează candidații acumulați (${counts.candidates}) și îi salvează ca DRAFTS (is_active=false, needs_review=true) pentru revizuire în Fast Review. Continuă?`)) return;
    setBackfilling(true);
    setLastSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: {
          batch_size: 25,
          use_ai_rewrite: useAi,
          force: true,
          pending_review_only: true,
          triggered_by: "manual_backfill_drafts",
        },
      });
      if (error) throw error;
      setLastSummary(data?.summary);
      toast({
        title: "Backfill în Drafts complet",
        description: `${data?.summary?.dispatched ?? 0} candidați trimiși spre Fast Review (drafts inactive).`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Eroare backfill drafts", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBackfilling(false);
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
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={runBackfill}
              disabled={backfilling || running}
              variant="secondary"
              className="gap-2"
              title="Rulează cu force=true, batch_size=25 și prag scor relaxat pentru a recupera candidații blocați"
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {backfilling ? "Backfill..." : "Backfill forțat"}
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
