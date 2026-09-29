import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—";

/** Pasul „Recepție Meta”: mesaje primite de la Meta + confirmarea leadului salvat în baza de date. */
export default function MetaLeadReceiptPanel() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["meta-lead-receipt"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: msgs, error } = await (supabase as any)
        .from("wa_messages")
        .select("id, conversation_id, content, created_at")
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const convIds = [...new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean))];
      const { data: convs } = convIds.length
        ? await (supabase as any).from("wa_conversations").select("id, phone_normalized, wa_profile_name").in("id", convIds)
        : { data: [] };
      const convMap = new Map<string, any>((convs ?? []).map((c: any) => [c.id, c]));
      const phones = [...new Set((convs ?? []).map((c: any) => c.phone_normalized).filter(Boolean))];
      const { data: leads } = phones.length
        ? await (supabase as any).from("leads").select("id, whatsapp_number, created_at").in("whatsapp_number", phones)
        : { data: [] };
      const leadMap = new Map<string, any>();
      (leads ?? []).forEach((l: any) => { if (!leadMap.has(l.whatsapp_number)) leadMap.set(l.whatsapp_number, l); });
      return (msgs ?? []).map((m: any) => {
        const conv = convMap.get(m.conversation_id);
        return { ...m, conv, lead: conv ? leadMap.get(conv.phone_normalized) : null };
      }) as any[];
    },
  });
  useRealtimeChannel("meta-lead-receipt", [
    { event: "INSERT", table: "wa_messages", handler: () => void refetch() },
    { event: "*", table: "leads", handler: () => void refetch() },
  ]);

  const rows = data ?? [];
  const saved = rows.filter((r) => r.lead).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recepție Meta → Lead Manager</CardTitle>
        <CardDescription>Mesajele primite de la Meta și confirmarea că leadul există în baza de date. Se actualizează în timp real.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          Confirmate în baza de date: <span className="font-semibold tabular-nums">{saved}</span> din {rows.length} mesaje recente
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Se încarcă…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Niciun mesaj primit de la Meta încă.</div>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((r) => (
              <li key={r.id} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.conv?.wa_profile_name || r.conv?.phone_normalized || "Număr necunoscut"}</div>
                  <div className="text-muted-foreground truncate">{r.content}</div>
                  <div className="text-xs text-muted-foreground">Primit: {fmt(r.created_at)}</div>
                </div>
                {r.lead ? (
                  <Badge className="shrink-0">Lead salvat · {fmt(r.lead.created_at)}</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">Doar conversație (fără lead)</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
