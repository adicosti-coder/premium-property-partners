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
import { Loader2, MessageSquare, RefreshCw, Search, Send, User } from "lucide-react";

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
  created_at: string;
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

const lastActivity = (c: ConversationRow) => {
  const times = [c.last_inbound_at, c.last_outbound_at, c.created_at]
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime());
  return times.length ? Math.max(...times) : 0;
};

export default function WhatsappLiveConversations() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data, error: convErr } = await supabase
      .from("wa_conversations")
      .select(
        "id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at, window_expires_at, created_at",
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

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    const { data, error: msgErr } = await supabase
      .from("wa_messages")
      .select("id, conversation_id, direction, role, content, template_name, error, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (msgErr) setError(msgErr.message);
    setMessages((data ?? []) as MessageRow[]);
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) void loadThread(selectedId);
    else setMessages([]);
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

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
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
          <CardContent className="space-y-2 max-h-[560px] overflow-y-auto">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {selected
                ? `${selected.wa_profile_name || "Client"} · ${selected.phone_normalized}`
                : "Selectează o discuție"}
            </CardTitle>
            {selected && (
              <p className="text-xs text-muted-foreground">
                {windowOpen
                  ? `Poți răspunde liber până la ${fmt(selected.window_expires_at)}`
                  : "Fereastra de 24h e închisă — se poate trimite doar un mesaj-șablon aprobat."}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-y-auto">
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
              messages.map((m) => {
                const outbound = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg border px-3 py-2 ${
                      outbound ? "ml-auto bg-primary/10 border-primary/30" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                      <span>{outbound ? "Agent" : "Client"}</span>
                      <span>·</span>
                      <span>{fmt(m.created_at)}</span>
                      {m.template_name && <Badge variant="outline">{m.template_name}</Badge>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {m.content || "—"}
                    </p>
                    {m.error && (
                      <p className="text-xs text-destructive mt-1">Eroare Meta: {m.error}</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
