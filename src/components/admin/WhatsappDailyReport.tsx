import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { CalendarDays, MessageSquare, RefreshCw, Send, Tag, Handshake } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Tab „Raport zilnic discuții": pe fiecare zi, câte mesaje au trimis clienții,
 * câte au trimis agenții, câte oferte au fost livrate și câte întâlniri au fost
 * propuse — ca să se vadă imediat unde e activitatea.
 */

type Msg = { direction: string; created_at: string };
type TxEvent = { event: string; status: string | null; created_at: string };

const OFFER_EVENTS = new Set([
  "offer_sent",
  "offer_intro",
  "offer_confirm",
  "offer_followup",
  "property_offer",
  "negotiation",
]);

const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });

export default function WhatsappDailyReport() {
  const qc = useQueryClient();
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const since = useMemo(
    () => new Date(Date.now() - days * 86_400_000).toISOString(),
    [days],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["wa-daily-report", days],
    queryFn: async () => {
      const [msgRes, txRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select("direction, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase
          .from("wa_transaction_events")
          .select("event, status, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
      ]);
      return {
        messages: (msgRes.data ?? []) as Msg[],
        events: (txRes.data ?? []) as TxEvent[],
      };
    },
  });

  useRealtimeChannel("wa-daily-report", [
    {
      event: "*",
      table: "wa_messages",
      handler: () => void qc.invalidateQueries({ queryKey: ["wa-daily-report"] }),
    },
    {
      event: "*",
      table: "wa_transaction_events",
      handler: () => void qc.invalidateQueries({ queryKey: ["wa-daily-report"] }),
    },
  ]);

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { zi: string; clienti: number; agent: number; oferte: number; intalniri: number }
    >();
    const ensure = (iso: string) => {
      const k = dayKey(iso);
      if (!map.has(k)) map.set(k, { zi: k, clienti: 0, agent: 0, oferte: 0, intalniri: 0 });
      return map.get(k)!;
    };
    for (const m of data?.messages ?? []) {
      const row = ensure(m.created_at);
      if (m.direction === "inbound") row.clienti += 1;
      else row.agent += 1;
    }
    for (const e of data?.events ?? []) {
      const row = ensure(e.created_at);
      const delivered = !e.status || e.status === "sent" || e.status === "delivered";
      if (!delivered) continue;
      if (e.event === "offer_meeting") row.intalniri += 1;
      else if (OFFER_EVENTS.has(e.event)) row.oferte += 1;
    }
    return Array.from(map.values());
  }, [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          clienti: acc.clienti + r.clienti,
          agent: acc.agent + r.agent,
          oferte: acc.oferte + r.oferte,
          intalniri: acc.intalniri + r.intalniri,
        }),
        { clienti: 0, agent: 0, oferte: 0, intalniri: 0 },
      ),
    [rows],
  );

  const cards = [
    { label: "Mesaje clienți", value: totals.clienti, icon: MessageSquare },
    { label: "Mesaje agent", value: totals.agent, icon: Send },
    { label: "Oferte livrate", value: totals.oferte, icon: Tag },
    { label: "Întâlniri propuse", value: totals.intalniri, icon: Handshake },
  ];

  return (
    <AdminPageShell
      title="Raport zilnic discuții"
      description="Activitatea pe zile: mesajele clienților, răspunsurile agenților, ofertele livrate și întâlnirile propuse."
      actions={
        <div className="flex items-center gap-2">
          {([7, 14, 30] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
              aria-label={`Arată ultimele ${d} zile`}
            >
              {d} zile
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void qc.invalidateQueries({ queryKey: ["wa-daily-report"] })}
            aria-label="Reîmprospătează raportul"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <c.icon className="h-4 w-4" />
                {c.label}
              </div>
              <p className="mt-1 text-2xl font-semibold">
                {isLoading ? <Skeleton className="h-7 w-12" /> : c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Activitate pe zile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio activitate în perioada aleasă.
            </p>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="zi" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clienti" name="Mesaje clienți" fill="#2563eb" />
                    <Bar dataKey="agent" name="Mesaje agent" fill="#16a34a" />
                    <Bar dataKey="oferte" name="Oferte livrate" fill="#D4AF37" />
                    <Bar dataKey="intalniri" name="Întâlniri propuse" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">Zi</th>
                      <th className="py-2 pr-3">Mesaje clienți</th>
                      <th className="py-2 pr-3">Mesaje agent</th>
                      <th className="py-2 pr-3">Oferte livrate</th>
                      <th className="py-2">Întâlniri propuse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows].reverse().map((r) => (
                      <tr key={r.zi} className="border-t">
                        <td className="py-2 pr-3 font-medium">{r.zi}</td>
                        <td className="py-2 pr-3">{r.clienti}</td>
                        <td className="py-2 pr-3">{r.agent}</td>
                        <td className="py-2 pr-3">{r.oferte}</td>
                        <td className="py-2">{r.intalniri}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
