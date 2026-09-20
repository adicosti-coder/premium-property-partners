import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";

type Incident = {
  id: string;
  kind: string;
  target: string;
  severity: string;
  status: string;
  remediation: string | null;
  occurrences: number;
  opened_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

type PlatformHealth = {
  platform: string;
  consecutive_blocked: number;
  auto_disabled: boolean;
  cooldown_until: string | null;
  last_ok_at: string | null;
  last_reason: string | null;
};

const KIND_LABEL: Record<string, string> = {
  stuck_job: "Scanare blocată",
  platform_blocked: "Portal blocat",
  keyword_zero: "Cuvânt-cheie fără rezultate",
  job_disabled: "Automatizare oprită",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";

export function ScraperHealthPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: incidents } = useQuery({
    queryKey: ["scraper-health-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_health_incidents")
        .select("id, kind, target, severity, status, remediation, occurrences, opened_at, last_seen_at, resolved_at")
        .order("last_seen_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
    refetchInterval: 60_000,
  });

  const { data: health } = useQuery({
    queryKey: ["scraper-platform-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_platform_health")
        .select("platform, consecutive_blocked, auto_disabled, cooldown_until, last_ok_at, last_reason")
        .order("platform");
      if (error) throw error;
      return (data ?? []) as PlatformHealth[];
    },
    refetchInterval: 60_000,
  });

  const open = (incidents ?? []).filter((i) => i.status === "open");
  const resolved = (incidents ?? []).filter((i) => i.status !== "open").slice(0, 10);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-health-monitor", { body: {} });
      if (error) throw error;
      const count = (data as { actions_count?: number } | null)?.actions_count ?? 0;
      toast({
        title: count > 0 ? `${count} remedieri aplicate` : "Nicio problemă detectată",
        description: count > 0 ? "Vezi lista de mai jos pentru detalii." : "Scanările funcționează normal.",
      });
      await qc.invalidateQueries({ queryKey: ["scraper-health-incidents"] });
      await qc.invalidateQueries({ queryKey: ["scraper-platform-health"] });
    } catch (e) {
      toast({
        title: "Verificarea nu a putut rula",
        description: (e as Error)?.message ?? "Încearcă din nou în câteva momente.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" /> Sănătatea scraperului
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Verificare automată la 15 minute: scanări blocate, portaluri care nu mai răspund și cuvinte
            cheie fără rezultate. Remedierile se aplică singure.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runNow} disabled={running} className="min-h-[44px]">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${running ? "animate-spin" : ""}`} />
          Verifică acum
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(health ?? []).map((h) => (
            <div key={h.platform} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{h.platform}</span>
                {h.auto_disabled ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> pauză
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> activ
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ultimele anunțuri: {fmt(h.last_ok_at)}
              </p>
              {h.auto_disabled && (
                <p className="text-xs text-muted-foreground">Revine automat: {fmt(h.cooldown_until)}</p>
              )}
            </div>
          ))}
          {(health ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Încă nu există date. Apasă „Verifică acum”.
            </p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Probleme active ({open.length})</h4>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Niciun blocaj activ.
            </p>
          ) : (
            <ul className="space-y-2">
              {open.map((i) => (
                <li key={i.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={i.severity === "critical" ? "destructive" : "secondary"}>
                      {KIND_LABEL[i.kind] ?? i.kind}
                    </Badge>
                    <span className="text-sm font-medium break-all">{i.target}</span>
                    {i.occurrences > 1 && (
                      <span className="text-xs text-muted-foreground">×{i.occurrences}</span>
                    )}
                  </div>
                  {i.remediation && <p className="text-xs mt-1">{i.remediation}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Ultima apariție: {fmt(i.last_seen_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {resolved.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Remediate recent</h4>
            <ul className="space-y-1.5">
              {resolved.map((i) => (
                <li key={i.id} className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium text-foreground">{KIND_LABEL[i.kind] ?? i.kind}</span>
                  <span className="break-all">{i.target}</span>
                  <span>· {fmt(i.resolved_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScraperHealthPanel;
