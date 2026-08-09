import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, BellRing, Check, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react";

type Alert = {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  source_platform: string | null;
  rejection_reason: string | null;
  title: string;
  message: string;
  metric: Record<string, unknown>;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
};

const SEV_STYLES: Record<Alert["severity"], { bg: string; border: string; text: string; icon: any }> = {
  info:     { bg: "bg-blue-500/10",   border: "border-blue-500/40",   text: "text-blue-700 dark:text-blue-300",     icon: BellRing },
  warning:  { bg: "bg-amber-500/10",  border: "border-amber-500/40",  text: "text-amber-700 dark:text-amber-300",   icon: AlertTriangle },
  critical: { bg: "bg-rose-500/15",   border: "border-rose-500/50",   text: "text-rose-700 dark:text-rose-300",     icon: ShieldAlert },
};

export default function ProspectRejectionAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_rejection_alerts")
      .select("*")
      .eq("status", "open")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast({ title: "Eroare alerte", description: error.message, variant: "destructive" });
    } else {
      setAlerts((data || []) as Alert[]);
    }
    setLoading(false);
  }, []);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-rejection-anomaly-detect", {
        body: { days: 7 },
      });
      if (error) throw error;
      const d = data as any;
      toast({
        title: "Scanare finalizată",
        description: `Detectate ${d?.detected ?? 0}, noi ${d?.inserted ?? 0}, deja deschise ${d?.skipped_duplicates ?? 0}.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare scanare", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [load]);

  const updateStatus = useCallback(async (id: string, status: "acknowledged" | "resolved") => {
    setActingOn(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("prospect_rejection_alerts")
      .update({ status, acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setAlerts((s) => s.filter((a) => a.id !== id));
    }
    setActingOn(null);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: ascultă noi alerte
  useEffect(() => {
    const channel = supabase
      .channel("prospect_rejection_alerts_changes")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "prospect_rejection_alerts" },
        (payload) => {
          const newAlert = payload.new as Alert;
          if (newAlert.status === "open") {
            setAlerts((s) => [newAlert, ...s]);
            toast({
              title: `🚨 Alertă nouă (${newAlert.severity})`,
              description: newAlert.title,
              variant: newAlert.severity === "critical" ? "destructive" : "default",
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  return (
    <Card className={alerts.length > 0 ? "border-2 border-rose-500/30" : "border-2 border-emerald-500/20"}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${alerts.length > 0 ? "text-rose-500" : "text-emerald-500"}`} />
            Alerte automate respingeri
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">{alerts.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Scaner deterministic: dominanță sursă, spike-uri în trend și volum total. Realtime activ.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Reîncarcă alerte">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="default" onClick={scan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-1" />}
            Scanează acum
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {counts.critical > 0 && <Badge className="bg-rose-500 text-white">🚨 {counts.critical} critical</Badge>}
            {counts.warning > 0 && <Badge className="bg-amber-500 text-white">⚠️ {counts.warning} warning</Badge>}
            {counts.info > 0 && <Badge className="bg-blue-500 text-white">ℹ️ {counts.info} info</Badge>}
          </div>
        )}

        {loading && alerts.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Se încarcă alertele...
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
            ✅ Nicio anomalie deschisă. Pipeline-ul rulează în parametri normali.
          </div>
        )}

        <div className="space-y-2">
          {alerts.map((a) => {
            const sev = SEV_STYLES[a.severity];
            const Icon = sev.icon;
            return (
              <div
                key={a.id}
                className={`border ${sev.border} ${sev.bg} rounded-lg p-3`}
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${sev.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${sev.text}`}>{a.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{a.category}</Badge>
                      {a.source_platform && (
                        <Badge variant="secondary" className="text-[10px] font-mono">{a.source_platform}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(a.created_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => updateStatus(a.id, "acknowledged")}
                      disabled={actingOn === a.id}
                      aria-label="Marchează ca văzută"
                    >
                      <Check className="w-3 h-3 mr-1" /> Văzut
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => updateStatus(a.id, "resolved")}
                      disabled={actingOn === a.id}
                      aria-label="Marchează ca rezolvată"
                    >
                      <X className="w-3 h-3 mr-1" /> Rezolvat
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
