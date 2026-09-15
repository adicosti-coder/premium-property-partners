import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { offerStatus } from "@/lib/waOfferStatus";
import { MessageSquare, RefreshCw, Search } from "lucide-react";

/**
 * Tab „Discuții" — cititor read-only al firului complet al discuțiilor WhatsApp
 * (mesajele clienților + răspunsurile agentului + pașii de ofertă), actualizat
 * în timp real. Fără butoane de trimitere: doar urmărirea discuțiilor.
 */

type Conv = {
  id: string;
  phone_normalized: string;
  wa_profile_name: string | null;
  status: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  assigned_agent_id: string | null;
  created_at: string;
};

type Msg = {
  id: string;
  direction: string;
  role: string | null;
  content: string | null;
  template_name: string | null;
  error: string | null;
  wa_message_id: string | null;
  created_at: string;
};

type Tx = {
  id: string;
  event: string;
  status: string | null;
  property_name: string | null;
  price: number | null;
  error: string | null;
  created_at: string;
};

type Agent = { id: string; name: string };

const TX_LABELS: Record<string, string> = {
  offer_sent: "Apartament ales — anunț trimis",
  offer_failed: "Apartament ales — anunțul nu a ajuns",
  offer_intro: "Anunț înainte de ofertă",
  offer_followup: "Ofertă cu pașii următori",
  offer_confirm: "Ofertă livrată — vizionare",
  offer_meeting: "Propunere punct de întâlnire",
  offer_direct_chat: "Chat direct pe WhatsApp",
  listing_opened: "Anunț deschis",
  negotiation: "Negociere",
};


const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function WhatsappThreads() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [txEvents, setTxEvents] = useState<Tx[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadConvs = useCallback(async () => {
    setLoading(true);
    const [convRes, agentRes] = await Promise.all([
      supabase
        .from("wa_conversations")
        .select(
          "id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at, assigned_agent_id, created_at",
        )
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase.from("wa_agents").select("id, name"),
    ]);
    if (convRes.error) setError(convRes.error.message);
    else {
      setError(null);
      const rows = (convRes.data ?? []) as Conv[];
      setConvs(rows);
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
    }
    setAgents((agentRes.data ?? []) as Agent[]);
    setLoading(false);
  }, []);

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    const [msgRes, txRes] = await Promise.all([
      supabase
        .from("wa_messages")
        .select("id, direction, role, content, template_name, error, wa_message_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("wa_transaction_events")
        .select("id, event, status, property_name, price, error, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    setMessages((msgRes.data ?? []) as Msg[]);
    setTxEvents((txRes.data ?? []) as Tx[]);
    setLoadingThread(false);
  }, []);

  useEffect(() => { void loadConvs(); }, [loadConvs]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
    else {
      setMessages([]);
      setTxEvents([]);
    }
  }, [selectedId, loadThread]);

  useRealtimeChannel("wa-threads-reader", [
    {
      event: "*",
      table: "wa_messages",
      handler: () => {
        void loadConvs();
        if (selectedId) void loadThread(selectedId);
      },
    },
    {
      event: "*",
      table: "wa_transaction_events",
      handler: () => { if (selectedId) void loadThread(selectedId); },
    },
    { event: "*", table: "wa_conversations", handler: () => { void loadConvs(); } },
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(
      (c) =>
        c.phone_normalized?.toLowerCase().includes(q) ||
        (c.wa_profile_name ?? "").toLowerCase().includes(q),
    );
  }, [convs, search]);

  const selected = convs.find((c) => c.id === selectedId) ?? null;
  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name ?? "nealocat";

  /** Pașii de ofertă intercalați cronologic în fir. */
  const steps = useMemo(() => {
    const map = new Map<string, Tx[]>();
    const trailing: Tx[] = [];
    let idx = 0;
    for (const ev of txEvents) {
      const t = new Date(ev.created_at).getTime();
      while (idx < messages.length && new Date(messages[idx].created_at).getTime() < t) idx++;
      if (idx < messages.length) {
        const key = messages[idx].id;
        map.set(key, [...(map.get(key) ?? []), ev]);
      } else trailing.push(ev);
    }
    return { map, trailing };
  }, [txEvents, messages]);

  const renderStep = (ev: Tx) => {
    const st = offerStatus(ev);
    return (
      <div key={ev.id} className="my-2 flex justify-center">
        <div className="max-w-[92%] rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center">
          <p className="text-[11px] font-medium">
            {TX_LABELS[ev.event] ?? ev.event}
            {ev.property_name ? ` · ${ev.property_name}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant={st.variant}>{st.label}</Badge>
            <span>{fmt(ev.created_at)}</span>
            {ev.price ? <span>· {Number(ev.price).toLocaleString("ro-RO")} €</span> : null}
          </div>
          {ev.error && <p className="text-[11px] text-destructive">{ev.error}</p>}
        </div>
      </div>
    );
  };

  return (
    <AdminPageShell
      title="Discuții WhatsApp"
      description="Firul complet al fiecărei discuții: mesajele clienților, răspunsurile agentului și pașii ofertei, actualizate în timp real."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadConvs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      }
    >
      {error && <p className="mb-4 text-sm text-destructive">Nu am putut încărca discuțiile: {error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discuții ({filtered.length})
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Caută număr sau nume"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[240px] lg:max-h-[560px] overflow-y-auto">
            {loading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio discuție încă.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-label={`Deschide firul discuției cu ${c.wa_profile_name || c.phone_normalized}`}
                  className={`w-full text-left rounded-lg border p-3 min-h-[48px] transition-colors ${
                    c.id === selectedId ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {c.wa_profile_name || c.phone_normalized}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fmt(c.last_inbound_at ?? c.last_outbound_at ?? c.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{c.phone_normalized}</span>
                    {c.last_inbound_at && <Badge variant="secondary">a răspuns</Badge>}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base truncate">
              {selected
                ? `${selected.wa_profile_name || selected.phone_normalized} · agent: ${agentName(selected.assigned_agent_id)}`
                : "Alege o discuție"}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[52vh] lg:max-h-[560px] overflow-y-auto bg-muted/20 rounded-md mx-2 sm:mx-4 p-2 sm:p-3 space-y-1.5">
            {loadingThread ? (
              <>
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
              </>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio replică salvată pentru această discuție.</p>
            ) : (
              messages.map((m, i) => {
                const outbound = m.direction === "outbound";
                const prev = messages[i - 1];
                const newDay =
                  !prev ||
                  new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                const metaStatus = !outbound
                  ? null
                  : m.error
                    ? `Meta a respins: ${m.error}`
                    : m.wa_message_id
                      ? "Acceptat de Meta"
                      : "Fără confirmare de la Meta";
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="text-center text-[11px] text-muted-foreground my-3">
                        {dayLabel(m.created_at)}
                      </p>
                    )}
                    {(steps.map.get(m.id) ?? []).map(renderStep)}
                    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] px-3 py-2 shadow-sm ${
                          outbound
                            ? "bg-primary/15 rounded-2xl rounded-br-sm"
                            : "bg-card border border-border rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                          <span className="font-medium">
                            {outbound ? agentName(selected?.assigned_agent_id ?? null) : "Client"}
                          </span>
                          {m.template_name && <Badge variant="outline">{m.template_name}</Badge>}
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content || "—"}</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[11px]">
                          <span className="text-muted-foreground">{fmt(m.created_at)}</span>
                          {metaStatus && (
                            <span className={m.error ? "text-destructive" : "text-muted-foreground"}>
                              · {metaStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!loadingThread && steps.trailing.map(renderStep)}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
