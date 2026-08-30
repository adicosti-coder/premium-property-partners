import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BellRing, CheckCircle2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SeoAlert {
  id: string;
  alert_type: string;
  alert_key: string;
  title: string;
  severity: string;
  details: Record<string, unknown> | null;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const SeoAlertsPanel = () => {
  const qc = useQueryClient();
  const [minHits, setMinHits] = useState(5);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["seo-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_alerts")
        .select("id, alert_type, alert_key, title, severity, details, notified_at, resolved_at, created_at")
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
      return data as { created: number; checked: number; emailed: boolean };
    },
    onSuccess: (d) => {
      toast.success(`Verificare completă — ${d?.created ?? 0} alerte noi din ${d?.checked ?? 0} verificate`);
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

  const open = (alerts ?? []).filter((a) => !a.resolved_at);

  return (
    <div className="space-y-6">
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
                      {a.notified_at ? "e-mail trimis" : "fără e-mail"}
                      {a.resolved_at ? " · rezolvată" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
    </div>
  );
};

export default SeoAlertsPanel;
