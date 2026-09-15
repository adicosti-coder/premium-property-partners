import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import {
  Loader2, RefreshCw, MessageSquare, Send, Clock, Wifi, WifiOff, AlertTriangle,
} from "lucide-react";

type Msg = {
  id: string;
  conversation_id: string;
  direction: string;
  role: string | null;
  content: string | null;
  error: string | null;
  created_at: string;
};

type Conv = {
  id: string;
  phone_normalized: string;
  wa_profile_name: string | null;
  status: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  assigned_agent_id: string | null;
};

type Agent = { id: string; name: string };

const DAYS = 7;
const ABANDON_HOURS = 24;

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—";

/**
 * Dashboard live: câte mesaje au venit de la clienți, câte răspunsuri au plecat
 * și unde se blochează discuția (client fără răspuns = abandonată).
 */
const WhatsappLiveDashboard = () => {
  const since = useMemo(
    () => new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString(),
    [],
  );
  const { toast } = useToast();
  const [reengaging, setReengaging] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["wa-live-dashboard", since],
    queryFn: async () => {
      const [msgRes, convRes, agentRes, replyRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select("id, conversation_id, direction, role, content, error, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(3000),
        supabase
          .from("wa_conversations")
          .select(
            "id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at, assigned_agent_id",
          )
          .order("updated_at", { ascending: false })
          .limit(300),
        supabase.from("wa_agents").select("id, name"),
        supabase
          .from("make_lead_events")
          .select("id, conversation_id, created_at")
          .eq("event", "wa_agent_reply")
          .gte("created_at", since)
          .limit(2000),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (convRes.error) throw convRes.error;
      return {
        messages: (msgRes.data ?? []) as Msg[],
        conversations: (convRes.data ?? []) as Conv[],
        agents: (agentRes.data ?? []) as Agent[],
        replies: (replyRes.data ?? []) as { conversation_id: string | null }[],
      };
    },
    staleTime: 30_000,
  });

  // Actualizare instant: mesajele noi apar fără refresh.
  const { connected } = useRealtimeChannel("wa-live-dashboard", [
    { event: "*", table: "wa_messages", handler: () => void refetch() },
    { event: "*", table: "wa_conversations", handler: () => void refetch() },
    { event: "*", table: "make_lead_events", handler: () => void refetch() },
  ]);

  const rows = useMemo(() => {
    const msgs = data?.messages ?? [];
    const convs = data?.conversations ?? [];
    const agents = data?.agents ?? [];
    const agentName = (id: string | null) =>
      agents.find((a) => a.id === id)?.name ?? "Nealocat";
    const cutoff = Date.now() - ABANDON_HOURS * 3600 * 1000;

    const byConv = new Map<string, { inbound: number; outbound: number; failed: number; lastText: string }>();
    for (const m of msgs) {
      const r =
        byConv.get(m.conversation_id) ??
        { inbound: 0, outbound: 0, failed: 0, lastText: "" };
      if (m.direction === "inbound") r.inbound++;
      else {
        r.outbound++;
        if (m.error) r.failed++;
      }
      r.lastText = (m.content ?? "").slice(0, 90);
      byConv.set(m.conversation_id, r);
    }

    // Răspunsurile date de agenți (evenimente wa_agent_reply).
    const repliesByConv = new Map<string, number>();
    for (const r of data?.replies ?? []) {
      if (!r.conversation_id) continue;
      repliesByConv.set(r.conversation_id, (repliesByConv.get(r.conversation_id) ?? 0) + 1);
    }

    const list = convs
      .map((c) => {
        const s = byConv.get(c.id) ?? { inbound: 0, outbound: 0, failed: 0, lastText: "" };
        const inTime = c.last_inbound_at ? new Date(c.last_inbound_at).getTime() : 0;
        const outTime = c.last_outbound_at ? new Date(c.last_outbound_at).getTime() : 0;
        const closed = c.status === "closed" || c.status === "opted_out";
        const abandoned = !closed && !!inTime && inTime < cutoff;
        const awaitingReply = !closed && !!inTime && inTime > outTime;
        return {
          ...c,
          ...s,
          agent: agentName(c.assigned_agent_id),
          lastActivity: Math.max(inTime, outTime),
          abandoned,
          awaitingReply,
        };
      })
      .filter((r) => r.inbound + r.outbound > 0)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    return {
      list,
      totals: {
        primite: list.reduce((s, r) => s + r.inbound, 0),
        trimise: list.reduce((s, r) => s + r.outbound - r.failed, 0),
        esuate: list.reduce((s, r) => s + r.failed, 0),
        abandonate: list.filter((r) => r.abandoned).length,
        deRaspuns: list.filter((r) => r.awaitingReply && !r.abandoned).length,
      },
    };
  }, [data]);

  const reengage = async (conversationId: string) => {
    setReengaging(conversationId);
    const { data: res, error: fnErr } = await supabase.functions.invoke("wa-reengage-abandoned", {
      body: { conversation_id: conversationId, limit: 1 },
    });
    setReengaging(null);
    const payload = (res ?? {}) as { sent?: number; results?: { skipped?: string; meta_error?: string }[] };
    if (fnErr) {
      toast({ title: "Recontactarea nu a plecat", description: fnErr.message, variant: "destructive" });
    } else if (payload.sent) {
      toast({ title: "Recontactare trimisă", description: "Clientul a primit mesajul pe WhatsApp." });
    } else {
      const first = payload.results?.[0];
      toast({
        title: "Recontactarea nu a fost trimisă",
        description:
          first?.skipped === "do_not_contact"
            ? "Clientul a cerut să nu fie contactat."
            : first?.meta_error || "Discuția are activitate recentă sau a fost deja recontactată.",
        variant: "destructive",
      });
    }
    void refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          Nu am putut încărca discuțiile: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { label: "Mesaje primite (7 zile)", value: rows.totals.primite, icon: MessageSquare },
    { label: "Răspunsuri trimise", value: rows.totals.trimise, icon: Send },
    { label: "Așteaptă răspuns", value: rows.totals.deRaspuns, icon: Clock },
    { label: "Discuții abandonate", value: rows.totals.abandonate, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Activitatea discuțiilor din ultimele {DAYS} zile, actualizată în timp real.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "secondary" : "outline"} className="gap-1">
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? "Live" : "Deconectat"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Reîmprospătează
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <c.icon className="w-4 h-4" />
                {c.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discuții live</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio discuție în ultimele {DAYS} zile.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4">Primite</th>
                  <th className="py-2 pr-4">Trimise</th>
                  <th className="py-2 pr-4">Eșuate</th>
                  <th className="py-2 pr-4">Ultimul mesaj client</th>
                  <th className="py-2 pr-4">Stare</th>
                  <th className="py-2">Acțiune</th>
                </tr>
              </thead>
              <tbody>
                {rows.list.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-foreground">
                        {r.wa_profile_name || r.phone_normalized}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-[240px] truncate">
                        {r.lastText}
                      </div>
                    </td>
                    <td className="py-2 pr-4">{r.agent}</td>
                    <td className="py-2 pr-4">{r.inbound}</td>
                    <td className="py-2 pr-4">{r.outbound - r.failed}</td>
                    <td className={`py-2 pr-4 ${r.failed ? "text-destructive font-medium" : ""}`}>
                      {r.failed}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {fmt(r.last_inbound_at)}
                    </td>
                    <td className="py-2 pr-4">
                      {r.abandoned ? (
                        <Badge variant="destructive">Abandonată</Badge>
                      ) : r.awaitingReply ? (
                        <Badge variant="outline">Așteaptă răspuns</Badge>
                      ) : (
                        <Badge variant="secondary">În regulă</Badge>
                      )}
                    </td>
                    <td className="py-2">
                      {r.abandoned && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[36px]"
                          disabled={reengaging === r.id}
                          onClick={() => void reengage(r.id)}
                          aria-label={`Trimite recontactarea către ${r.wa_profile_name || r.phone_normalized}`}
                        >
                          {reengaging === r.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Recontactează
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappLiveDashboard;
