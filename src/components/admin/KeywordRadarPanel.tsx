import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Radar, RefreshCw, Play, Loader2, TrendingUp, Search, Globe,
  Building2, MapPin, CheckCircle2, XCircle, Clock,
} from "lucide-react";

type KwRow = {
  id: string;
  keyword: string;
  source: string;
  category: string;
  platforms: string[];
  priority_score: number;
  volume: number;
  results_count: number;
  total_results_count: number;
  scan_count: number;
  last_scanned_at: string | null;
  is_active: boolean;
};

type RunRow = {
  id: string;
  run_type: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: string;
  stats: Record<string, unknown>;
  error: string | null;
};

const SOURCE_META: Record<string, { label: string; icon: typeof Search; color: string }> = {
  onsite: { label: "Căutări pe site", icon: Search, color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  gsc: { label: "Google Search", icon: Globe, color: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  auto_property: { label: "Proprietate", icon: Building2, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  auto_zone: { label: "Zonă", icon: MapPin, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  semrush: { label: "Semrush", icon: TrendingUp, color: "bg-pink-500/15 text-pink-700 dark:text-pink-300" },
  manual: { label: "Manual", icon: Radar, color: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "niciodată";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)} min`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

const KeywordRadarPanel = () => {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: keywords = [], isLoading: kwLoading } = useQuery({
    queryKey: ["keyword-radar-queries", sourceFilter],
    queryFn: async () => {
      let q = supabase
        .from("keyword_radar_queries")
        .select("*")
        .order("priority_score", { ascending: false })
        .limit(200);
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as KwRow[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["keyword-radar-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_radar_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as RunRow[];
    },
    refetchInterval: 5000,
  });

  const discoverMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("keyword-radar-discover", {
        body: { triggered_by: "admin_ui" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Descoperire finalizată",
        description: `${data?.stats?.upserted || 0} cuvinte-cheie actualizate (${data?.stats?.onsite || 0} on-site, ${data?.stats?.gsc || 0} GSC, ${(data?.stats?.auto_property || 0) + (data?.stats?.auto_zone || 0)} auto)`,
      });
      qc.invalidateQueries({ queryKey: ["keyword-radar-queries"] });
      qc.invalidateQueries({ queryKey: ["keyword-radar-runs"] });
    },
    onError: (e: any) => toast({ title: "Eroare descoperire", description: String(e?.message || e), variant: "destructive" }),
  });

  const scanMut = useMutation({
    mutationFn: async (vars: { keyword_ids?: string[]; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("keyword-radar-scan", {
        body: { triggered_by: "admin_ui", ...vars },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Scanare finalizată",
        description: `${data?.stats?.keywords_scanned || 0} keywords · ${data?.stats?.total_results || 0} anunțuri noi`,
      });
      qc.invalidateQueries({ queryKey: ["keyword-radar-queries"] });
      qc.invalidateQueries({ queryKey: ["keyword-radar-runs"] });
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast({ title: "Eroare scanare", description: String(e?.message || e), variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("keyword_radar_queries")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-radar-queries"] }),
  });

  const sourceCounts = keywords.reduce<Record<string, number>>((acc, k) => {
    acc[k.source] = (acc[k.source] || 0) + 1;
    return acc;
  }, {});
  const lastDiscoverRun = runs.find((r) => r.run_type === "discover");
  const lastScanRun = runs.find((r) => r.run_type === "scan");

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            Keyword Radar — Ecosistem de Descoperire
          </CardTitle>
          <CardDescription>
            Identifică automat cuvintele-cheie din căutările reale de pe realtrust.ro + Google Search Console
            + paginile existente, apoi caută anunțuri proaspete pe OLX, Storia, imobiliare.ro și
            Booking/Airbnb. Rulează automat zilnic la 06:00. Anunțurile noi ajung în <strong>Fast Review</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => discoverMut.mutate()}
              disabled={discoverMut.isPending}
              variant="outline"
            >
              {discoverMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Descoperă acum
            </Button>
            <Button
              onClick={() => scanMut.mutate({ limit: 15 })}
              disabled={scanMut.isPending}
            >
              {scanMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Scanează Top 15
            </Button>
            {selectedIds.size > 0 && (
              <Button
                onClick={() => scanMut.mutate({ keyword_ids: [...selectedIds] })}
                disabled={scanMut.isPending}
                variant="secondary"
              >
                <Play className="w-4 h-4 mr-2" />
                Scanează selectate ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Last runs summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">Ultima descoperire</span>
                {lastDiscoverRun?.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : lastDiscoverRun?.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="font-medium">
                {lastDiscoverRun ? timeAgo(lastDiscoverRun.started_at) : "—"}
                {lastDiscoverRun?.stats && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {(lastDiscoverRun.stats as any).upserted || 0} keywords
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">Ultima scanare</span>
                {lastScanRun?.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : lastScanRun?.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="font-medium">
                {lastScanRun ? timeAgo(lastScanRun.started_at) : "—"}
                {lastScanRun?.stats && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {(lastScanRun.stats as any).total_results || 0} anunțuri noi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Source filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sourceFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("all")}
            >
              Toate ({keywords.length})
            </Button>
            {Object.entries(SOURCE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = sourceCounts[key] || 0;
              if (count === 0 && sourceFilter !== key) return null;
              return (
                <Button
                  key={key}
                  variant={sourceFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSourceFilter(key)}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {meta.label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Keywords list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuvinte-cheie monitorizate</CardTitle>
        </CardHeader>
        <CardContent>
          {kwLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
              Se încarcă…
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nu există cuvinte-cheie. Apasă <strong>Descoperă acum</strong> pentru a popula lista.
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((kw) => {
                const meta = SOURCE_META[kw.source] || SOURCE_META.manual;
                const Icon = meta.icon;
                const isSelected = selectedIds.has(kw.id);
                return (
                  <div
                    key={kw.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(kw.id); else next.delete(kw.id);
                          setSelectedIds(next);
                        }}
                        className="mt-1.5 h-4 w-4 rounded border-input"
                        aria-label={`Selectează ${kw.keyword}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{kw.keyword}</span>
                          <Badge variant="secondary" className={`text-xs ${meta.color}`}>
                            <Icon className="w-3 h-3 mr-1" /> {meta.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{kw.category}</Badge>
                          {!kw.is_active && <Badge variant="destructive" className="text-xs">Inactiv</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Prioritate: <strong className="text-foreground">{Math.round(kw.priority_score)}</strong></span>
                          {kw.volume > 0 && <span>Volum: {kw.volume}</span>}
                          <span>Scanat: {timeAgo(kw.last_scanned_at)}</span>
                          {kw.total_results_count > 0 && (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Total anunțuri: {kw.total_results_count}
                            </span>
                          )}
                          {kw.scan_count > 0 && <span>×{kw.scan_count} scanări</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => scanMut.mutate({ keyword_ids: [kw.id] })}
                          disabled={scanMut.isPending}
                          aria-label="Scanează acum"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive.mutate({ id: kw.id, active: !kw.is_active })}
                          aria-label={kw.is_active ? "Dezactivează" : "Activează"}
                        >
                          {kw.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Istoric rulaje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 text-sm">
            {runs.length === 0 && <div className="text-muted-foreground">Niciun rulaj încă.</div>}
            {runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border bg-card px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={r.run_type === "discover" ? "secondary" : "default"}>
                    {r.run_type === "discover" ? "Descoperire" : "Scanare"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString("ro-RO")}</span>
                  {r.duration_ms && <span className="text-xs text-muted-foreground">{(r.duration_ms / 1000).toFixed(1)}s</span>}
                </div>
                <div className="flex items-center gap-2">
                  {r.run_type === "scan" && (r.stats as any)?.total_results !== undefined && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      +{(r.stats as any).total_results} anunțuri
                    </span>
                  )}
                  {r.run_type === "discover" && (r.stats as any)?.upserted !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {(r.stats as any).upserted} kw
                    </span>
                  )}
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : r.status === "failed" ? (
                    <XCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordRadarPanel;
