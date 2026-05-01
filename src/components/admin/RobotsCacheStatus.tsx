import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Bot,
  History,
  Hash,
} from "lucide-react";

interface RobotsLogEntry {
  id: string;
  event_type: string;
  http_status: number | null;
  fetch_error: string | null;
  raw_size: number | null;
  rules_count: number | null;
  sitemaps_count: number | null;
  content_hash: string | null;
  previous_content_hash: string | null;
  trigger_reason: string | null;
  created_at: string;
}

interface RobotsStatusResponse {
  ok: boolean;
  host: string;
  cache: {
    fetched_at: string;
    expires_at: string;
    http_status: number | null;
    fetch_error: string | null;
    content_hash: string | null;
    last_change_detected_at: string | null;
    rules_count: number;
    sitemaps_count: number;
    raw_size: number;
    fetch_count: number;
    invalidation_count: number;
  } | null;
  status: "fresh" | "stale" | "missing" | "error";
  age_seconds: number | null;
  ttl_seconds: number | null;
  log: RobotsLogEntry[];
}

const DEFAULT_HOST = "www.realtrust.ro";

function formatDuration(sec: number | null): string {
  if (sec === null) return "—";
  const abs = Math.abs(sec);
  if (abs < 60) return `${sec}s`;
  if (abs < 3600) return `${Math.round(sec / 60)}min`;
  if (abs < 86400) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}

function eventBadge(type: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; cls?: string }> = {
    fetch_success: { label: "Fetch OK", variant: "default", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
    fetch_error: { label: "Fetch Error", variant: "destructive" },
    cache_hit: { label: "Cache hit", variant: "secondary" },
    cache_expired: { label: "Expirat", variant: "outline", cls: "border-amber-400 text-amber-700" },
    manual_invalidation: { label: "Invalidat manual", variant: "outline", cls: "border-orange-400 text-orange-700" },
    manual_refresh: { label: "Refresh manual", variant: "outline", cls: "border-blue-400 text-blue-700" },
    content_changed: { label: "Conținut schimbat", variant: "default", cls: "bg-purple-500/15 text-purple-700 border-purple-300" },
  };
  const cfg = map[type] || { label: type, variant: "outline" as const };
  return <Badge variant={cfg.variant} className={cfg.cls}>{cfg.label}</Badge>;
}

export function RobotsCacheStatus({ defaultHost = DEFAULT_HOST }: { defaultHost?: string }) {
  const [host, setHost] = useState(defaultHost);
  const [data, setData] = useState<RobotsStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async (h = host) => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "get_robots_status", host: h },
      });
      if (error) throw error;
      setData(res as RobotsStatusResponse);
    } catch (e) {
      toast.error("Nu am putut încărca statusul cache-ului", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(defaultHost);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultHost]);

  const refresh = async () => {
    setActing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "refresh_robots_cache", host, reason: "Manual refresh din UI" },
      });
      if (error) throw error;
      const r = res as { content_changed?: boolean; fetch_error?: string | null };
      if (r.fetch_error) {
        toast.error("Refresh eșuat", { description: r.fetch_error });
      } else if (r.content_changed) {
        toast.success("Refresh complet — conținutul s-a schimbat!");
      } else {
        toast.success("Refresh complet — fără modificări");
      }
      await load(host);
    } catch (e) {
      toast.error("Refresh eșuat", { description: (e as Error).message });
    } finally {
      setActing(false);
    }
  };

  const invalidate = async () => {
    setActing(true);
    try {
      const { error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "invalidate_robots_cache", host, reason: "Invalidare manuală din UI" },
      });
      if (error) throw error;
      toast.success("Cache invalidat — următorul check va face refresh");
      await load(host);
    } catch (e) {
      toast.error("Invalidare eșuată", { description: (e as Error).message });
    } finally {
      setActing(false);
    }
  };

  const status = data?.status;
  const statusUI = (() => {
    switch (status) {
      case "fresh":
        return { icon: <CheckCircle2 className="w-4 h-4" />, label: "Fresh", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-300" };
      case "stale":
        return { icon: <Clock className="w-4 h-4" />, label: "Expirat", cls: "bg-amber-500/15 text-amber-700 border-amber-300" };
      case "error":
        return { icon: <AlertTriangle className="w-4 h-4" />, label: "Eroare fetch", cls: "bg-red-500/15 text-red-700 border-red-300" };
      case "missing":
      default:
        return { icon: <FileText className="w-4 h-4" />, label: "Fără cache", cls: "bg-muted text-muted-foreground border-border" };
    }
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4" />
              Robots.txt Cache
              <Badge variant="outline" className={statusUI.cls}>
                <span className="inline-flex items-center gap-1">
                  {statusUI.icon}
                  {statusUI.label}
                </span>
              </Badge>
            </CardTitle>
            <CardDescription>
              Cache 24h pentru robots.txt — invalidare manuală + log de evenimente pentru a evita conflictele din date învechite.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => load()} disabled={loading || acting}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Reîncarcă status
            </Button>
            <Button size="sm" variant="default" onClick={refresh} disabled={acting}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${acting ? "animate-spin" : ""}`} />
              Force Refresh
            </Button>
            <Button size="sm" variant="destructive" onClick={invalidate} disabled={acting}>
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Invalidează
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2 max-w-md">
          <div className="flex-1">
            <Label htmlFor="robots-host" className="text-xs">Host</Label>
            <Input
              id="robots-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="www.realtrust.ro"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={() => load(host)} disabled={loading}>
            Verifică
          </Button>
        </div>

        {data?.cache ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Fetched</div>
              <div className="font-medium">{new Date(data.cache.fetched_at).toLocaleString("ro-RO")}</div>
              <div className="text-muted-foreground">acum {formatDuration(data.age_seconds)}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Expiră</div>
              <div className="font-medium">{new Date(data.cache.expires_at).toLocaleString("ro-RO")}</div>
              <div className={`${(data.ttl_seconds ?? 0) <= 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                {(data.ttl_seconds ?? 0) <= 0 ? "Expirat" : `în ${formatDuration(data.ttl_seconds)}`}
              </div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">HTTP</div>
              <div className="font-medium">
                {data.cache.http_status ?? "—"}
                {data.cache.fetch_error && (
                  <span className="text-red-600 ml-1">{data.cache.fetch_error}</span>
                )}
              </div>
              <div className="text-muted-foreground">{data.cache.raw_size}b</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Reguli / Sitemaps</div>
              <div className="font-medium">{data.cache.rules_count} / {data.cache.sitemaps_count}</div>
              <div className="text-muted-foreground">
                fetches: {data.cache.fetch_count} · invalidări: {data.cache.invalidation_count}
              </div>
            </div>
            <div className="rounded-md border p-2 col-span-2 md:col-span-2">
              <div className="text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> Content hash</div>
              <div className="font-mono text-[11px] break-all">
                {data.cache.content_hash ? data.cache.content_hash.slice(0, 32) + "…" : "—"}
              </div>
            </div>
            <div className="rounded-md border p-2 col-span-2">
              <div className="text-muted-foreground">Ultima schimbare detectată</div>
              <div className="font-medium">
                {data.cache.last_change_detected_at
                  ? new Date(data.cache.last_change_detected_at).toLocaleString("ro-RO")
                  : "Niciodată"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Niciun cache pentru <code>{host}</code>. Apasă <strong>Force Refresh</strong> pentru a-l popula.
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <History className="w-4 h-4" />
            Log evenimente recente
          </div>
          <ScrollArea className="h-56 rounded-md border">
            <div className="divide-y">
              {(data?.log || []).length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">Niciun eveniment înregistrat.</div>
              )}
              {(data?.log || []).map((e) => (
                <div key={e.id} className="p-2 text-xs flex items-start gap-2">
                  <div className="shrink-0">{eventBadge(e.event_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                      <span>{new Date(e.created_at).toLocaleString("ro-RO")}</span>
                      {e.http_status && <span>HTTP {e.http_status}</span>}
                      {e.rules_count !== null && <span>· {e.rules_count} reguli</span>}
                      {e.sitemaps_count !== null && <span>· {e.sitemaps_count} sitemaps</span>}
                      {e.raw_size !== null && <span>· {e.raw_size}b</span>}
                    </div>
                    {e.trigger_reason && <div className="truncate">{e.trigger_reason}</div>}
                    {e.fetch_error && <div className="text-red-600 truncate">{e.fetch_error}</div>}
                    {e.event_type === "content_changed" && e.previous_content_hash && e.content_hash && (
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        {e.previous_content_hash.slice(0, 10)} → {e.content_hash.slice(0, 10)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

export default RobotsCacheStatus;
