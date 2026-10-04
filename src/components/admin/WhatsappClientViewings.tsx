import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Phone } from "lucide-react";

/** Vizionări confirmate de clienți prin fluxul Andrei (zonă → camere → zi → oră). */
const STEPS = ["client_viewing_ask_zone", "client_viewing_ask_rooms", "client_viewing_ask_day", "client_viewing_ask_time"] as const;

function answerAfter(msgs: any[], kind: string, before: number): string {
  const idx = msgs.slice(0, before).map((m) => m.direction === "outbound" && m.tool_call?.auto_reply === kind).lastIndexOf(true);
  if (idx < 0) return "—";
  const a = msgs.slice(idx + 1, before).find((m) => m.direction === "inbound");
  return String(a?.content ?? "—").trim() || "—";
}

export default function WhatsappClientViewings() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["wa-client-viewings", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: confirmed } = await (supabase as any)
        .from("wa_messages")
        .select("id, conversation_id, created_at")
        .eq("direction", "outbound")
        .eq("tool_call->>auto_reply", "client_viewing_confirmed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      const convIds = [...new Set((confirmed ?? []).map((m: any) => m.conversation_id))];
      if (!convIds.length) return [];
      const [{ data: msgs }, { data: convs }] = await Promise.all([
        (supabase as any).from("wa_messages").select("id, conversation_id, direction, content, tool_call, created_at")
          .in("conversation_id", convIds).gte("created_at", new Date(Date.parse(since) - 7 * 86_400_000).toISOString())
          .order("created_at", { ascending: true }).limit(5000),
        (supabase as any).from("wa_conversations").select("id, phone_normalized, wa_profile_name").in("id", convIds),
      ]);
      const cMap = new Map((convs ?? []).map((c: any) => [c.id, c]));
      return (confirmed ?? []).map((c: any) => {
        const list = (msgs ?? []).filter((m: any) => m.conversation_id === c.conversation_id);
        const pos = list.findIndex((m: any) => m.id === c.id);
        const [zone, rooms, day, time] = STEPS.map((k) => answerAfter(list, k, pos < 0 ? list.length : pos));
        return { ...c, conv: cMap.get(c.conversation_id), zone, rooms, day, time };
      });
    },
  });

  return (
    <AdminPageShell title="Vizionări programate" description="Cererile de vizionare confirmate de clienți în conversația cu Andrei.">
      <div className="flex gap-2 mb-4">
        {([7, 30, 90] as const).map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>
        ))}
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.length ? (
        <Card><CardContent className="p-6 text-muted-foreground">Nicio vizionare confirmată în această perioadă.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>{["Confirmat", "Client", "Zonă", "Camere", "Zi", "Oră", ""].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((v: any) => {
                const phone = v.conv?.phone_normalized as string | undefined;
                return (
                  <tr key={v.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(v.created_at).toLocaleString("ro-RO")}</td>
                    <td className="p-2">{v.conv?.wa_profile_name || phone || "—"}</td>
                    <td className="p-2">{v.zone}</td>
                    <td className="p-2">{v.rooms}</td>
                    <td className="p-2">{v.day}</td>
                    <td className="p-2">{v.time}</td>
                    <td className="p-2">
                      {phone && (
                        <div className="flex gap-1">
                          <Button asChild size="sm" variant="outline" className="min-h-[48px]">
                            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} aria-label={`Sună ${phone}`}><Phone className="h-4 w-4" /></a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="min-h-[48px]">
                            <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="Deschide WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
