import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { CalendarCheck, Handshake, Loader2, MessageSquare, RefreshCw, Search, Send, Tag } from "lucide-react";

/**
 * Tab „Chat WhatsApp" — agenții scriu direct clientului, în chatul real de
 * WhatsApp. Mesajul pleacă prin make-agent-bridge (Meta Cloud API), se salvează
 * în wa_messages și apare instant și în „Conversații live" / „Discuții",
 * pentru că firul este același.
 */

type Conv = {
  id: string;
  phone_normalized: string;
  wa_profile_name: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  assigned_agent_id: string | null;
  created_at: string;
};

type Msg = {
  id: string;
  direction: string;
  content: string | null;
  template_name: string | null;
  error: string | null;
  wa_message_id: string | null;
  created_at: string;
};

type Agent = { id: string; name: string };

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

export default function WhatsappChat() {
  const { toast } = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  // Data și ora vizionării confirmate de agent (text liber, ex. „joi, ora 18:00").
  const [meetingAt, setMeetingAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadConvs = useCallback(async () => {
    const [convRes, agentRes] = await Promise.all([
      supabase
        .from("wa_conversations")
        .select(
          "id, phone_normalized, wa_profile_name, last_inbound_at, last_outbound_at, assigned_agent_id, created_at",
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
    const { data } = await supabase
      .from("wa_messages")
      .select("id, direction, content, template_name, error, wa_message_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(400);
    setMessages((data ?? []) as Msg[]);
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    void loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
    else setMessages([]);
  }, [selectedId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  useRealtimeChannel("wa-chat-agent", [
    {
      event: "*",
      table: "wa_messages",
      handler: () => {
        void loadConvs();
        if (selectedId) void loadThread(selectedId);
      },
    },
    { event: "*", table: "wa_conversations", handler: () => void loadConvs() },
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

  const send = async () => {
    if (!selected || !text.trim()) return;
    setSending(true);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: {
        action: "agent_reply",
        phone: selected.phone_normalized,
        conversation_id: selected.id,
        message: text.trim(),
      },
    });
    setSending(false);
    const res = (data ?? {}) as Record<string, unknown>;
    if (fnErr || res.ok === false || res.delivered === false) {
      toast({
        title: "Mesajul nu a ajuns la client",
        description:
          fnErr?.message ||
          String(
            res.error ??
              "Fereastra de 24 de ore poate fi închisă — clientul trebuie să scrie din nou.",
          ),
        variant: "destructive",
      });
    } else {
      setText("");
      toast({ title: "Mesaj trimis pe WhatsApp", description: selected.phone_normalized });
    }
    void loadThread(selected.id);
  };

  const runStep = async (
    action:
      | "offer_meeting"
      | "offer_direct_chat"
      | "offer_followup"
      | "offer_confirm"
      | "meeting_confirmed",
  ) => {
    if (!selected) return;
    if (action === "meeting_confirmed" && !meetingAt.trim()) {
      toast({
        title: "Scrie data și ora",
        description: "Ex.: joi, 17 septembrie, ora 18:00.",
        variant: "destructive",
      });
      return;
    }
    setBusyStep(action);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: {
        action,
        phone: selected.phone_normalized,
        conversation_id: selected.id,
        ...(action === "meeting_confirmed" ? { meeting_at: meetingAt.trim() } : {}),
      },
    });
    setBusyStep(null);
    const res = (data ?? {}) as Record<string, unknown>;
    const label =
      action === "offer_meeting"
        ? "Propunerea de întâlnire"
        : action === "offer_direct_chat"
        ? "Mesajul cu chatul direct"
        : action === "offer_followup"
        ? "Oferta cu prețul din anunț"
        : action === "meeting_confirmed"
        ? "Confirmarea vizionării"
        : "Confirmarea ofertei";
    if (fnErr || res.delivered === false) {
      toast({
        title: `${label} nu a plecat`,
        description: fnErr?.message || String(res.error ?? "Încearcă din nou."),
        variant: "destructive",
      });
    } else {
      toast({ title: `${label} a fost trimisă`, description: selected.phone_normalized });
    }
    void loadThread(selected.id);
  };

  return (
    <AdminPageShell
      title="Chat WhatsApp"
      description="Scrie direct clientului, în chatul real de WhatsApp. Mesajul apare imediat și în Conversații live, iar clientul îl primește pe telefon."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadConvs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      }
    >
      {error && (
        <p className="mb-4 text-sm text-destructive">Nu am putut încărca discuțiile: {error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Clienți ({filtered.length})
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
                  aria-label={`Deschide chatul cu ${c.wa_profile_name || c.phone_normalized}`}
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
                : "Alege un client"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[46vh] lg:max-h-[460px] overflow-y-auto bg-muted/20 rounded-md p-2 sm:p-3 space-y-1.5">
              {loadingThread ? (
                <>
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="h-12 w-1/2 ml-auto" />
                </>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nicio replică încă. Scrie primul mesaj mai jos.
                </p>
              ) : (
                messages.map((m, i) => {
                  const outbound = m.direction === "outbound";
                  const prev = messages[i - 1];
                  const newDay =
                    !prev ||
                    new Date(prev.created_at).toDateString() !==
                      new Date(m.created_at).toDateString();
                  const metaStatus = !outbound
                    ? null
                    : m.error
                      ? `Meta a respins: ${m.error}`
                      : m.wa_message_id
                        ? "Livrat în WhatsApp"
                        : "Fără confirmare de la Meta";
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <p className="text-center text-[11px] text-muted-foreground my-3">
                          {dayLabel(m.created_at)}
                        </p>
                      )}
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
                            <span>{fmt(m.created_at)}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {m.content || "(fără text)"}
                          </p>
                          {m.template_name && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              șablon: {m.template_name}
                            </p>
                          )}
                          {metaStatus && (
                            <p
                              className={`text-[11px] mt-1 ${m.error ? "text-destructive" : "text-muted-foreground"}`}
                            >
                              {metaStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Scrie mesajul pentru client…"
                rows={3}
                disabled={!selected}
                aria-label="Mesajul trimis clientului pe WhatsApp"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => void send()}
                  disabled={sending || !selected || !text.trim()}
                  aria-label="Trimite mesajul pe WhatsApp"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Trimite pe WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  disabled={!selected || busyStep === "offer_followup"}
                  onClick={() => void runStep("offer_followup")}
                  aria-label="Trimite oferta automată cu prețul exact din anunț"
                >
                  {busyStep === "offer_followup" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4 mr-2" />
                  )}
                  Ofertă automată
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  disabled={!selected || busyStep === "offer_meeting"}
                  onClick={() => void runStep("offer_meeting")}
                  aria-label="Propune un punct de întâlnire pentru vizionare și negociere"
                >
                  {busyStep === "offer_meeting" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Handshake className="h-4 w-4 mr-2" />
                  )}
                  Punct de întâlnire
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  disabled={!selected || busyStep === "offer_direct_chat"}
                  onClick={() => void runStep("offer_direct_chat")}
                  aria-label="Anunță clientul că poate scrie direct pe WhatsApp"
                >
                  {busyStep === "offer_direct_chat" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Link chat direct
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mesajele clienților intră prin conexiunea securizată cu WhatsApp, deci se salvează
                și se văd aici chiar dacă browserul tău a fost închis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
