import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Phone, Activity, Shield, Loader2 } from "lucide-react";
import { StatCard } from "./StatCard";

type QueueStatus = {
  callable_now: number;
  in_dedupe_7d: number;
  structurally_eligible: number;
  autopilot_on: boolean;
  weekend_standby: boolean;
  min_score: number;
  next_eligible_at: string | null;
  loading: boolean;
};

export function VoiceQueueStatusCard() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    callable_now: 0, in_dedupe_7d: 0, structurally_eligible: 0,
    autopilot_on: false, weekend_standby: false, min_score: 50,
    next_eligible_at: null, loading: true,
  });
  const [togglingStandby, setTogglingStandby] = useState(false);

  const loadQueueStatus = async () => {
    try {
      const nowIso = new Date().toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const [vs, prospectsRes, recentRes] = await Promise.all([
        supabase.from("voice_agent_settings").select("autopilot_enabled, min_lead_score, weekend_standby_enabled").eq("id", 1).maybeSingle(),
        supabase.from("prospect_listings")
          .select("phone_normalized")
          .gte("lead_score", 50)
          .in("lifecycle_status", ["new", "callback"])
          .not("phone_normalized", "is", null)
          .is("auto_call_triggered_at", null)
          .is("marked_invalid_at", null)
          .eq("do_not_call", false)
          .or(`next_callback_at.is.null,next_callback_at.lte.${nowIso}`),
        supabase.from("voice_call_sessions")
          .select("to_number, created_at")
          .gte("created_at", sevenDaysAgo)
          .eq("direction", "outbound"),
      ]);
      const minScore = Number((vs.data as any)?.min_lead_score ?? 50);
      const eligiblePhones = new Set<string>((prospectsRes.data ?? []).map((p: any) => p.phone_normalized).filter(Boolean));
      const recent = (recentRes.data ?? []) as Array<{ to_number: string | null; created_at: string }>;
      const recentPhoneFirstCall = new Map<string, string>();
      for (const r of recent) {
        if (!r.to_number) continue;
        const cur = recentPhoneFirstCall.get(r.to_number);
        if (!cur || r.created_at < cur) recentPhoneFirstCall.set(r.to_number, r.created_at);
      }
      let inDedupe = 0;
      let earliestRelease: number | null = null;
      for (const phone of eligiblePhones) {
        const firstCall = recentPhoneFirstCall.get(phone);
        if (firstCall) {
          inDedupe++;
          const release = new Date(firstCall).getTime() + 7 * 86400 * 1000;
          if (earliestRelease === null || release < earliestRelease) earliestRelease = release;
        }
      }
      setQueueStatus({
        callable_now: eligiblePhones.size - inDedupe,
        in_dedupe_7d: inDedupe,
        structurally_eligible: eligiblePhones.size,
        autopilot_on: !!(vs.data as any)?.autopilot_enabled,
        weekend_standby: !!(vs.data as any)?.weekend_standby_enabled,
        min_score: minScore,
        next_eligible_at: earliestRelease ? new Date(earliestRelease).toISOString() : null,
        loading: false,
      });
    } catch {
      setQueueStatus((q) => ({ ...q, loading: false }));
    }
  };

  const toggleWeekendStandby = async (next: boolean) => {
    setTogglingStandby(true);
    const prev = queueStatus.weekend_standby;
    setQueueStatus((q) => ({ ...q, weekend_standby: next }));
    const { error } = await supabase
      .from("voice_agent_settings")
      .update({ weekend_standby_enabled: next })
      .eq("id", 1);
    setTogglingStandby(false);
    if (error) {
      setQueueStatus((q) => ({ ...q, weekend_standby: prev }));
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: next ? "Mod standby weekend ACTIVAT" : "Mod standby weekend DEZACTIVAT",
        description: next
          ? "Andrei nu va mai apela sâmbătă/duminică (Europe/Bucharest). Apelurile manuale rămân posibile."
          : "Autopilot rulează inclusiv în weekend, în fereastra orară configurată.",
      });
    }
  };

  useEffect(() => {
    loadQueueStatus();
    const t = setInterval(loadQueueStatus, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Card className={queueStatus.callable_now > 0 ? "border-primary/40" : "border-muted"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4" /> Coadă Voice Agent (Andrei)
              {queueStatus.loading ? (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              ) : queueStatus.callable_now > 0 ? (
                <Badge variant="default">Activ</Badge>
              ) : (
                <Badge variant="secondary">Standby</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Snapshot live: lead-uri eligibile structural vs. filtrate prin dedupe anti-spam (7 zile).
              Autopilot {queueStatus.autopilot_on ? "ACTIV" : "OPRIT"} · prag scor ≥ {queueStatus.min_score} · fereastră 10–18 Europe/Bucharest.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadQueueStatus} disabled={queueStatus.loading} className="shrink-0" aria-label="Refresh coadă voice agent">
            {queueStatus.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Apelabile acum" value={queueStatus.callable_now} highlight={queueStatus.callable_now > 0} />
          <StatCard label="În dedupe (7z)" value={queueStatus.in_dedupe_7d} icon={<Shield className="w-3 h-3" />} />
          <StatCard label="Eligibile structural" value={queueStatus.structurally_eligible} />
          <StatCard
            label="Următorul eligibil"
            value={queueStatus.next_eligible_at
              ? new Date(queueStatus.next_eligible_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })
              : "—"}
          />
        </div>
        {queueStatus.callable_now === 0 && queueStatus.in_dedupe_7d > 0 && !queueStatus.loading && (
          <Alert className="mt-3">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Standby controlat — filtrele anti-spam își fac treaba</AlertTitle>
            <AlertDescription className="text-xs">
              Toate cele {queueStatus.in_dedupe_7d} lead-uri eligibile au fost deja contactate în ultimele 7 zile și sunt în carantină anti-spam.
              Coada se va re-popula automat la următorul scrape (luni dimineață) sau la expirarea ferestrei de dedupe
              {queueStatus.next_eligible_at ? ` (${new Date(queueStatus.next_eligible_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "long" })})` : ""}.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
          <div className="flex-1 min-w-0">
            <Label htmlFor="weekend-standby-switch" className="text-sm font-medium cursor-pointer">
              Mod standby weekend
              {queueStatus.weekend_standby && (
                <Badge variant="secondary" className="ml-2 text-[10px]">ACTIV</Badge>
              )}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Când e activ, Andrei nu apelează sâmbătă și duminică (Europe/Bucharest). Apelurile manuale rămân disponibile.
            </p>
          </div>
          <Switch
            id="weekend-standby-switch"
            checked={queueStatus.weekend_standby}
            onCheckedChange={toggleWeekendStandby}
            disabled={togglingStandby || queueStatus.loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
