import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, PlayCircle, RotateCcw } from "lucide-react";

type EventRow = {
  id: string;
  event: string;
  direction: string;
  status: string;
  error: string | null;
  phone_normalized: string | null;
  message?: string | null;
  created_at: string;
};

type Tally = { total: number; delivered: number; failed: number; not_configured: number };

type StatusPayload = {
  configured: boolean;
  last_event: EventRow | null;
  last_success: EventRow | null;
  last_failure: EventRow | null;
  last_24h: Tally;
  last_7d: Tally;
  recent: EventRow[];
};

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const statusBadge = (s: string) => {
  if (s === "sent") return { label: "Livrat către agent", variant: "default" as const };
  if (s === "sent_template") return { label: "Trimis ca șablon", variant: "secondary" as const };
  if (s === "sent_whatsapp_backup") return { label: "Trimis pe WhatsApp (backup)", variant: "secondary" as const };
  if (s === "make_not_configured") return { label: "Make neconfigurat", variant: "outline" as const };
  if (s === "failed") return { label: "Eșuat", variant: "destructive" as const };
  return { label: s, variant: "outline" as const };
};

const eventLabel = (e: string) => {
  const map: Record<string, string> = {
    wa_outbound_sent: "Mesaj trimis clientului",
    wa_outbound_failed: "Mesaj eșuat la Meta",
    wa_inbound_message: "Mesaj primit de la client",
    wa_inbound_lead: "Lead trimis agentului",
    agent_reply: "Răspuns agent → client",
    agent_lead_manual: "Lead trimis manual",
    make_status_ping: "Test conexiune (Re-run)",
  };
  return map[e] ?? e;
};

export default function MakeScenarioStatus() {
  const { toast } = useToast();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"ping" | "retry" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error: err } = await supabase.functions.invoke("make-status", {
      body: { action: "status" },
    });
    if (err) setError(err.message);
    else {
      setError(null);
      setData(res as StatusPayload);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (action: "ping" | "retry_failed") => {
    setBusy(action === "ping" ? "ping" : "retry");
    const { data: res, error: err } = await supabase.functions.invoke("make-status", {
      body: { action },
    });
    setBusy(null);
    if (err) {
      toast({ title: "Nu a funcționat", description: err.message, variant: "destructive" });
      return;
    }
    const r = res as Record<string, unknown>;
    if (action === "ping") {
      toast({
        title: r.ok ? "Make a răspuns" : "Make nu a răspuns",
        description: r.ok
          ? "Scenariul a primit evenimentul de test."
          : "Verifică dacă scenariul este pornit în Make.",
        variant: r.ok ? "default" : "destructive",
      });
    } else {
      toast({
        title: "Retrimitere finalizată",
        description: `Retrimise: ${r.resent ?? 0} · încă eșuate: ${r.still_failing ?? 0}`,
      });
    }
    await load();
  };

  const t24 = data?.last_24h;

  return (
    <AdminPageShell
      title="Starea scenariului Make"
      description="Când a rulat ultima dată Make, câte mesaje au ajuns la agent și câte au eșuat."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Reîmprospătează</span>
          </Button>
          <Button size="sm" onClick={() => void runAction("ping")} disabled={busy !== null}>
            {busy === "ping" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            <span className="ml-2">Re-run (test scenariu)</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void runAction("retry_failed")} disabled={busy !== null}>
            {busy === "retry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            <span className="ml-2">Retrimite eșuatele (24h)</span>
          </Button>
        </div>
      }
    >
      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ultima rulare</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{fmt(data?.last_event?.created_at)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.last_event ? eventLabel(data.last_event.event) : "Nicio activitate încă"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Livrate (24h)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{t24?.delivered ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">din {t24?.total ?? 0} evenimente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Eșuate (24h)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{t24?.failed ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ultimul eșec: {fmt(data?.last_failure?.created_at)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conexiune Make</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={data?.configured ? "default" : "destructive"}>
              {data?.configured ? "Configurată" : "Lipsește adresa"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Ultima reușită: {fmt(data?.last_success?.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ultimele evenimente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && !data && (
            <p className="text-sm text-muted-foreground">Se încarcă…</p>
          )}
          {data?.recent?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nicio activitate înregistrată încă.
            </p>
          )}
          {data?.recent?.map((ev) => {
            const b = statusBadge(ev.status);
            return (
              <div key={ev.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{eventLabel(ev.event)}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.phone_normalized ?? "—"} · {fmt(ev.created_at)}
                  </p>
                  {ev.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.message}</p>
                  )}
                  {ev.error && (
                    <p className="text-xs text-destructive mt-1">{ev.error}</p>
                  )}
                </div>
                <Badge variant={b.variant}>{b.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
