import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, BellRing, CheckCircle2, Download, ExternalLink, Filter,
  Loader2, PlayCircle, RefreshCw, Rocket, TimerReset,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { matchesUnifiedFilters, useUnifiedPipelineFilters } from "./UnifiedPipelinePanel";

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

// Storage keys for user preferences (persistent per browser)
const LS_AUTO_RECONCILE = "pipeline_recon.auto_enabled";
const LS_ERROR_THRESHOLD = "pipeline_recon.error_threshold";
const AUTO_RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

// Generate a UUID-ish idempotency key (crypto.randomUUID with safe fallback).
const newIdempotencyKey = (prefix: string) => {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${rand}`;
};

export default function PipelineReconciliationPanel() {
  const [win, setWin] = useState(24);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [failures, setFailures] = useState<WorkerFailure[]>([]);
  const [loading, setLoading] = useState(false);
  const [forcingId, setForcingId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eResult, setE2eResult] = useState<any>(null);

  // Idempotency + dedup: keys already dispatched this session (prevents rapid double-clicks).
  const dispatchedKeys = useRef<Set<string>>(new Set());
  const inflightIds = useRef<Set<string>>(new Set());

  // Auto-reconciliation & error threshold settings (persisted in localStorage).
  const [autoEnabled, setAutoEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_AUTO_RECONCILE) === "1"; } catch { return false; }
  });
  const [errorThreshold, setErrorThreshold] = useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem(LS_ERROR_THRESHOLD) || "5", 10);
      return Number.isFinite(v) && v > 0 ? v : 5;
    } catch { return 5; }
  });
  const [lastAutoRun, setLastAutoRun] = useState<Date | null>(null);
  const alertedRef = useRef<string | null>(null); // dedupe alert toasts per session/window

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

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem(LS_AUTO_RECONCILE, autoEnabled ? "1" : "0"); } catch { /* noop */ }
  }, [autoEnabled]);
  useEffect(() => {
    try { localStorage.setItem(LS_ERROR_THRESHOLD, String(errorThreshold)); } catch { /* noop */ }
  }, [errorThreshold]);

  // Auto-reconciliation loop (6h) — republishes orphans without user interaction.
  useEffect(() => {
    if (!autoEnabled) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        // Refresh stats + orphans first
        const { data: orphanData } = await supabase.rpc("list_orphan_prospects", { _since_hours: 24, _limit: 100 });
        const ids = ((orphanData as Orphan[]) || []).map(o => o.id);
        if (ids.length > 0) {
          const idempotency_key = newIdempotencyKey("auto-recon-bulk");
          await supabase.functions.invoke("auto-publish-listings", {
            body: {
              prospect_ids: ids, force: true, use_ai_rewrite: true,
              triggered_by: "auto_reconciliation_6h",
              idempotency_key,
            },
          });
          if (!cancelled) {
            setLastAutoRun(new Date());
            toast({ title: "Reconciliere automată executată", description: `${ids.length} anunțuri orfane reintroduse în flux.` });
            setTimeout(load, 8000);
          }
        } else if (!cancelled) {
          setLastAutoRun(new Date());
        }
      } catch (e: any) {
        console.warn("[auto-reconcile] failed:", e?.message);
      }
    };
    const interval = setInterval(tick, AUTO_RECONCILE_INTERVAL_MS);
    // Kick off a first check ~30s after enabling (not immediately, to avoid surprise).
    const initial = setTimeout(tick, 30_000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(initial); };
  }, [autoEnabled]);

  // Critical error threshold alert (in-UI toast + banner).
  const errorRateExceeded = useMemo(() => {
    if (!stats) return false;
    return stats.worker_failures >= errorThreshold;
  }, [stats, errorThreshold]);

  useEffect(() => {
    if (!stats || !errorRateExceeded) return;
    const key = `${win}:${stats.worker_failures}`;
    if (alertedRef.current === key) return;
    alertedRef.current = key;
    toast({
      title: `⚠ Prag critic depășit: ${stats.worker_failures} erori worker`,
      description: `Praguri configurat: ${errorThreshold}. Verifică log-ul de mai jos.`,
      variant: "destructive",
    });
  }, [stats, errorRateExceeded, errorThreshold, win]);

  const forcePublish = async (ids: string[], reason: string) => {
    // Dedupe: skip IDs already in-flight
    const filtered = ids.filter(id => !inflightIds.current.has(id));
    if (filtered.length === 0) {
      toast({ title: "Deja în procesare", description: "Aceste anunțuri sunt deja trimise la worker." });
      return;
    }
    filtered.forEach(id => inflightIds.current.add(id));
    const idempotency_key = newIdempotencyKey(reason);
    if (dispatchedKeys.current.has(idempotency_key)) return;
    dispatchedKeys.current.add(idempotency_key);
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: {
          prospect_ids: filtered, force: true, use_ai_rewrite: true,
          triggered_by: reason, idempotency_key,
        },
      });
      if (error) throw error;
      toast({
        title: "Republicare forțată dispatched",
        description: `Worker-i lansați: ${data?.summary?.dispatched ?? filtered.length}. Idempotency: ${idempotency_key.slice(-12)}`,
      });
      setTimeout(load, 8000);
    } catch (e: any) {
      toast({ title: "Republicare eșuată", description: e?.message, variant: "destructive" });
    } finally {
      // Release after 20s so retries are possible if worker crashes without updating state.
      setTimeout(() => filtered.forEach(id => inflightIds.current.delete(id)), 20_000);
    }
  };

  const handleForceOne = async (id: string) => {
    if (inflightIds.current.has(id)) return;
    setForcingId(id);
    await forcePublish([id], "reconciliation_panel_single");
    setForcingId(null);
  };

  const handleForceAll = async () => {
    if (orphans.length === 0) return;
    if (!confirm(`Forțează publicarea a ${orphans.length} anunțuri orfane?`)) return;
    setBulkPublishing(true);
    await forcePublish(orphans.map(o => o.id), "reconciliation_panel_bulk");
    setBulkPublishing(false);
  };

  const runE2E = async () => {
    setE2eRunning(true);
    setE2eResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("system-e2e-tests", {
        body: { mode: "manual", triggered_by: "reconciliation_panel" },
      });
      if (error) throw error;
      setE2eResult(data);
      const ok = data?.overall_passed !== false;
      toast({
        title: ok ? "Test E2E: succes" : "Test E2E: eșec",
        description: ok ? "Toate verificările au trecut." : "Verifică rezultatul detaliat mai jos.",
        variant: ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Test E2E eșuat", description: e?.message, variant: "destructive" });
    } finally {
      setE2eRunning(false);
    }
  };

  const exportCsv = () => {
    if (!stats) return;
    const rows = [
      ["metric", "value"],
      ["window_hours", stats.since_hours],
      ["scraped_total", stats.scraped_total],
      ["scraped_vanzare", stats.scraped_vanzare],
      ["validated_publishable", stats.validated_publishable],
      ["rejected_by_validation", stats.rejected_by_validation],
      ["explicitly_rejected", stats.explicitly_rejected],
      ["published_count", stats.published_count],
      ["orphan_count", stats.orphan_count],
      ["worker_failures", stats.worker_failures],
      ["conversion_rate_pct", stats.conversion_rate],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `pipeline-reconciliation-${stats.since_hours}h-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast({ title: "Raport exportat", description: a.download });
  };

  return (
    <div className="space-y-4">
      {errorRateExceeded && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <BellRing className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-medium text-destructive">Rata de erori a workerului a depășit pragul critic</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stats?.worker_failures} erori în ultimele {stats?.since_hours}h &middot; prag setat: {errorThreshold}. Verifică log-ul mai jos și, dacă e cazul, rulează test E2E.
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={runE2E} disabled={e2eRunning}>
            {e2eRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            Test E2E
          </Button>
        </div>
      )}

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
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!stats}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
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

      {/* Automation & alerts settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TimerReset className="w-4 h-4 text-primary" />
            Automatizare & Alerte
          </CardTitle>
          <CardDescription>
            Reconciliere periodică pe fundal (la 6h) + prag critic pentru notificări instantanee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="auto-recon" className="text-sm font-medium">Reconciliere automată la 6h</Label>
              <p className="text-xs text-muted-foreground">
                Reintrodu automat în flux anunțurile orfane. {lastAutoRun && <>Ultima rulare: {formatDistanceToNow(lastAutoRun, { locale: ro, addSuffix: true })}.</>}
              </p>
            </div>
            <Switch id="auto-recon" checked={autoEnabled} onCheckedChange={setAutoEnabled} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="err-threshold" className="text-sm font-medium">Prag critic erori worker</Label>
              <p className="text-xs text-muted-foreground">Alertă în UI când numărul de erori din fereastra curentă depășește acest prag.</p>
            </div>
            <input
              id="err-threshold" type="number" min={1} max={999}
              value={errorThreshold}
              onChange={(e) => setErrorThreshold(Math.max(1, parseInt(e.target.value || "1", 10)))}
              className="w-20 h-9 rounded-md border bg-background px-2 text-sm text-right"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <Button size="sm" variant="outline" onClick={runE2E} disabled={e2eRunning}>
              {e2eRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlayCircle className="w-4 h-4 mr-1" />}
              Rulează test E2E complet
            </Button>
            {e2eResult && (
              <Badge variant={e2eResult.overall_passed === false ? "destructive" : "secondary"} className="text-[10px]">
                {e2eResult.overall_passed === false ? "Eșec" : "OK"} &middot; voice: {e2eResult.voice?.passed ? "✓" : "✗"} &middot; seo: {e2eResult.seo?.passed ? "✓" : "✗"}
              </Badge>
            )}
          </div>
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
                    disabled={forcingId === o.id || inflightIds.current.has(o.id)}
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
                    disabled={forcingId === f.entity_id || inflightIds.current.has(f.entity_id)}
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
