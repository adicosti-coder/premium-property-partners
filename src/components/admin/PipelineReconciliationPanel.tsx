import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Rocket,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

type Stats = {
  since_hours: number;
  scraped_total: number;
  scraped_vanzare: number;
  validated_publishable: number;
  rejected_by_validation: number;
  explicitly_rejected: number;
  published_count: number;
  orphan_count: number;
  worker_failures: number;
  conversion_rate: number;
};

type Orphan = {
  id: string; title: string | null; source_platform: string | null;
  source_url: string | null; zone: string | null; price: number | null;
  rooms: number | null; lead_score: number | null; lifecycle_status: string | null;
  admin_notes: string | null; created_at: string;
};

type WorkerFailure = {
  id: string; entity_id: string; created_at: string;
  details: { error?: string; kind?: string } | null; severity: string;
};

const WINDOWS = [
  { label: "24h", value: 24 },
  { label: "72h", value: 72 },
  { label: "7 zile", value: 168 },
];

export default function PipelineReconciliationPanel() {
  const [win, setWin] = useState(24);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [failures, setFailures] = useState<WorkerFailure[]>([]);
  const [loading, setLoading] = useState(false);
  const [forcingId, setForcingId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, o, f] = await Promise.all([
        supabase.rpc("reconcile_import_pipeline", { _since_hours: win }),
        supabase.rpc("list_orphan_prospects", { _since_hours: win, _limit: 50 }),
        supabase.rpc("list_publish_worker_failures", { _limit: 20 }),
      ]);
      if (s.error) throw s.error;
      setStats(s.data as Stats);
      setOrphans((o.data as Orphan[]) || []);
      setFailures((f.data as WorkerFailure[]) || []);
    } catch (e: any) {
      toast({ title: "Nu am putut încărca statisticile", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [win]);

  const forcePublish = async (ids: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: { prospect_ids: ids, force: true, use_ai_rewrite: true, triggered_by: "reconciliation_panel" },
      });
      if (error) throw error;
      toast({
        title: "Republicare forțată dispatched",
        description: `Worker-i lansați: ${data?.summary?.dispatched ?? ids.length}. Verifică în ~30s.`,
      });
      setTimeout(load, 8000);
    } catch (e: any) {
      toast({ title: "Republicare eșuată", description: e?.message, variant: "destructive" });
    }
  };

  const handleForceOne = async (id: string) => {
    setForcingId(id);
    await forcePublish([id]);
    setForcingId(null);
  };

  const handleForceAll = async () => {
    if (orphans.length === 0) return;
    if (!confirm(`Forțează publicarea a ${orphans.length} anunțuri orfane?`)) return;
    setBulkPublishing(true);
    await forcePublish(orphans.map(o => o.id));
    setBulkPublishing(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Reconciliere Pipeline Import
            </CardTitle>
            <CardDescription>
              Monitorizează diferența dintre anunțuri scrapate, validate și efectiv publicate pe site.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden text-xs">
              {WINDOWS.map(w => (
                <button
                  key={w.value}
                  onClick={() => setWin(w.value)}
                  className={`px-3 py-1.5 transition-colors ${win === w.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Scrapate (vânzare)" value={stats.scraped_vanzare} sub={`${stats.scraped_total} total`} />
              <Stat label="Validate publicabile" value={stats.validated_publishable} tone="ok" />
              <Stat label="Publicate pe site" value={stats.published_count} tone="ok" sub={`${stats.conversion_rate}% conversie`} />
              <Stat label="Orfane (validate, nepublicate)" value={stats.orphan_count} tone={stats.orphan_count > 0 ? "warn" : "ok"} />
              <Stat label="Respinse la validare" value={stats.rejected_by_validation} tone={stats.rejected_by_validation > 0 ? "warn" : "muted"} sub="preț/zonă lipsă" />
              <Stat label="Erori worker" value={stats.worker_failures} tone={stats.worker_failures > 0 ? "danger" : "ok"} />
              <Stat label="Explicit respinse" value={stats.explicitly_rejected} tone="muted" />
              <Stat label="Fereastră" value={`${stats.since_hours}h`} tone="muted" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Anunțuri orfane ({orphans.length})
            </CardTitle>
            <CardDescription>Validate dar niciodată publicate — reintroduse manual în flux.</CardDescription>
          </div>
          {orphans.length > 0 && (
            <Button size="sm" onClick={handleForceAll} disabled={bulkPublishing}>
              {bulkPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />}
              Forțează toate
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {orphans.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Niciun anunț orfan — pipeline sănătos.
            </div>
          ) : (
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {orphans.map(o => (
                <div key={o.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate max-w-md" title={o.title || undefined}>
                        {o.title || "(fără titlu)"}
                      </span>
                      {o.source_url && (
                        <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{o.source_platform || "n/a"}</Badge>
                      {o.zone && <Badge variant="secondary" className="text-[10px]">{o.zone}</Badge>}
                      {o.price && <Badge variant="secondary" className="text-[10px]">{Math.round(o.price).toLocaleString()} €</Badge>}
                      {o.rooms && <Badge variant="secondary" className="text-[10px]">{o.rooms} cam</Badge>}
                      <Badge variant="outline" className="text-[10px]">scor {o.lead_score ?? "-"}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(o.created_at), { locale: ro, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => handleForceOne(o.id)}
                    disabled={forcingId === o.id}
                  >
                    {forcingId === o.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><Rocket className="w-3.5 h-3.5 mr-1" /> Publică</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Ultimele erori worker ({failures.length})
          </CardTitle>
          <CardDescription>Log vizual pentru intervenție rapidă pe rulări eșuate.</CardDescription>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fără erori recente.
            </div>
          ) : (
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {failures.map(f => (
                <div key={f.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">{f.details?.kind || "worker_error"}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(f.created_at), { locale: ro, addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate" title={f.details?.error || undefined}>
                      {f.details?.error || "(fără detalii)"}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => handleForceOne(f.entity_id)}
                    disabled={forcingId === f.entity_id}
                  >
                    {forcingId === f.entity_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><Rocket className="w-3.5 h-3.5 mr-1" /> Retry</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label, value, sub, tone = "default",
}: {
  label: string; value: number | string; sub?: string;
  tone?: "default" | "ok" | "warn" | "danger" | "muted";
}) {
  const toneMap: Record<string, string> = {
    default: "text-foreground",
    ok: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
    muted: "text-muted-foreground",
  };
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneMap[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
