import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mesajele v6 trimise de site și răspunsurile primite, grupate pe zonă. */
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default function WhatsappZoneReport() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["wa-zone-report", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data } = await (supabase as any)
        .from("wa_outbound_queue")
        .select("template_params, delivered_at, read_at, replied_at, source")
        .eq("status", "sent")
        .eq("template_name", "prospect_intro_premium_v6")
        .gte("sent_at", since)
        .limit(5000);
      return (data ?? []).filter((r: any) => !["followup", "followup2"].includes(r.source ?? ""));
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, { zone: string; sent: number; delivered: number; read: number; replied: number }>();
    for (const r of data ?? []) {
      const p = Array.isArray(r.template_params) ? r.template_params[0] : null;
      const zone = String(p || "Timișoara").trim() || "Timișoara";
      const z = map.get(zone) ?? { zone, sent: 0, delivered: 0, read: 0, replied: 0 };
      z.sent++;
      if (r.delivered_at) z.delivered++;
      if (r.read_at) z.read++;
      if (r.replied_at) z.replied++;
      map.set(zone, z);
    }
    return [...map.values()].sort((a, b) => b.sent - a.sent);
  }, [data]);

  const total = rows.reduce((s, r) => ({ sent: s.sent + r.sent, replied: s.replied + r.replied }), { sent: 0, replied: 0 });

  return (
    <AdminPageShell
      title="Mesaje v6 pe zonă"
      description="Câte mesaje de prim contact (v6) a trimis site-ul în fiecare zonă și câți proprietari au răspuns."
      actions={
        <div className="flex gap-1">
          {([7, 30, 90] as const).map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>
          ))}
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun mesaj v6 trimis în această perioadă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Zonă</th><th className="py-2 pr-3">Trimise</th>
                    <th className="py-2 pr-3">Livrate</th><th className="py-2 pr-3">Citite</th>
                    <th className="py-2 pr-3">Răspunsuri</th><th className="py-2">Rată răspuns</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.zone} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.zone}</td><td className="py-2 pr-3">{r.sent}</td>
                      <td className="py-2 pr-3">{r.delivered}</td><td className="py-2 pr-3">{r.read}</td>
                      <td className="py-2 pr-3">{r.replied}</td><td className="py-2">{pct(r.replied, r.sent)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2 pr-3">Total</td><td className="py-2 pr-3">{total.sent}</td>
                    <td /><td /><td className="py-2 pr-3">{total.replied}</td><td className="py-2">{pct(total.replied, total.sent)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
