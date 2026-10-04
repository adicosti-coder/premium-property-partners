import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Phone } from "lucide-react";

/** Apelurile cerute de clienți („Mă puteți suna?”): subiect, interval și detaliile notate. */
const TOPIC: Record<string, string> = {
  client_call_viewing: "Vizionare", client_call_price: "Preț", client_call_fee: "Comision", client_call_time: "General",
};
const after = (msgs: any[], kind: string) => {
  const i = msgs.map((m) => m.tool_call?.auto_reply).lastIndexOf(kind);
  if (i < 0) return null;
  return msgs.slice(i + 1).find((m) => m.direction === "inbound")?.content?.trim() || null;
};

export default function WhatsappClientCalls() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["wa-client-calls", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: noted } = await (supabase as any).from("wa_messages")
        .select("id, conversation_id, created_at").contains("tool_call", { auto_reply: "client_call_noted" })
        .gte("created_at", since).order("created_at", { ascending: false }).limit(200);
      const ids = [...new Set((noted ?? []).map((m: any) => m.conversation_id))];
      if (!ids.length) return [];
      const [{ data: msgs }, { data: convs }] = await Promise.all([
        (supabase as any).from("wa_messages").select("conversation_id, direction, content, tool_call, created_at")
          .in("conversation_id", ids).order("created_at", { ascending: true }).limit(5000),
        (supabase as any).from("wa_conversations").select("id, phone_normalized, wa_profile_name").in("id", ids),
      ]);
      const cMap = new Map((convs ?? []).map((c: any) => [c.id, c]));
      return (noted ?? []).map((n: any) => {
        const conv = (msgs ?? []).filter((m: any) => m.conversation_id === n.conversation_id && m.created_at <= n.created_at);
        const topicKind = [...conv].reverse().find((m: any) => TOPIC[m.tool_call?.auto_reply])?.tool_call?.auto_reply;
        const zoneKinds = ["client_viewing_ask_zone", "client_price_ask_zone", "client_rent_ask_zone", "client_hotel_income_ask_zone"];
        const zone = zoneKinds.map((k) => after(conv, k)).find(Boolean) || null;
        const interval = [...conv].reverse().find((m: any) => m.direction === "inbound")?.content || null;
        return {
          id: n.id, created_at: n.created_at, conv: cMap.get(n.conversation_id) as any,
          topic: TOPIC[topicKind] || "General", interval, zone,
          rooms: after(conv, "client_viewing_ask_rooms") || after(conv, "client_obj_followup_rooms"),
          day: after(conv, "client_viewing_ask_day"), time: after(conv, "client_viewing_ask_time"),
        };
      });
    },
  });

  return (
    <AdminPageShell
      title="Apeluri de făcut"
      description="Clienții care au cerut „Mă puteți suna?”, cu subiectul, intervalul ales și detaliile notate de Andrei."
      actions={<div className="flex gap-1">{([7, 30, 90] as const).map((d) => (
        <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>
      ))}</div>}
    >
      <Card><CardContent className="pt-6 space-y-3">
        {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nicio cerere de apel în perioada aleasă.</p>
        ) : data.map((c: any) => (
          <div key={c.id} className="rounded-md border p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(c.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</span>
                <span className="font-medium text-foreground">{c.conv?.wa_profile_name || c.conv?.phone_normalized || "—"}</span>
                <Badge variant="secondary">{c.topic}</Badge>
              </div>
              <p className="text-sm text-foreground">Interval: <b>{c.interval || "—"}</b></p>
              <p className="text-xs text-muted-foreground">Zonă: {c.zone || "—"} · Camere: {c.rooms || "—"} · Zi: {c.day || "—"} · Ora: {c.time || "—"}</p>
            </div>
            {c.conv?.phone_normalized && (
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="h-12">
                  <a href={`tel:${c.conv.phone_normalized.replace(/[^\d+]/g, "")}`} aria-label={`Sună ${c.conv.wa_profile_name || c.conv.phone_normalized}`}><Phone className="mr-2 h-4 w-4" />Sună</a>
                </Button>
                <Button asChild size="sm" className="h-12">
                  <a href={`https://wa.me/${c.conv.phone_normalized.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Deschide WhatsApp</a>
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent></Card>
    </AdminPageShell>
  );
}
