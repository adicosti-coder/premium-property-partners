import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Msg = {
  id: string;
  conversation_id: string;
  direction: string;
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
};

const DAYS = 14;

const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });

const WhatsappConversationsAnalytics = () => {
  const since = useMemo(
    () => new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString(),
    [],
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["wa-conversations-analytics", since],
    queryFn: async () => {
      const [msgRes, convRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select("id, conversation_id, direction, error, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase
          .from("wa_conversations")
          .select("id, phone_normalized, wa_profile_name, status, last_inbound_at, last_outbound_at")
          .order("updated_at", { ascending: false })
          .limit(500),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (convRes.error) throw convRes.error;
      return {
        messages: (msgRes.data ?? []) as Msg[],
        conversations: (convRes.data ?? []) as Conv[],
      };
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const messages = data?.messages ?? [];
    const conversations = data?.conversations ?? [];
    const cutoff = Date.now() - 24 * 3600 * 1000;

    const outbound = messages.filter((m) => m.direction === "outbound");
    const failed = outbound.filter((m) => m.error);
    const inbound = messages.filter((m) => m.direction === "inbound");

    const active = conversations.filter((c) => {
      const last = Math.max(
        c.last_inbound_at ? new Date(c.last_inbound_at).getTime() : 0,
        c.last_outbound_at ? new Date(c.last_outbound_at).getTime() : 0,
      );
      return last >= cutoff && c.status !== "closed" && c.status !== "opted_out";
    });

    const abandonedList = conversations.filter(
      (c) =>
        c.last_inbound_at &&
        new Date(c.last_inbound_at).getTime() < cutoff &&
        c.status !== "closed" &&
        c.status !== "opted_out",
    );

    // Serie pe zile
    const buckets = new Map<
      string,
      { day: string; livrate: number; esuate: number; primite: number }
    >();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString();
      const key = dayKey(d);
      buckets.set(key, { day: key, livrate: 0, esuate: 0, primite: 0 });
    }
    for (const m of messages) {
      const key = dayKey(m.created_at);
      const b = buckets.get(key);
      if (!b) continue;
      if (m.direction === "inbound") b.primite++;
      else if (m.error) b.esuate++;
      else b.livrate++;
    }

    return {
      activeCount: active.length,
      delivered: outbound.length - failed.length,
      failed: failed.length,
      inbound: inbound.length,
      abandoned: abandonedList.length,
      abandonedList: abandonedList.slice(0, 10),
      failedRecent: failed.slice(-10).reverse(),
      series: [...buckets.values()],
      convById: new Map(conversations.map((c) => [c.id, c])),
    };
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
          Nu am putut încărca datele conversațiilor: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { label: "Conversații active (24h)", value: stats.activeCount, icon: MessageSquare },
    { label: "Mesaje livrate (14 zile)", value: stats.delivered, icon: CheckCircle2 },
    { label: "Mesaje eșuate (14 zile)", value: stats.failed, icon: XCircle },
    { label: "Conversații abandonate", value: stats.abandoned, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Mesajele de la clienți, cele livrate și cele eșuate, pe ultimele {DAYS} de zile.
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
          <CardTitle className="text-base">Evoluție pe zile</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="primite" name="De la clienți" fill="hsl(var(--primary))" />
              <Bar dataKey="livrate" name="Livrate" fill="hsl(var(--chart-2, var(--muted-foreground)))" />
              <Bar dataKey="esuate" name="Eșuate" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultimele mesaje eșuate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.failedRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun mesaj eșuat.</p>
            ) : (
              stats.failedRecent.map((m) => {
                const c = stats.convById.get(m.conversation_id);
                return (
                  <div key={m.id} className="rounded border border-border p-2 text-sm">
                    <div className="font-medium text-foreground">
                      {c?.wa_profile_name || c?.phone_normalized || "necunoscut"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("ro-RO")}
                    </div>
                    <div className="text-xs text-destructive break-words">{m.error}</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversații abandonate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.abandonedList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nicio conversație abandonată — toți clienții au primit răspuns.
              </p>
            ) : (
              stats.abandonedList.map((c) => (
                <div key={c.id} className="rounded border border-border p-2 text-sm">
                  <div className="font-medium text-foreground">
                    {c.wa_profile_name || c.phone_normalized}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ultimul mesaj al clientului:{" "}
                    {c.last_inbound_at
                      ? new Date(c.last_inbound_at).toLocaleString("ro-RO")
                      : "—"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsappConversationsAnalytics;
