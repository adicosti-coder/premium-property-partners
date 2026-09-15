import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type Msg = { conversation_id: string; direction: string; created_at: string };
type Conv = {
  id: string;
  phone_normalized: string;
  wa_profile_name: string | null;
  assigned_agent_id: string | null;
};
type Tx = {
  conversation_id: string | null;
  event: string;
  property_name: string | null;
  created_at: string;
};
type Agent = { id: string; name: string };

const DAYS = 30;

/** Etichete în română pentru sursa discuției. */
const SOURCE_LABEL: Record<string, string> = {
  anunt: "Anunț",
  contact: "Mesaj de contact",
  recontactare: "Recontactare",
};

const fmtDuration = (ms: number) => {
  if (!ms || ms < 0) return "—";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 24) return rest ? `${h} h ${rest} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} zile ${h % 24} h`;
};

/**
 * De unde vin discuțiile (anunț, mesaj de contact, recontactare) și cât durează,
 * cu totaluri pe fiecare apartament și pe fiecare agent.
 */
const WhatsappConversationSources = () => {
  const since = useMemo(
    () => new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString(),
    [],
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["wa-conversation-sources", since],
    queryFn: async () => {
      const [msgRes, convRes, txRes, reRes, agentRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select("conversation_id, direction, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(6000),
        supabase
          .from("wa_conversations")
          .select("id, phone_normalized, wa_profile_name, assigned_agent_id")
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("wa_transaction_events")
          .select("conversation_id, event, property_name, created_at")
          .gte("created_at", since)
          .limit(3000),
        supabase
          .from("make_lead_events")
          .select("conversation_id, event, created_at")
          .eq("event", "wa_reengage_sent")
          .gte("created_at", since)
          .limit(2000),
        supabase.from("wa_agents").select("id, name"),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (convRes.error) throw convRes.error;
      return {
        messages: (msgRes.data ?? []) as Msg[],
        conversations: (convRes.data ?? []) as Conv[],
        tx: (txRes.data ?? []) as Tx[],
        reengaged: (reRes.data ?? []) as { conversation_id: string | null }[],
        agents: (agentRes.data ?? []) as Agent[],
      };
    },
    staleTime: 60_000,
  });

  const view = useMemo(() => {
    const msgs = data?.messages ?? [];
    const convs = data?.conversations ?? [];
    const tx = data?.tx ?? [];
    const agents = data?.agents ?? [];
    const agentName = (id: string | null) =>
      agents.find((a) => a.id === id)?.name ?? "Nealocat";

    const span = new Map<string, { first: number; last: number; inbound: number; outbound: number }>();
    for (const m of msgs) {
      const t = new Date(m.created_at).getTime();
      const s = span.get(m.conversation_id) ?? { first: t, last: t, inbound: 0, outbound: 0 };
      s.first = Math.min(s.first, t);
      s.last = Math.max(s.last, t);
      if (m.direction === "inbound") s.inbound++;
      else s.outbound++;
      span.set(m.conversation_id, s);
    }

    const propByConv = new Map<string, string>();
    const fromListing = new Set<string>();
    for (const t of tx) {
      if (!t.conversation_id) continue;
      if (t.property_name && !propByConv.has(t.conversation_id)) {
        propByConv.set(t.conversation_id, t.property_name);
      }
      if (t.event === "property_offer" || t.event === "listing_opened") {
        fromListing.add(t.conversation_id);
      }
    }
    const reengaged = new Set(
      (data?.reengaged ?? []).map((r) => r.conversation_id).filter(Boolean) as string[],
    );

    const rows = convs
      .filter((c) => span.has(c.id))
      .map((c) => {
        const s = span.get(c.id)!;
        const source = fromListing.has(c.id)
          ? "anunt"
          : reengaged.has(c.id)
            ? "recontactare"
            : "contact";
        return {
          id: c.id,
          client: c.wa_profile_name || c.phone_normalized,
          source,
          property: propByConv.get(c.id) ?? "—",
          agent: agentName(c.assigned_agent_id),
          durationMs: s.last - s.first,
          inbound: s.inbound,
          outbound: s.outbound,
          last: s.last,
        };
      })
      .sort((a, b) => b.last - a.last);

    const group = (key: "property" | "agent") => {
      const m = new Map<string, { name: string; conversatii: number; total: number; anunt: number; contact: number; recontactare: number }>();
      for (const r of rows) {
        const name = r[key];
        const g = m.get(name) ?? { name, conversatii: 0, total: 0, anunt: 0, contact: 0, recontactare: 0 };
        g.conversatii++;
        g.total += r.durationMs;
        g[r.source as "anunt" | "contact" | "recontactare"]++;
        m.set(name, g);
      }
      return [...m.values()]
        .map((g) => ({ ...g, medie: g.conversatii ? g.total / g.conversatii : 0 }))
        .sort((a, b) => b.conversatii - a.conversatii);
    };

    return { rows, byProperty: group("property"), byAgent: group("agent") };
  }, [data]);

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

  const GroupCard = ({
    title,
    rows,
    label,
  }: {
    title: string;
    rows: typeof view.byProperty;
    label: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio discuție încă.</p>
        ) : (
          rows.map((g) => (
            <div key={g.name} className="rounded border border-border p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{g.name}</span>
                <span className="text-xs text-muted-foreground">
                  {g.conversatii} {g.conversatii === 1 ? "discuție" : "discuții"}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                <span>Durată medie: <span className="text-foreground">{fmtDuration(g.medie)}</span></span>
                <span>Din anunț: <span className="text-foreground">{g.anunt}</span></span>
                <span>Din contact: <span className="text-foreground">{g.contact}</span></span>
                <span>Recontactate: <span className="text-foreground">{g.recontactare}</span></span>
              </div>
              <span className="sr-only">{label}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          De unde a pornit fiecare discuție și cât a durat, pe ultimele {DAYS} de zile.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Reîmprospătează
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discuții, sursă și durată</CardTitle>
        </CardHeader>
        <CardContent>
          {view.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio discuție în perioada aleasă.</p>
          ) : (
            <>
              {/* Telefon: fiecare discuție într-un card citibil */}
              <div className="space-y-2 md:hidden">
                {view.rows.map((r) => (
                  <div key={r.id} className="rounded border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{r.client}</span>
                      <Badge variant="secondary" className="shrink-0">
                        {SOURCE_LABEL[r.source]}
                      </Badge>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Durată: <span className="text-foreground">{fmtDuration(r.durationMs)}</span></span>
                      <span>Agent: <span className="text-foreground">{r.agent}</span></span>
                      <span>Primite: <span className="text-foreground">{r.inbound}</span></span>
                      <span>Trimise: <span className="text-foreground">{r.outbound}</span></span>
                      <span className="col-span-2">Apartament: <span className="text-foreground">{r.property}</span></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Sursă</th>
                      <th className="py-2 pr-4">Apartament</th>
                      <th className="py-2 pr-4">Agent</th>
                      <th className="py-2 pr-4">Durata discuției</th>
                      <th className="py-2 pr-4">Primite</th>
                      <th className="py-2">Trimise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-2 pr-4 font-medium text-foreground">{r.client}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary">{SOURCE_LABEL[r.source]}</Badge>
                        </td>
                        <td className="py-2 pr-4">{r.property}</td>
                        <td className="py-2 pr-4">{r.agent}</td>
                        <td className="py-2 pr-4">{fmtDuration(r.durationMs)}</td>
                        <td className="py-2 pr-4">{r.inbound}</td>
                        <td className="py-2">{r.outbound}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <GroupCard title="Pe apartament" rows={view.byProperty} label="pe apartament" />
        <GroupCard title="Pe agent" rows={view.byAgent} label="pe agent" />
      </div>
    </div>
  );
};

export default WhatsappConversationSources;
