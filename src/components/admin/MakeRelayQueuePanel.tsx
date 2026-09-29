import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—";

const statusLabel: Record<string, { t: string; v: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { t: "În așteptare", v: "secondary" },
  delivered: { t: "Trimis", v: "default" },
  failed: { t: "Eșuat", v: "destructive" },
};

export default function MakeRelayQueuePanel() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["make-relay-queue"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("make_relay_dlq")
        .select("id, event, status, attempts, last_status, last_error, created_at, delivered_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (rows ?? []) as any[];
    },
  });
  useRealtimeChannel("make-relay-queue", [{ event: "*", table: "make_relay_dlq", handler: () => void refetch() }]);

  const rows = data ?? [];
  const c: Record<string, number> = { pending: 0, delivered: 0, failed: 0 };
  rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
  const pct = rows.length ? Math.round((c.delivered / rows.length) * 100) : 0;

  const sendAll = async () => {
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke("make-relay-drain", { body: {} });
    setBusy(false);
    if (error) {
      toast({ title: "Trimiterea nu a pornit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Trimitere finalizată", description: `Trimise: ${res.delivered} · eșuate: ${res.failed} · rămase: ${res.remaining}` });
    void refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Coadă Make.com</CardTitle>
          <CardDescription>Mesajele care nu au ajuns la Make.com. Se reîncearcă automat la 15 minute; poți trimite toate imediat.</CardDescription>
        </div>
        <Button onClick={sendAll} disabled={busy || c.pending + c.failed === 0} className="min-h-12">
          {busy ? "Se trimite…" : "Trimite toate acum"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {([["În așteptare", c.pending], ["Trimise", c.delivered], ["Eșuate", c.failed]] as const).map(([l, v]) => (
            <div key={l} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-2xl font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Progres trimiteri: {pct}%</div>
          <Progress value={pct} />
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Se încarcă…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Coada e goală.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2 pr-3">Eveniment</th><th className="pr-3">Stare</th><th className="pr-3">Încercări</th><th className="pr-3">Ultima eroare</th><th className="pr-3">Creat</th><th>Trimis</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = statusLabel[r.status] ?? { t: r.status, v: "outline" as const };
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-3">{r.event}</td>
                      <td className="pr-3"><Badge variant={s.v}>{s.t}</Badge></td>
                      <td className="pr-3 tabular-nums">{r.attempts}</td>
                      <td className="pr-3 max-w-xs truncate" title={r.last_error ?? ""}>{r.last_status ? `HTTP ${r.last_status} · ` : ""}{r.last_error ?? "—"}</td>
                      <td className="pr-3">{fmt(r.created_at)}</td>
                      <td>{fmt(r.delivered_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
