import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Handshake, Home, Loader2, MessageSquare, RefreshCw, Search, Send, User } from "lucide-react";

/**
 * Conversații live WhatsApp — firul complet al discuției (mesaje trimise de agent
 * + răspunsurile clienților), citit din `wa_conversations` / `wa_messages`.
 */

type ConversationRow = {
  id: string;
  phone_normalized: string;
  wa_profile_name: string | null;
  status: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  window_expires_at: string | null;
  assigned_agent_id: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  direction: string;
  role: string | null;
  content: string | null;
  template_name: string | null;
  error: string | null;
  wa_message_id: string | null;
  created_at: string;
};

type AgentRow = { id: string; name: string; email: string };

type TxEventRow = {
  id: string;
  event: string;
  status: string | null;
  property_name: string | null;
  property_url: string | null;
  price: number | null;
  error: string | null;
  agent_id: string | null;
  created_at: string;
};

/** Eticheta pasului de tranzacție afișat în discuție. */
const TX_LABELS: Record<string, string> = {
  offer_sent: "Apartament ales — anunț trimis clientului",
  offer_failed: "Apartament ales — anunțul nu a ajuns la client",
  offer_intro: "Anunț înainte de ofertă — ofertele merg direct pe WhatsApp",
  offer_followup: "Ofertă și negociere — pașii următori trimiși",
  offer_confirm: "Ofertă livrată — invitație la vizionare și negociere",
  listing_opened: "Anunț deschis",
  negotiation: "Negociere",
};

type SaleProperty = {
  id: string;
  name: string;
  slug: string | null;
  listing_type: string | null;
  rooms: number | null;
  size: number | null;
  location: string | null;
  capital_necesar: number | null;
  price_per_sqm: number | null;
};

const propertyPrice = (p: SaleProperty) =>
  p.capital_necesar ||
  (p.price_per_sqm && p.size ? Math.round(p.price_per_sqm * p.size) : 0);

const propertyUrl = (p: SaleProperty) => `https://realtrust.ro/proprietate/${p.slug}`;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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

const lastActivity = (c: ConversationRow) => {
  const times = [c.last_inbound_at, c.last_outbound_at, c.created_at]
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime());
  return times.length ? Math.max(...times) : 0;
};

export default function WhatsappLiveConversations() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [txEvents, setTxEvents] = useState<TxEventRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [saleProperties, setSaleProperties] = useState<SaleProperty[]>([]);
  const [pickedProperty, setPickedProperty] = useState<string>("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [agentPick, setAgentPick] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data, error: convErr } = await supabase
      .from("wa_conversations")
      .select(
        "id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at, window_expires_at, assigned_agent_id, created_at",
      )
      .order("updated_at", { ascending: false })
      .limit(200);
    if (convErr) setError(convErr.message);
    else {
      setError(null);
      const rows = (data ?? []) as ConversationRow[];
      rows.sort((a, b) => lastActivity(b) - lastActivity(a));
      setConversations(rows);
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
    }
    setLoading(false);
  }, []);

  const loadAgents = useCallback(async () => {
    const { data } = await supabase.from("wa_agents").select("id, name, email");
    setAgents((data ?? []) as AgentRow[]);
  }, []);

  const loadSaleProperties = useCallback(async () => {
    const { data } = await supabase
      .from("properties")
      .select("id, name, slug, listing_type, rooms, size, location, capital_necesar, price_per_sqm")
      .eq("is_active", true)
      .in("listing_type", ["vanzare", "investitie"])
      .not("slug", "is", null)
      .order("name");
    setSaleProperties((data ?? []) as SaleProperty[]);
  }, []);

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    const [msgRes, txRes] = await Promise.all([
      supabase
        .from("wa_messages")
        .select("id, conversation_id, direction, role, content, template_name, error, wa_message_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("wa_transaction_events")
        .select("id, event, status, property_name, property_url, price, error, agent_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    if (msgRes.error) setError(msgRes.error.message);
    setMessages((msgRes.data ?? []) as MessageRow[]);
    setTxEvents((txRes.data ?? []) as TxEventRow[]);
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    void loadConversations();
    void loadAgents();
    void loadSaleProperties();
  }, [loadConversations, loadAgents, loadSaleProperties]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
    else {
      setMessages([]);
      setTxEvents([]);
    }
  }, [selectedId, loadThread]);

  useRealtimeChannel("wa-live-conversations", [
    {
      event: "*",
      table: "wa_messages",
      handler: () => {
        void loadConversations();
        if (selectedId) void loadThread(selectedId);
      },
    },
    {
      event: "*",
      table: "wa_transaction_events",
      handler: () => { if (selectedId) void loadThread(selectedId); },
    },
    {
      event: "*",
      table: "wa_conversations",
      handler: () => { void loadConversations(); },
    },
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.phone_normalized?.toLowerCase().includes(q) ||
        (c.wa_profile_name ?? "").toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const windowOpen = selected?.window_expires_at
    ? new Date(selected.window_expires_at).getTime() > Date.now()
    : false;
  const agentName = (id: string | null) =>
    agents.find((a) => a.id === id)?.name ?? "nealocat";

  /** Pașii de tranzacție intercalați cronologic în firul de discuție. */
  const stepTimeline = useMemo(() => {
    const map = new Map<string, TxEventRow[]>();
    const trailing: TxEventRow[] = [];
    let idx = 0;
    for (const ev of txEvents) {
      const t = new Date(ev.created_at).getTime();
      while (idx < messages.length && new Date(messages[idx].created_at).getTime() < t) idx++;
      if (idx < messages.length) {
        const key = messages[idx].id;
        map.set(key, [...(map.get(key) ?? []), ev]);
      } else {
        trailing.push(ev);
      }
    }
    return { map, trailing };
  }, [txEvents, messages]);

  /** Starea pasului de tranzacție, pentru bara de progres a discuției. */
  const stages = useMemo(() => {
    const has = (e: string) => txEvents.some((t) => t.event === e && t.status !== "failed");
    return [
      { label: "Apartament ales", done: has("offer_sent") },
      { label: "Ofertă trimisă", done: has("offer_followup") },
      { label: "Anunț deschis", done: has("listing_opened") },
      {
        label: "Negociere",
        done: has("negotiation") ||
          (has("offer_followup") && messages.some((m) => m.direction === "inbound" &&
            new Date(m.created_at).getTime() >
              Math.max(
                0,
                ...txEvents
                  .filter((t) => t.event === "offer_followup")
                  .map((t) => new Date(t.created_at).getTime()),
              ))),
      },
    ];
  }, [txEvents, messages]);

  const renderStep = (ev: TxEventRow) => (
    <div key={ev.id} className="my-2 flex justify-center">
      <div className="max-w-[90%] rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center">
        <p className="text-[11px] font-medium">
          {TX_LABELS[ev.event] ?? ev.event}
          {ev.property_name ? ` · ${ev.property_name}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {fmt(ev.created_at)}
          {ev.price ? ` · ${Number(ev.price).toLocaleString("ro-RO")} €` : ""}
        </p>
        {ev.error && <p className="text-[11px] text-destructive">{ev.error}</p>}
      </div>
    </div>
  );


  const QUALIFY_MESSAGE = [
    "Bună ziua! Vă mulțumim pentru mesaj.",
    "Ca să vă ajutăm rapid, spuneți-ne cu ce vă putem fi de folos:",
    "1) Imobiliare (vânzare / achiziție / închiriere)",
    "2) Administrare apartament (regim hotelier sau termen mediu-lung)",
    "3) Rezervare regim hotelier: https://realtrust.ro/rezervare",
  ].join("\n");

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: { action: "agent_reply", phone: selected.phone_normalized, message: replyText.trim() },
    });
    setSending(false);
    const res = (data ?? {}) as Record<string, unknown>;
    if (fnErr || res.delivered === false) {
      toast({
        title: "Mesajul nu a fost livrat",
        description: windowOpen
          ? (fnErr?.message || String(res.error ?? "Eroare la trimitere"))
          : "Fereastra de 24h este închisă — clientul trebuie să scrie din nou înainte de un mesaj liber.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Mesaj trimis", description: "Clientul a primit mesajul pe WhatsApp." });
      setReplyText("");
    }
    void loadConversations();
    if (selectedId) void loadThread(selectedId);
  };

  /**
   * Pasul de tranzacție: după discuție, agentul marchează apartamentul ales de client,
   * îi trimite anunțul de vânzare pe WhatsApp și deschide pagina anunțului.
   */
  const sendOffer = async () => {
    const prop = saleProperties.find((p) => p.id === pickedProperty);
    if (!selected || !prop) return;
    const url = propertyUrl(prop);

    setSendingOffer(true);
    // Pasul de tranzacție trece prin punte: mesajul pleacă pe WhatsApp, se
    // înregistrează în dashboardul de tranzacții și se anunță în Make.
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: {
        action: "property_offer",
        phone: selected.phone_normalized,
        property_id: prop.id,
      },
    });
    setSendingOffer(false);
    const res = (data ?? {}) as Record<string, unknown>;
    if (fnErr || res.delivered === false) {
      toast({
        title: "Anunțul nu a fost trimis",
        description: windowOpen
          ? (fnErr?.message || String(res.error ?? "Eroare la trimitere"))
          : "Fereastra de 24h este închisă — clientul trebuie să scrie din nou.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Anunț trimis clientului",
        description: `${prop.name} — apare în discuție și deschid pagina anunțului.`,
      });
      void supabase.functions.invoke("make-agent-bridge", {
        body: {
          action: "listing_opened",
          phone: selected.phone_normalized,
          property_id: prop.id,
          conversation_id: selected.id,
        },
      });
      window.open(url, "_blank", "noopener,noreferrer");
    }
    void loadConversations();
    if (selectedId) void loadThread(selectedId);
  };

  /**
   * Mesajele automate care duc discuția mai departe când agentul nu răspunde:
   * anunțul dinaintea ofertei, oferta cu pașii următori, confirmarea ofertei
   * (vizionare + negociere) și deschiderea negocierii.
   */
  const STEP_TITLES: Record<string, { ok: string; fail: string }> = {
    offer_intro: { ok: "Anunț trimis", fail: "Anunțul nu a plecat" },
    offer_followup: { ok: "Ofertă trimisă", fail: "Oferta nu a plecat" },
    offer_confirm: { ok: "Confirmare trimisă", fail: "Confirmarea nu a plecat" },
    negotiation: { ok: "Negociere pornită", fail: "Negocierea nu a plecat" },
  };

  const runStep = async (
    action: "offer_intro" | "offer_followup" | "offer_confirm" | "negotiation",
  ) => {
    if (!selected) return;
    const prop = saleProperties.find((p) => p.id === pickedProperty);
    setBusyStep(action);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: {
        action,
        phone: selected.phone_normalized,
        conversation_id: selected.id,
        ...(prop ? { property_id: prop.id } : {}),
      },
    });
    setBusyStep(null);
    const res = (data ?? {}) as Record<string, unknown>;
    const titles = STEP_TITLES[action];
    if (fnErr || res.delivered === false) {
      toast({
        title: titles.fail,
        description:
          fnErr?.message ||
          String(res.error ?? "Fereastra de 24h poate fi închisă — clientul trebuie să scrie din nou."),
        variant: "destructive",
      });
    } else {
      toast({
        title: titles.ok,
        description: "Mesajul a plecat automat în aceeași discuție pe WhatsApp.",
      });
    }
    void loadConversations();
    if (selectedId) void loadThread(selectedId);
  };


  /** Alocare manuală: discuțiile nealocate automat pot fi mutate pe un agent. */
  const assignAgent = async () => {
    if (!selected || !agentPick) return;
    setAssigning(true);
    const { error: upErr } = await supabase
      .from("wa_conversations")
      .update({ assigned_agent_id: agentPick, assigned_at: new Date().toISOString() })
      .eq("id", selected.id);
    setAssigning(false);
    if (upErr) {
      toast({ title: "Alocarea nu a reușit", description: upErr.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Discuție alocată",
      description: `Preluată de ${agents.find((a) => a.id === agentPick)?.name ?? "agent"}.`,
    });
    void loadConversations();
  };

  return (
    <AdminPageShell
      title="Conversații live WhatsApp"
      description="Firul complet al discuțiilor: mesajele trimise de agent și răspunsurile clienților, în timp real."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadConversations()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      }
    >
      {error && (
        <p className="mb-4 text-sm text-destructive">Nu am putut încărca discuțiile: {error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[320px_1fr]">
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
                <Skeleton className="h-14 w-full" />
              </>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio conversație încă.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-label={`Deschide discuția cu ${c.wa_profile_name || c.phone_normalized}`}
                  className={`w-full text-left rounded-lg border p-3 transition-colors min-h-[48px] ${
                    c.id === selectedId ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {c.wa_profile_name || c.phone_normalized}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fmt(c.last_inbound_at ?? c.last_outbound_at ?? c.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{c.phone_normalized}</span>
                    {c.last_inbound_at && <Badge variant="secondary">a răspuns</Badge>}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {selected
                  ? `${selected.wa_profile_name || "Client"} · ${selected.phone_normalized}`
                  : "Selectează o discuție"}
              </span>
            </CardTitle>
            {selected && (
              <p className="text-xs text-muted-foreground">
                Agent alocat: <span className="font-medium">{agentName(selected.assigned_agent_id)}</span>
                {" · "}
                {windowOpen
                  ? `Poți răspunde liber până la ${fmt(selected.window_expires_at)}`
                  : "Fereastra de 24h e închisă — se poate trimite doar un mesaj-șablon aprobat."}
              </p>
            )}
            {selected && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Pașii de tranzacție">
                {stages.map((s) => (
                  <Badge key={s.label} variant={s.done ? "default" : "outline"} className="text-[11px]">
                    {s.label}
                  </Badge>
                ))}
              </div>
            )}
            {selected && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <Select value={agentPick} onValueChange={setAgentPick}>
                  <SelectTrigger className="w-full sm:w-[220px]" aria-label="Alege agentul">
                    <SelectValue placeholder="Alocă manual unui agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[40px]"
                  disabled={assigning || !agentPick || agentPick === selected.assigned_agent_id}
                  onClick={() => void assignAgent()}
                  aria-label="Alocă discuția agentului selectat"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Alocă agent
                </Button>
              </div>
            )}
          </CardHeader>
          {/* Firul de discuție ca într-o aplicație de chat: clientul în stânga, noi în dreapta. */}
          <CardContent className="max-h-[52vh] lg:max-h-[560px] overflow-y-auto bg-muted/20 rounded-md mx-2 sm:mx-4 p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            {loadingThread ? (
              <>
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
              </>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nicio replică salvată pentru această discuție.
              </p>
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
                    {(stepTimeline.map.get(m.id) ?? []).map(renderStep)}
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
                        {(() => {
                          const link = (m.content || "").match(
                            /https:\/\/realtrust\.ro\/proprietate\/[a-z0-9-]+/i,
                          )?.[0];
                          if (!link) return null;
                          const slug = link.split("/").pop() ?? "";
                          const prop = saleProperties.find((p) => p.slug === slug);
                          return (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background/70 p-2 hover:bg-background"
                              aria-label={`Deschide anunțul ${prop?.name ?? slug}`}
                            >
                              <Home className="h-4 w-4 text-primary shrink-0" />
                              <span className="min-w-0">
                                <span className="block text-xs font-medium truncate">
                                  {prop?.name ?? "Anunț apartament"}
                                </span>
                                <span className="block text-[11px] text-muted-foreground truncate">
                                  {prop
                                    ? [
                                        prop.rooms ? `${prop.rooms} camere` : null,
                                        prop.size ? `${prop.size} m²` : null,
                                        prop.location,
                                        propertyPrice(prop)
                                          ? `${propertyPrice(prop).toLocaleString("ro-RO")} €`
                                          : null,
                                      ].filter(Boolean).join(" · ")
                                    : "Vezi anunțul de vânzare"}
                                </span>
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
                            </a>
                          );
                        })()}
                        <div className="flex items-center justify-end gap-2 mt-1 text-[11px]">
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
            {!loadingThread && stepTimeline.trailing.map(renderStep)}
          </CardContent>
          {selected && (
            <CardContent className="border-t pt-4 space-y-2">
              <label htmlFor="wa-reply" className="text-sm font-medium">
                Răspuns către client (backup, dacă Make nu răspunde)
              </label>
              <Textarea
                id="wa-reply"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Scrie mesajul pentru client…"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => void sendReply()}
                  disabled={sending || !replyText.trim()}
                  aria-label="Trimite mesajul pe WhatsApp"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Trimite pe WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplyText(QUALIFY_MESSAGE)}
                  aria-label="Completează mesajul standard de calificare"
                >
                  Mesajul standard de calificare
                </Button>
              </div>
              {!windowOpen && (
                <p className="text-xs text-muted-foreground">
                  Fereastra de 24h e închisă: mesajul liber nu poate fi livrat până când clientul
                  scrie din nou.
                </p>
              )}

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Pasul următor: apartamentul ales de client</p>
                <p className="text-xs text-muted-foreground">
                  Alege apartamentul discutat, trimite-i clientului anunțul de vânzare pe WhatsApp
                  și deschide pagina anunțului.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Select value={pickedProperty} onValueChange={setPickedProperty}>
                    <SelectTrigger className="w-full sm:w-[320px]" aria-label="Alege apartamentul">
                      <SelectValue placeholder="Alege apartamentul" />
                    </SelectTrigger>
                    <SelectContent>
                      {saleProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="min-h-[40px]"
                    onClick={() => void sendOffer()}
                    disabled={sendingOffer || !pickedProperty}
                    aria-label="Trimite anunțul de vânzare și deschide-l"
                  >
                    {sendingOffer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Home className="h-4 w-4" />
                    )}
                    <span className="ml-2">Trimite anunțul și deschide-l</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Anunțul dinaintea ofertei îi spune clientului că ofertele vin direct pe WhatsApp,
                  iar confirmarea de după ofertă îl cheamă la vizionare și negociere — discuția
                  continuă în același fir chiar dacă agentul nu răspunde.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={busyStep === "offer_intro"}
                    onClick={() => void runStep("offer_intro")}
                    aria-label="Anunță clientul că ofertele vin direct pe WhatsApp"
                  >
                    {busyStep === "offer_intro" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Anunț înainte de ofertă
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={busyStep === "offer_followup"}
                    onClick={() => void runStep("offer_followup")}
                    aria-label="Trimite oferta automată cu pașii următori"
                  >
                    {busyStep === "offer_followup" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Trimite oferta cu pașii
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={busyStep === "offer_confirm"}
                    onClick={() => void runStep("offer_confirm")}
                    aria-label="Confirmă livrarea ofertei și invită la vizionare și negociere"
                  >
                    {busyStep === "offer_confirm" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Handshake className="h-4 w-4 mr-2" />
                    )}
                    Ofertă livrată — vizionare
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={busyStep === "negotiation"}
                    onClick={() => void runStep("negotiation")}
                    aria-label="Trimite mesajul automat de negociere"
                  >
                    {busyStep === "negotiation" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Handshake className="h-4 w-4 mr-2" />
                    )}
                    Mesaj de negociere
                  </Button>
                </div>

              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </AdminPageShell>
  );
}
