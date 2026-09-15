import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
} from "lucide-react";

type OfferEvent = {
  id: string;
  conversation_id: string | null;
  phone_normalized: string | null;
  property_id: string | null;
  property_name: string | null;
  property_url: string | null;
  price: number | null;
  event: string;
  status: string | null;
  error: string | null;
  agent_id: string | null;
  created_at: string;
};

type Msg = {
  id: string;
  conversation_id: string;
  direction: string;
  role: string | null;
  content: string | null;
  template_name: string | null;
  error: string | null;
  created_at: string;
};

type Agent = { id: string; name: string; email: string | null };

/** Evenimentele care înseamnă „ofertă trimisă clientului". */
const OFFER_EVENTS = [
  "offer_intro",
  "offer_followup",
  "offer_confirm",
  "offer_sent",
  "negotiation",
  "property_offer",
] as const;

const EVENT_LABELS: Record<string, string> = {
  offer_intro: "Anunț înainte de ofertă",
  offer_followup: "Ofertă cu pașii",
  offer_confirm: "Ofertă livrată — vizionare",
  offer_sent: "Ofertă trimisă",
  negotiation: "Negociere",
  property_offer: "Apartament propus",
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—";

const money = (v: number | null) =>
  typeof v === "number" && !Number.isNaN(v)
    ? `${Math.round(v).toLocaleString("ro-RO")} €`
    : null;

/**
 * Tab „Oferte livrate": fiecare ofertă trimisă pe WhatsApp, cu data livrării,
 * agentul alocat, apartamentul și firul complet al discuției.
 */
const WhatsappOffersDelivered = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["wa-offers-delivered"],
    queryFn: async () => {
      const [{ data: events, error: evErr }, { data: agents, error: agErr }] =
        await Promise.all([
          supabase
            .from("wa_transaction_events")
            .select(
              "id, conversation_id, phone_normalized, property_id, property_name, property_url, price, event, status, error, agent_id, created_at",
            )
            .in("event", OFFER_EVENTS as unknown as string[])
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("wa_agents").select("id, name, email"),
        ]);
      if (evErr) throw evErr;
      if (agErr) throw agErr;
      return {
        events: (events ?? []) as OfferEvent[],
        agents: (agents ?? []) as Agent[],
      };
    },
  });

  const openConversationId = useMemo(
    () => data?.events.find((e) => e.id === openId)?.conversation_id ?? null,
    [data, openId],
  );

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["wa-offer-thread", openConversationId],
    enabled: !!openConversationId,
    queryFn: async () => {
      const { data: rows, error: qErr } = await supabase
        .from("wa_messages")
        .select("id, conversation_id, direction, role, content, template_name, error, created_at")
        .eq("conversation_id", openConversationId as string)
        .order("created_at", { ascending: true })
        .limit(300);
      if (qErr) throw qErr;
      return (rows ?? []) as Msg[];
    },
  });

  useRealtimeChannel("wa-offers-delivered", [
    { event: "*", table: "wa_transaction_events", handler: () => void refetch() },
    {
      event: "*",
      table: "wa_messages",
      handler: () => {
        void queryClient.invalidateQueries({ queryKey: ["wa-offer-thread"] });
      },
    },
  ]);

  const agentName = (id: string | null) => {
    if (!id) return "Nealocat";
    const a = data?.agents.find((x) => x.id === id);
    return a ? a.name : "Agent necunoscut";
  };

  const events = data?.events ?? [];
  const delivered = events.filter((e) => e.status !== "failed" && !e.error);
  const failed = events.filter((e) => e.status === "failed" || !!e.error);
  const clients = new Set(events.map((e) => e.phone_normalized ?? e.conversation_id)).size;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Tag className="h-5 w-5" />
            Oferte livrate
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[40px]"
            onClick={() => void refetch()}
            disabled={isRefetching}
            aria-label="Reîncarcă lista de oferte livrate"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{delivered.length} livrate</Badge>
            {failed.length > 0 && (
              <Badge variant="destructive">{failed.length} eșuate</Badge>
            )}
            <Badge variant="outline">{clients} clienți</Badge>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> Lista nu a putut fi încărcată.
            </div>
          )}
          {!isLoading && !error && events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Încă nu a fost trimisă nicio ofertă pe WhatsApp.
            </p>
          )}

          {events.map((e) => {
            const open = openId === e.id;
            const failedRow = e.status === "failed" || !!e.error;
            return (
              <div key={e.id} className="rounded-lg border">
                <button
                  type="button"
                  className="w-full text-left p-3 flex flex-col sm:flex-row sm:items-center gap-2 min-h-[48px]"
                  onClick={() => setOpenId(open ? null : e.id)}
                  aria-label={`Deschide firul discuției pentru oferta din ${fmt(e.created_at)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {e.property_name || "Apartament nespecificat"}
                      {money(e.price) ? ` · ${money(e.price)}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fmt(e.created_at)} · {e.phone_normalized || "—"} · agent:{" "}
                      {agentName(e.agent_id)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{EVENT_LABELS[e.event] ?? e.event}</Badge>
                    <Badge variant={failedRow ? "destructive" : "secondary"}>
                      {failedRow ? "eșuată" : "livrată"}
                    </Badge>
                    {open ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {e.error && <p className="px-3 pb-2 text-xs text-destructive">{e.error}</p>}

                {open && (
                  <div className="border-t p-3 space-y-2">
                    {e.property_url && (
                      <a
                        href={e.property_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary underline min-h-[40px]"
                      >
                        Deschide anunțul <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {threadLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă firul…
                      </div>
                    )}
                    {!threadLoading && (thread ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Firul discuției nu are mesaje salvate.
                      </p>
                    )}
                    <div className="space-y-1.5 max-h-[52vh] overflow-y-auto">
                      {(thread ?? []).map((m) => {
                        const inbound = m.direction === "inbound";
                        return (
                          <div
                            key={m.id}
                            className={
                              inbound
                                ? "max-w-[85%] rounded-lg bg-muted px-3 py-2"
                                : "max-w-[85%] ml-auto rounded-lg bg-primary/10 px-3 py-2"
                            }
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {m.content || "—"}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {inbound ? "client" : m.role === "assistant" ? "agent" : "sistem"} ·{" "}
                              {fmt(m.created_at)}
                              {m.template_name ? ` · ${m.template_name}` : ""}
                              {m.error ? ` · ${m.error}` : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappOffersDelivered;
