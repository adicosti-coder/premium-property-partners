import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Raport de conversii pentru prospectarea WhatsApp (șablonul v6):
 * trimise → livrate → citite → cu răspuns → interesați (vizionare/colaborare).
 * „Interesați” = anunțul a fost marcat automat „interested” când proprietarul
 * a cerut vizionare, a acceptat colaborarea sau a cerut să fie sunat.
 */
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

type Row = {
  zone: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  interested: number;
};

export default function WhatsappProspectFunnel() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["wa-prospect-funnel", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const [{ data: queue }, { data: prospects }] = await Promise.all([
        (supabase as any)
          .from("wa_outbound_queue")
          .select("phone_normalized, template_params, delivered_at, read_at, replied_at, source, sent_at")
          .eq("status", "sent")
          .eq("template_name", "prospect_intro_premium_v6")
          .gte("sent_at", since)
          .limit(5000),
        (supabase as any)
          .from("prospect_listings")
          .select("phone_normalized, zone, lifecycle_status, updated_at")
          .eq("lifecycle_status", "interested")
          .gte("updated_at", since)
          .limit(5000),
      ]);
      const first = (queue ?? []).filter((r: any) => !["followup", "followup2"].includes(r.source ?? ""));
      return { queue: first, prospects: prospects ?? [] };
    },
  });

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    const ensure = (zone: string) => {
      const z = map.get(zone) ?? { zone, sent: 0, delivered: 0, read: 0, replied: 0, interested: 0 };
      map.set(zone, z);
      return z;
    };
    const interestedPhones = new Map<string, string>();
    for (const p of data?.prospects ?? []) {
      if (p.phone_normalized) interestedPhones.set(p.phone_normalized, p.zone || "Necunoscută");
    }
    for (const r of data?.queue ?? []) {
      const p0 = Array.isArray(r.template_params) ? r.template_params[0] : null;
      const zone = String(p0 || "Necunoscută").trim() || "Necunoscută";
      const z = ensure(zone);
      z.sent++;
      if (r.delivered_at) z.delivered++;
      if (r.read_at) z.read++;
      if (r.replied_at) z.replied++;
      if (interestedPhones.has(r.phone_normalized)) z.interested++;
    }
    // Proprietari interesați al căror mesaj de prim contact e în afara perioadei alese
    for (const [phone, zone] of interestedPhones) {
      const inQueue = (data?.queue ?? []).some((r: any) => r.phone_normalized === phone);
      if (!inQueue) ensure(zone).interested++;
    }
    return [...map.values()].sort((a, b) => b.sent - a.sent);
  }, [data]);

  const total = rows.reduce(
    (s, r) => ({
      sent: s.sent + r.sent,
      delivered: s.delivered + r.delivered,
      read: s.read + r.read,
      replied: s.replied + r.replied,
      interested: s.interested + r.interested,
    }),
    { sent: 0, delivered: 0, read: 0, replied: 0, interested: 0 },
  );

  const cards = [
    { l: "Mesaje trimise", v: total.sent, r: "" },
    { l: "Livrate", v: total.delivered, r: pct(total.delivered, total.sent) },
    { l: "Citite", v: total.read, r: pct(total.read, total.delivered) },
    { l: "Cu răspuns", v: total.replied, r: pct(total.replied, total.read) },
    { l: "Interesați (vizionare/colaborare)", v: total.interested, r: pct(total.interested, total.replied) },
  ];

  return (
    <AdminPageShell
      title="Conversii prospectare WhatsApp"
      description="Pâlnia mesajelor v6: câte au fost trimise, livrate, citite, au primit răspuns și au dus la vizionare sau colaborare."
      actions={
        <div className="flex gap-1">
          {([7, 30, 90] as const).map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading ? <Skeleton className="h-24 w-full sm:col-span-2 lg:col-span-5" /> : cards.map((c) => (
          <Card key={c.l}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{c.l}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{c.v}</p>
              {c.r && <p className="text-xs text-primary mt-1">{c.r} din pasul anterior</p>}
            </CardContent>
          </Card>
        ))}
      </div>

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
                    <th className="py-2 pr-3">Răspunsuri</th><th className="py-2 pr-3">Interesați</th>
                    <th className="py-2">Rată finală</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.zone} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{r.zone}</td><td className="py-2 pr-3">{r.sent}</td>
                      <td className="py-2 pr-3">{r.delivered}</td><td className="py-2 pr-3">{r.read}</td>
                      <td className="py-2 pr-3">{r.replied}</td><td className="py-2 pr-3">{r.interested}</td>
                      <td className="py-2">{pct(r.interested, r.sent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            „Interesați” se completează automat când proprietarul cere vizionare, acceptă colaborarea sau cere să fie sunat.
            Reamintirile (follow-up) nu sunt numărate aici.
          </p>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
