import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Send, Inbox } from "lucide-react";

type EventRow = {
  id: string;
  direction: string;
  event: string;
  lead_id: string | null;
  phone_normalized: string | null;
  message: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  whatsapp_number: string | null;
  message: string | null;
  source: string | null;
  created_at: string;
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const statusLabel = (s: string) => {
  if (s === "sent") return { label: "Trimis către agent", variant: "default" as const };
  if (s === "sent_whatsapp_backup") return { label: "Trimis pe WhatsApp (backup)", variant: "secondary" as const };
  if (s === "make_not_configured") return { label: "Make neconfigurat", variant: "outline" as const };
  if (s === "failed") return { label: "Eșuat", variant: "destructive" as const };
  return { label: s, variant: "outline" as const };
};

export default function MakeLeadsPanel() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, ld] = await Promise.all([
      supabase
        .from("make_lead_events")
        .select("id, direction, event, lead_id, phone_normalized, message, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("leads")
        .select("id, name, whatsapp_number, message, source, created_at")
        .eq("source", "whatsapp_reply")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (ev.error || ld.error) setError(ev.error?.message ?? ld.error?.message ?? null);
    else setError(null);
    setEvents((ev.data ?? []) as EventRow[]);
    setLeads((ld.data ?? []) as LeadRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useRealtimeChannel("make-leads-panel", [
    { event: "*", table: "make_lead_events", handler: () => { void load(); } },
  ]);

  const sendToAgent = async (leadId: string) => {
    setSendingId(leadId);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: { action: "relay_lead", lead_id: leadId },
    });
    setSendingId(null);
    if (fnErr) {
      toast({ title: "Nu am putut trimite lead-ul", description: fnErr.message, variant: "destructive" });
    } else {
      const ok = (data as { ok?: boolean } | null)?.ok;
      toast({
        title: ok ? "Lead trimis către agent" : "Trimiterea nu a reușit",
        description: ok
          ? "Automatizarea a primit lead-ul. Vezi rândul nou în jurnal."
          : "Verifică jurnalul de mai jos pentru motiv.",
        variant: ok ? "default" : "destructive",
      });
    }
    void load();
  };

  return (
    <AdminPageShell
      title="Lead-uri Make"
      description="Lead-urile trimise către agent și răspunsurile primite prin automatizare, cu data, mesajul și statusul."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Reîmprospătează</span>
        </Button>
      }
    >
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Nu am putut încărca datele: {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Răspunsuri de la clienți (lead-uri)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !leads.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă…
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu a răspuns încă nimeni la mesajul de prim contact.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {leads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium">{l.name || "Client WhatsApp"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{l.whatsapp_number || "—"}</div>
                    {l.message && <div className="mt-1 max-w-xl break-words">{l.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{fmt(l.created_at)}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void sendToAgent(l.id)}
                    disabled={sendingId === l.id}
                  >
                    {sendingId === l.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                    <span className="ml-2">Trimite lead către agent</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jurnal transferuri</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Încă nu există transferuri înregistrate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Tip</th>
                    <th className="py-2 pr-3">Număr</th>
                    <th className="py-2 pr-3">Mesaj</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const st = statusLabel(e.status);
                    return (
                      <tr key={e.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-xs">{fmt(e.created_at)}</td>
                        <td className="py-2 pr-3 text-xs">
                          {e.event === "agent_reply"
                            ? "Răspuns agent → client"
                            : e.event === "relay_lead"
                              ? "Lead trimis manual"
                              : "Lead automat"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{e.phone_normalized ?? "—"}</td>
                        <td className="py-2 pr-3 max-w-sm break-words">{e.message?.slice(0, 200) ?? "—"}</td>
                        <td className="py-2">
                          <Badge variant={st.variant} className="text-[11px]">{st.label}</Badge>
                          {e.error && (
                            <div className="text-[11px] text-muted-foreground break-all mt-1">{e.error.slice(0, 160)}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
