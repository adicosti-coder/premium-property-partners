import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Handshake, Home, Loader2, MessageSquare, RefreshCw, Send, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Dashboard de tranzacții WhatsApp: conversații intrate în pasul de tranzacție,
 * apartamentele alese de clienți și anunțurile deschise, cu grafic pe zile.
 */

type TxRow = {
  id: string;
  conversation_id: string | null;
  phone_normalized: string;
  property_id: string | null;
  property_name: string | null;
  property_url: string | null;
  price: number | null;
  event: string;
  status: string;
  error: string | null;
  source: string;
  agent_id: string | null;
  created_at: string;
};

type AgentRow = { id: string; name: string };

type InboundRow = { id: string; conversation_id: string | null; created_at: string };

/** Răspunsurile agenților, salvate ca evenimente `wa_agent_reply`. */
type AgentReplyRow = { id: string; conversation_id: string | null; created_at: string };

const DAYS = 14;

/** Evenimentele care înseamnă „ofertă livrată clientului pe WhatsApp". */
const OFFER_EVENTS = ["offer_intro", "offer_followup", "offer_confirm", "negotiation"];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });

export default function WhatsappTransactionsDashboard() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [agentReplies, setAgentReplies] = useState<AgentReplyRow[]>([]);
  const [pickedProperty, setPickedProperty] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
    const [txRes, agentRes, inRes, replyRes] = await Promise.all([
      supabase
        .from("wa_transaction_events")
        .select(
          "id, conversation_id, phone_normalized, property_id, property_name, property_url, price, event, status, error, source, agent_id, created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("wa_agents").select("id, name"),
      supabase
        .from("wa_messages")
        .select("id, conversation_id, created_at")
        .eq("direction", "inbound")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("make_lead_events")
        .select("id, conversation_id, created_at")
        .eq("event", "wa_agent_reply")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    if (txRes.error) setError(txRes.error.message);
    else {
      setError(null);
      setRows((txRes.data ?? []) as TxRow[]);
    }
    setAgents((agentRes.data ?? []) as AgentRow[]);
    setInbound((inRes.data ?? []) as InboundRow[]);
    setAgentReplies((replyRes.data ?? []) as AgentReplyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Anunțurile apărute în tranzacții, pentru selectorul dashboardului pe anunț. */
  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.property_id) map.set(r.property_id, r.property_name || "Apartament");
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  useEffect(() => {
    if (!pickedProperty && propertyOptions.length > 0) setPickedProperty(propertyOptions[0].id);
  }, [propertyOptions, pickedProperty]);

  /** Dashboard pe anunț: conversații, mesaje de la clienți, alegeri de apartament. */
  const propertyReport = useMemo(() => {
    const events = rows.filter((r) => r.property_id === pickedProperty);
    const convIds = new Set(events.map((e) => e.conversation_id).filter(Boolean) as string[]);
    const msgs = inbound.filter((m) => m.conversation_id && convIds.has(m.conversation_id));
    const replies = agentReplies.filter((m) => m.conversation_id && convIds.has(m.conversation_id));
    const isDeliveredOffer = (e: TxRow) =>
      OFFER_EVENTS.includes(e.event) && e.status !== "failed" && !e.error;
    const buckets = new Map<
      string,
      {
        day: string; alegeri: number; mesaje: number; deschise: number;
        discutii: number; raspunsuri: number; oferte: number;
      }
    >();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString();
      buckets.set(dayKey(d), {
        day: dayKey(d), alegeri: 0, mesaje: 0, deschise: 0, discutii: 0, raspunsuri: 0, oferte: 0,
      });
    }
    for (const e of events) {
      const b = buckets.get(dayKey(e.created_at));
      if (!b) continue;
      if (e.event === "offer_sent") b.alegeri += 1;
      else if (e.event === "listing_opened") b.deschise += 1;
      if (isDeliveredOffer(e)) b.oferte += 1;
    }
    // Mesajele clienților pe zi + discuțiile deschise (prima zi în care clientul a scris).
    const firstDay = new Map<string, string>();
    for (const m of [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )) {
      const b = buckets.get(dayKey(m.created_at));
      if (b) b.mesaje += 1;
      const conv = m.conversation_id as string;
      if (!firstDay.has(conv)) firstDay.set(conv, dayKey(m.created_at));
    }
    for (const day of firstDay.values()) {
      const b = buckets.get(day);
      if (b) b.discutii += 1;
    }
    // Răspunsurile agenților pe zi, lângă mesajele clienților.
    for (const r of replies) {
      const b = buckets.get(dayKey(r.created_at));
      if (b) b.raspunsuri += 1;
    }
    return {
      name: events[0]?.property_name ?? "—",
      url: events.find((e) => e.property_url)?.property_url ?? null,
      conversations: convIds.size,
      clientMessages: msgs.length,
      agentReplies: replies.length,
      choices: events.filter((e) => e.event === "offer_sent").length,
      opened: events.filter((e) => e.event === "listing_opened").length,
      offers: events.filter(isDeliveredOffer).length,
      chart: Array.from(buckets.values()),
    };
  }, [rows, inbound, agentReplies, pickedProperty]);

  /** Raport pe agent: discuții în tranzacție, apartamente alese, anunțuri deschise, eșuate. */
  const byAgent = useMemo(() => {
    const map = new Map<
      string,
      { name: string; conversations: Set<string>; properties: Set<string>; sent: number; opened: number; failed: number }
    >();
    for (const r of rows) {
      const key = r.agent_id ?? "none";
      const name = r.agent_id
        ? agents.find((a) => a.id === r.agent_id)?.name ?? "Agent"
        : "Nealocat";
      const cur = map.get(key) ?? {
        name,
        conversations: new Set<string>(),
        properties: new Set<string>(),
        sent: 0,
        opened: 0,
        failed: 0,
      };
      if (r.conversation_id) cur.conversations.add(r.conversation_id);
      if (r.event === "offer_sent") {
        cur.sent += 1;
        if (r.property_id) cur.properties.add(r.property_id);
      } else if (r.event === "listing_opened") cur.opened += 1;
      else if (r.event === "offer_failed") cur.failed += 1;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((a) => ({
        name: a.name,
        conversations: a.conversations.size,
        properties: a.properties.size,
        sent: a.sent,
        opened: a.opened,
        failed: a.failed,
      }))
      .sort((a, b) => b.conversations - a.conversations || b.sent - a.sent);
  }, [rows, agents]);

  const stats = useMemo(() => {
    const conversations = new Set(
      rows.filter((r) => r.conversation_id).map((r) => r.conversation_id as string),
    );
    const properties = new Set(
      rows.filter((r) => r.event === "offer_sent" && r.property_id).map((r) => r.property_id as string),
    );
    return {
      conversations: conversations.size,
      offersSent: rows.filter((r) => r.event === "offer_sent").length,
      offersFailed: rows.filter((r) => r.event === "offer_failed").length,
      opened: rows.filter((r) => r.event === "listing_opened").length,
      properties: properties.size,
    };
  }, [rows]);

  const chart = useMemo(() => {
    const buckets = new Map<string, { day: string; trimise: number; deschise: number; esuate: number }>();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString();
      buckets.set(dayKey(d), { day: dayKey(d), trimise: 0, deschise: 0, esuate: 0 });
    }
    for (const r of rows) {
      const b = buckets.get(dayKey(r.created_at));
      if (!b) continue;
      if (r.event === "offer_sent") b.trimise += 1;
      else if (r.event === "listing_opened") b.deschise += 1;
      else if (r.event === "offer_failed") b.esuate += 1;
    }
    return Array.from(buckets.values());
  }, [rows]);

  const topProperties = useMemo(() => {
    const map = new Map<string, { name: string; url: string | null; count: number }>();
    for (const r of rows) {
      if (r.event !== "offer_sent" || !r.property_id) continue;
      const prev = map.get(r.property_id);
      map.set(r.property_id, {
        name: r.property_name || "Apartament",
        url: r.property_url,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [rows]);

  /**
   * Pasul de negociere: discuțiile în care clientul a ales apartamentul, dar
   * încă nu a primit oferta cu pașii următori sau nu a intrat în negociere.
   */
  const pendingSteps = useMemo(() => {
    const latestOffer = new Map<string, TxRow>();
    for (const r of rows) {
      if (r.event !== "offer_sent" || !r.conversation_id) continue;
      if (!latestOffer.has(r.conversation_id)) latestOffer.set(r.conversation_id, r);
    }
    return Array.from(latestOffer.values()).map((r) => {
      const after = rows.filter(
        (x) =>
          x.conversation_id === r.conversation_id &&
          new Date(x.created_at).getTime() >= new Date(r.created_at).getTime(),
      );
      return {
        row: r,
        hasFollowup: after.some((x) => x.event === "offer_followup" && x.status !== "failed"),
        hasNegotiation: after.some((x) => x.event === "negotiation" && x.status !== "failed"),
      };
    });
  }, [rows]);

  const runStep = async (
    action: "offer_followup" | "negotiation",
    row: TxRow,
  ) => {
    setBusyStep(`${action}:${row.id}`);
    const { data, error: fnErr } = await supabase.functions.invoke("make-agent-bridge", {
      body: {
        action,
        phone: row.phone_normalized,
        conversation_id: row.conversation_id,
        property_id: row.property_id,
      },
    });
    setBusyStep(null);
    const res = (data ?? {}) as Record<string, unknown>;
    if (fnErr || res.delivered === false) {
      toast({
        title: action === "offer_followup" ? "Oferta nu a plecat" : "Mesajul de negociere nu a plecat",
        description:
          fnErr?.message ||
          String(res.error ?? "Fereastra de 24h poate fi închisă — clientul trebuie să scrie din nou."),
        variant: "destructive",
      });
    } else {
      toast({
        title: action === "offer_followup" ? "Ofertă trimisă" : "Negociere pornită",
        description: "Mesajul a plecat în aceeași discuție pe WhatsApp.",
      });
    }
    void load();
  };

  const cards = [
    { label: "Conversații în tranzacție", value: stats.conversations, icon: MessageSquare },
    { label: "Apartamente alese", value: stats.properties, icon: Home },
    { label: "Anunțuri trimise", value: stats.offersSent, icon: TrendingUp },
    { label: "Anunțuri deschise", value: stats.opened, icon: ExternalLink },
  ];

  return (
    <AdminPageShell
      title="Tranzacții WhatsApp"
      description="Conversațiile ajunse la pasul de tranzacție, apartamentele alese de clienți și anunțurile deschise (ultimele 14 zile)."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      }
    >
      {error && <p className="mb-4 text-sm text-destructive">Nu am putut încărca datele: {error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <c.icon className="h-4 w-4" />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pasul de negociere: discuția nu se oprește la alegerea apartamentului. */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Pasul de negociere
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Clienții care au ales un apartament. Trimite oferta cu pașii următori sau intră în
            negociere, ca discuția să nu se oprească.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : pendingSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio discuție ajunsă la alegerea apartamentului.
            </p>
          ) : (
            pendingSteps.map(({ row, hasFollowup, hasNegotiation }) => (
              <div
                key={row.id}
                className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {row.property_name || "Apartament"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.phone_normalized} · {fmt(row.created_at)}
                    {" · Agent: "}
                    {agents.find((a) => a.id === row.agent_id)?.name ?? "nealocat"}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge variant={hasFollowup ? "default" : "outline"}>Ofertă</Badge>
                    <Badge variant={hasNegotiation ? "default" : "outline"}>Negociere</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={hasFollowup ? "outline" : "default"}
                    className="min-h-[40px]"
                    disabled={busyStep === `offer_followup:${row.id}`}
                    onClick={() => void runStep("offer_followup", row)}
                    aria-label={`Trimite oferta automată pentru ${row.property_name ?? "apartament"}`}
                  >
                    {busyStep === `offer_followup:${row.id}` ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Trimite oferta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[40px]"
                    disabled={busyStep === `negotiation:${row.id}`}
                    onClick={() => void runStep("negotiation", row)}
                    aria-label={`Pornește negocierea pentru ${row.property_name ?? "apartament"}`}
                  >
                    {busyStep === `negotiation:${row.id}` ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Handshake className="h-4 w-4 mr-2" />
                    )}
                    Intră în negociere
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evoluție pe zile</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trimise" name="Anunțuri trimise" fill="hsl(var(--primary))" />
                <Bar dataKey="deschise" name="Anunțuri deschise" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="esuate" name="Eșuate" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2 flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Dashboard pe anunț</CardTitle>
          {propertyOptions.length > 0 && (
            <Select value={pickedProperty} onValueChange={setPickedProperty}>
              <SelectTrigger className="w-[260px]" aria-label="Alege anunțul">
                <SelectValue placeholder="Alege anunțul" />
              </SelectTrigger>
              <SelectContent>
                {propertyOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : propertyOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Niciun anunț ales de clienți în ultimele {DAYS} zile.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 text-sm">
                <Home className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">{propertyReport.name}</span>
                {propertyReport.url && (
                  <a
                    href={propertyReport.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Deschide anunțul ${propertyReport.name}`}
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-4">
                {[
                  { label: "Conversații", value: propertyReport.conversations },
                  { label: "Mesaje de la clienți", value: propertyReport.clientMessages },
                  { label: "Răspunsuri agent", value: propertyReport.agentReplies },
                  { label: "Oferte livrate", value: propertyReport.offers },
                  { label: "Alegeri de apartament", value: propertyReport.choices },
                  { label: "Anunțuri deschise", value: propertyReport.opened },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propertyReport.chart}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="oferte" name="Oferte livrate" fill="hsl(var(--primary))" />
                    <Bar dataKey="alegeri" name="Alegeri de apartament" fill="hsl(var(--chart-2, var(--primary)))" />
                    <Bar dataKey="mesaje" name="Mesaje de la clienți" fill="hsl(var(--muted-foreground))" />
                    <Bar dataKey="raspunsuri" name="Răspunsuri agent" fill="hsl(var(--secondary-foreground))" />
                    <Bar dataKey="discutii" name="Discuții deschise" fill="hsl(var(--accent))" />
                    <Bar dataKey="deschise" name="Anunțuri deschise" fill="hsl(var(--accent-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>


      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Raport pe agent</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : byAgent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio tranzacție în ultimele {DAYS} zile.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Agent</th>
                    <th className="py-2 pr-4 font-medium">Conversații</th>
                    <th className="py-2 pr-4 font-medium">Apartamente alese</th>
                    <th className="py-2 pr-4 font-medium">Anunțuri trimise</th>
                    <th className="py-2 pr-4 font-medium">Anunțuri deschise</th>
                    <th className="py-2 font-medium">Eșuate</th>
                  </tr>
                </thead>
                <tbody>
                  {byAgent.map((a) => (
                    <tr key={a.name} className="border-t">
                      <td className="py-2 pr-4">{a.name}</td>
                      <td className="py-2 pr-4">{a.conversations}</td>
                      <td className="py-2 pr-4">{a.properties}</td>
                      <td className="py-2 pr-4">{a.sent}</td>
                      <td className="py-2 pr-4">{a.opened}</td>
                      <td className="py-2">
                        {a.failed > 0 ? <Badge variant="destructive">{a.failed}</Badge> : "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Apartamentele cele mai alese</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : topProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun apartament ales încă.</p>
            ) : (
              topProperties.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{p.count}</Badge>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Deschide anunțul ${p.name}`}
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ultimele evenimente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio tranzacție încă.</p>
            ) : (
              rows.slice(0, 30).map((r) => (
                <div key={r.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{r.property_name || "—"}</span>
                    <Badge variant={r.event === "offer_failed" ? "destructive" : "secondary"}>
                      {r.event === "offer_sent"
                        ? "anunț trimis"
                        : r.event === "listing_opened"
                          ? "anunț deschis"
                          : "eșuat"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.phone_normalized} · {fmt(r.created_at)} · {r.source}
                  </p>
                  {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
