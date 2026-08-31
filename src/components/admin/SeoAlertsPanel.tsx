import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BellRing, CheckCircle2, Eye, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import SeoAlertSettingsCard from "@/components/admin/SeoAlertSettingsCard";
import SitemapStatusBadge from "@/components/admin/SitemapStatusBadge";
import { buildRemediationPlan, extractAlertUrls } from "@/lib/seoAlertRemediation";

interface SeoAlert {
  id: string;
  alert_type: string;
  alert_key: string;
  title: string;
  severity: string;
  details: Record<string, unknown> | null;
  notified_at: string | null;
  webhook_sent_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const SeoAlertsPanel = () => {
  const qc = useQueryClient();
  const [minHits, setMinHits] = useState(5);
  const [detail, setDetail] = useState<SeoAlert | null>(null);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["seo-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_alerts")
        .select("id, alert_type, alert_key, title, severity, details, notified_at, webhook_sent_at, resolved_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SeoAlert[];
    },
  });

  const runScan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-alert-monitor", {
        body: { min_hits: minHits },
      });
      if (error) throw error;
      return data as { created: number; checked: number; emailed: boolean; webhooked?: boolean };
    },
    onSuccess: (d) => {
      toast.success(
        `Verificare completă — ${d?.created ?? 0} alerte noi din ${d?.checked ?? 0} verificate` +
          (d?.webhooked ? " · webhook trimis" : ""),
      );
      qc.invalidateQueries({ queryKey: ["seo-alerts"] });
    },
    onError: (e: Error) => toast.error(`Verificarea a eșuat: ${e.message}`),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seo_alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alertă marcată ca rezolvată");
      qc.invalidateQueries({ queryKey: ["seo-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alertă ștearsă");
      qc.invalidateQueries({ queryKey: ["seo-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("purge-sitemap-cache", { body: {} });
      if (error) throw error;
      return data as { ok: boolean; warmed?: Record<string, number> };
    },
    onSuccess: (d) =>
      d?.ok
        ? toast.success("Cache sitemap curățat și reîncălzit")
        : toast.warning("Purge finalizat cu avertismente"),
    onError: (e: Error) => toast.error(`Purge eșuat: ${e.message}`),
  });

  const reindex = useMutation({
    mutationFn: async (urls: string[]) => {
      const { data, error } = await supabase.functions.invoke("reindex-dynamic-urls", {
        body: { urls, triggered_by: "seo-alert-panel", submit_google: true },
      });
      if (error) throw error;
      return data as { submitted?: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["sitemap-status"] });
      toast.success(`Reindexare trimisă pentru ${d?.submitted ?? 0} URL-uri`);
    },
    onError: (e: Error) => toast.error(`Reindexarea a eșuat: ${e.message}`),
  });

  const { data: coverage } = useQuery({
    queryKey: ["seo-indexing-coverage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_indexing_snapshots")
        .select("checked_pages, issues_count, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const checked = Number(data.checked_pages ?? 0);
      const notIndexed = Number(data.issues_count ?? 0);
      return {
        checked,
        notIndexed,
        indexed: Math.max(checked - notIndexed, 0),
        at: data.created_at as string,
      };
    },
  });

  const open = (alerts ?? []).filter((a) => !a.resolved_at);
  const detailUrls = extractAlertUrls(detail);
  const plan = detail ? buildRemediationPlan(detail) : null;

  return (
    <div className="space-y-6">
      <SitemapStatusBadge />
      <SeoAlertSettingsCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Alerte SEO automate
            <Badge variant={open.length > 0 ? "destructive" : "outline"} className="ml-2">
              {open.length} active
            </Badge>
          </CardTitle>
          <CardDescription>
            Detectează automat erorile de indexare Google și URL-urile 404 accesate frecvent. Rulează zilnic
            și trimite e-mail administratorului la alerte noi.
          </CardDescription>
          {coverage && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                {coverage.indexed} pagini indexate
              </Badge>
              <Badge variant={coverage.notIndexed > 0 ? "destructive" : "outline"} className="gap-1">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                {coverage.notIndexed} neindexate
              </Badge>
              <span className="text-xs text-muted-foreground">
                din {coverage.checked} verificate · {new Date(coverage.at).toLocaleString("ro-RO")}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="seo-alert-min-hits" className="text-xs text-muted-foreground">
                Prag 404 (accesări / 24h)
              </label>
              <Input
                id="seo-alert-min-hits"
                type="number"
                min={2}
                max={1000}
                value={minHits}
                onChange={(e) => setMinHits(Number(e.target.value))}
                className="w-32"
                aria-label="Prag minim de accesări 404 pentru alertă"
              />
            </div>
            <Button
              onClick={() => runScan.mutate()}
              disabled={runScan.isPending}
              className="gap-2"
              aria-label="Rulează verificarea alertelor SEO acum"
            >
              {runScan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Verifică acum
            </Button>
            <Button
              variant="outline"
              onClick={() => purge.mutate()}
              disabled={purge.isPending}
              className="gap-2"
              aria-label="Curăță cache-ul sitemap"
            >
              {purge.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Purge Sitemap Cache
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (alerts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Nicio alertă SEO înregistrată. Totul arată bine.
            </p>
          ) : (
            <ul className="space-y-2">
              {(alerts ?? []).map((a) => (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                    a.resolved_at ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${a.severity === "error" ? "text-destructive" : "text-amber-500"}`}
                      />
                      <span className="font-medium break-all">{a.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.alert_type === "indexing" ? "Indexare" : "404"} ·{" "}
                      {new Date(a.created_at).toLocaleString("ro-RO")} ·{" "}
                      {a.notified_at ? "e-mail trimis" : "fără e-mail"} ·{" "}
                      {a.webhook_sent_at ? "webhook trimis" : "fără webhook"}
                      {a.resolved_at ? " · rezolvată" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetail(a)}
                      className="gap-1"
                      aria-label={`Vezi detaliile alertei ${a.title}`}
                    >
                      <Eye className="w-4 h-4" />
                      Detalii
                    </Button>
                    {!a.resolved_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolve.mutate(a.id)}
                        aria-label={`Marchează rezolvată alerta ${a.title}`}
                      >
                        Rezolvată
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(a.id)}
                      aria-label={`Șterge alerta ${a.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-all">{detail?.title}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.alert_type === "indexing" ? "Eroare de indexare" : "URL 404"} · severitate ${
                    detail.severity
                  } · ${new Date(detail.created_at).toLocaleString("ro-RO")}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Cheie alertă</span>
                  <p className="break-all font-mono text-xs">{detail.alert_key}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Notificări</span>
                  <p>
                    E-mail: {detail.notified_at ? new Date(detail.notified_at).toLocaleString("ro-RO") : "—"}
                    <br />
                    Webhook:{" "}
                    {detail.webhook_sent_at
                      ? new Date(detail.webhook_sent_at).toLocaleString("ro-RO")
                      : "—"}
                  </p>
                </div>
              </div>

              {plan && (
                <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div>
                    <p className="font-medium">Diagnostic</p>
                    <p className="text-muted-foreground">{plan.summary}</p>
                  </div>
                  <div>
                    <p className="font-medium">Cauză probabilă</p>
                    <p className="text-muted-foreground">{plan.cause}</p>
                  </div>
                  <div>
                    <p className="font-medium">Pași de remediere</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                      {plan.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.impact}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">URL-uri afectate ({detailUrls.length})</span>
                {detailUrls.length > 0 ? (
                  <>
                    <ul className="mt-1 max-h-40 overflow-auto rounded-lg border p-2 font-mono text-xs">
                      {detailUrls.map((u) => (
                        <li key={u} className="break-all">
                          {u}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      className="mt-2 gap-2"
                      onClick={() => reindex.mutate(detailUrls)}
                      disabled={reindex.isPending}
                      aria-label="Trimite URL-urile afectate la reindexare"
                    >
                      {reindex.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Reindexează URL-urile
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nu s-au putut extrage URL-uri din această alertă.
                  </p>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Detalii tehnice</span>
                <pre className="mt-1 max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(detail.details ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeoAlertsPanel;
