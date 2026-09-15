import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownLeft, ArrowUpRight, Bot, Loader2, MessageSquare, RefreshCw, Send, XCircle,
} from "lucide-react";

/**
 * Tab „Raport WhatsApp": mesaje trimise, mesaje primite și răspunsuri automate,
 * cu posibilitatea de a trimite tot raportul direct pe WhatsApp echipei.
 */

type Msg = {
  direction: string;
  error: string | null;
  tool_call: Record<string, unknown> | null;
  created_at: string;
};

const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });

export default function WhatsappActivityReport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [hours, setHours] = useState<24 | 168 | 720>(24);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const since = useMemo(
    () => new Date(Date.now() - hours * 3600 * 1000).toISOString(),
    [hours],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["wa-activity-report", hours],
    queryFn: async () => {
      const [msgRes, autoRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select("direction, error, tool_call, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase
          .from("make_lead_events")
          .select("event, created_at")
          .like("event", "wa_auto%")
          .gte("created_at", since)
          .limit(5000),
      ]);
      return {
        messages: (msgRes.data ?? []) as Msg[],
        autoEvents: (autoRes.data ?? []) as { event: string; created_at: string }[],
      };
    },
  });

  useRealtimeChannel("wa-activity-report", [
    {
      event: "*",
      table: "wa_messages",
      handler: () => void qc.invalidateQueries({ queryKey: ["wa-activity-report"] }),
    },
  ]);

  const stats = useMemo(() => {
    const msgs = data?.messages ?? [];
    const inbound = msgs.filter((m) => m.direction === "inbound").length;
    const outbound = msgs.filter((m) => m.direction === "outbound");
    const sent = outbound.filter((m) => !m.error).length;
    const failed = outbound.length - sent;
    const tagged = outbound.filter(
      (m) => m.tool_call && (m.tool_call as { auto_reply?: string }).auto_reply,
    ).length;
    const auto = Math.max(tagged, data?.autoEvents.length ?? 0);
    return { inbound, sent, failed, auto, agent: Math.max(sent - auto, 0) };
  }, [data]);

  const perDay = useMemo(() => {
    const map = new Map<string, { zi: string; primite: number; trimise: number; automate: number }>();
    for (const m of data?.messages ?? []) {
      const k = dayKey(m.created_at);
      if (!map.has(k)) map.set(k, { zi: k, primite: 0, trimise: 0, automate: 0 });
      const row = map.get(k)!;
      if (m.direction === "inbound") row.primite += 1;
      else if (!m.error) {
        row.trimise += 1;
        if ((m.tool_call as { auto_reply?: string } | null)?.auto_reply) row.automate += 1;
      }
    }
    return Array.from(map.values()).reverse();
  }, [data]);

  const sendOnWhatsapp = async () => {
    const to = phone.replace(/[^\d]/g, "");
    if (to.length < 10) {
      toast({
        title: "Număr incomplet",
        description: "Scrieți numărul cu prefixul de țară, ex. 40799069256.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("wa-activity-report", {
        body: { hours, to, send: true },
      });
      if (error) throw error;
      if (res?.delivered) {
        toast({ title: "Raport trimis pe WhatsApp", description: `Livrat către +${to}.` });
      } else {
        toast({
          title: "Raportul nu a plecat",
          description:
            "WhatsApp permite mesaje text doar în 24 de ore după ultimul mesaj primit de la acel număr. Scrieți-ne întâi de pe telefon și încercați din nou.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Nu am putut trimite raportul",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const cards = [
    { label: "Mesaje primite", value: stats.inbound, icon: ArrowDownLeft },
    { label: "Mesaje trimise", value: stats.sent, icon: ArrowUpRight },
    { label: "Răspunsuri automate", value: stats.auto, icon: Bot },
    { label: "Răspunsuri agenți", value: stats.agent, icon: MessageSquare },
  ];

  return (
    <AdminPageShell
      title="Raport WhatsApp"
      description="Mesaje trimise, mesaje primite și răspunsuri automate — cu tot raportul trimis direct pe WhatsApp."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {([24, 168, 720] as const).map((h) => (
            <Button
              key={h}
              size="sm"
              variant={hours === h ? "default" : "outline"}
              onClick={() => setHours(h)}
              aria-label={h === 24 ? "Ultimele 24 de ore" : `Ultimele ${h / 24} zile`}
            >
              {h === 24 ? "24h" : `${h / 24} zile`}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void qc.invalidateQueries({ queryKey: ["wa-activity-report"] })}
            aria-label="Reîmprospătează raportul WhatsApp"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      {stats.failed > 0 && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <XCircle className="h-4 w-4" /> {stats.failed} mesaje nu au putut fi livrate în această perioadă.
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Trimite raportul pe WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="40799069256"
              inputMode="tel"
              aria-label="Numărul de WhatsApp pe care trimitem raportul"
            />
            <Button onClick={() => void sendOnWhatsapp()} disabled={sending} className="min-h-12">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-2">Trimite raportul</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Raportul pleacă pe WhatsApp cu toate cifrele din perioada aleasă. WhatsApp acceptă
            mesaje text doar în 24 de ore după ultimul mesaj primit de la acel număr.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activitate pe zile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : perDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio activitate în perioada aleasă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Zi</th>
                    <th className="py-2 pr-3">Primite</th>
                    <th className="py-2 pr-3">Trimise</th>
                    <th className="py-2">Automate</th>
                  </tr>
                </thead>
                <tbody>
                  {perDay.map((r) => (
                    <tr key={r.zi} className="border-t">
                      <td className="py-2 pr-3 font-medium">{r.zi}</td>
                      <td className="py-2 pr-3">{r.primite}</td>
                      <td className="py-2 pr-3">{r.trimise}</td>
                      <td className="py-2">{r.automate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
