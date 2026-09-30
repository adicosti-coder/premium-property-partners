import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Eficiența mesajului de prim contact, pe șablon (v6 vs. versiunile vechi):
 * trimise → livrate → citite → au răspuns, plus ce buton au apăsat proprietarii.
 */

const BUTTONS: { key: string; label: string; match: RegExp }[] = [
  { key: "vanzare", label: "Colaborare vânzare", match: /colaborare v[aâ]nzare|v[aâ]nzare asistat/i },
  { key: "clasic", label: "Închiriere clasică", match: /[iî]nchiriere clasic/i },
  { key: "hotelier", label: "Regim hotelier", match: /regim hotelier|administrare hotelier/i },
  { key: "stop", label: "Nu / STOP", match: /^(stop|nu,? mul[tț]umesc|dezabonare)\b/i },
];

const LABEL: Record<string, string> = {
  prospect_intro_premium_v6: "Mesaj nou (v6)",
  prospect_intro_premium_v5: "Mesaj vechi (v5)",
  prospect_intro_premium_v3: "Mesaj vechi (v3)",
};

type Row = {
  template: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  buttons: Record<string, number>;
  freeText: number;
  hoursToReply: number[];
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default function WhatsappTemplateEfficiency() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["wa-template-efficiency", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: queue } = await (supabase as any)
        .from("wa_outbound_queue")
        .select("phone_normalized, template_name, sent_at, delivered_at, read_at, replied_at, conversation_id, source")
        .eq("status", "sent")
        .gte("sent_at", since)
        .limit(5000);
      const firstContact = (queue ?? []).filter(
        (q: any) => !["followup", "followup2"].includes(q.source ?? ""),
      );
      const { data: logs } = await (supabase as any)
        .from("communication_logs")
        .select("to_number, metadata, created_at")
        .eq("source", "wa-outbound-queue")
        .gte("created_at", since)
        .limit(5000);
      const convIds = [...new Set(firstContact.map((q: any) => q.conversation_id).filter(Boolean))];
      let inbound: any[] = [];
      for (let i = 0; i < convIds.length; i += 200) {
        const { data: m } = await (supabase as any)
          .from("wa_messages")
          .select("conversation_id, content, created_at")
          .eq("direction", "inbound")
          .in("conversation_id", convIds.slice(i, i + 200))
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000);
        inbound = inbound.concat(m ?? []);
      }
      return { queue: firstContact, logs: logs ?? [], inbound };
    },
  });

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const map = new Map<string, Row>();
    for (const q of data.queue) {
      // Șablonul real: din rând (nou) sau din jurnalul trimiterii (istoric).
      let tpl = q.template_name as string;
      if (!tpl?.startsWith("prospect_intro")) {
        const sentMs = new Date(q.sent_at).getTime();
        const log = data.logs.find(
          (l: any) =>
            l.to_number === q.phone_normalized &&
            Math.abs(new Date(l.created_at).getTime() - sentMs) < 5 * 60_000,
        );
        tpl = log?.metadata?.template ?? tpl ?? "necunoscut";
      }
      if (!map.has(tpl))
        map.set(tpl, { template: tpl, sent: 0, delivered: 0, read: 0, replied: 0, buttons: {}, freeText: 0, hoursToReply: [] });
      const r = map.get(tpl)!;
      r.sent++;
      if (q.delivered_at || q.read_at) r.delivered++;
      if (q.read_at) r.read++;
      const first = data.inbound.find(
        (m: any) => m.conversation_id === q.conversation_id && m.created_at >= q.sent_at,
      );
      if (first || q.replied_at) {
        r.replied++;
        const at = first?.created_at ?? q.replied_at;
        r.hoursToReply.push((new Date(at).getTime() - new Date(q.sent_at).getTime()) / 3_600_000);
        const text = String(first?.content ?? "").trim();
        const b = BUTTONS.find((x) => x.match.test(text));
        if (b) r.buttons[b.key] = (r.buttons[b.key] ?? 0) + 1;
        else r.freeText++;
      }
    }
    return [...map.values()].sort((a, b) => b.template.localeCompare(a.template));
  }, [data]);

  return (
    <AdminPageShell
      title="Eficiență mesaj WhatsApp"
      description="Cât de bine funcționează mesajul de prim contact către proprietari: câți îl primesc, îl citesc, răspund și ce buton aleg."
      actions={
        <div className="flex gap-2">
          {([7, 30, 90] as const).map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} aria-label={`Ultimele ${d} zile`}>
              {d} zile
            </Button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun mesaj de prim contact trimis în perioada aleasă.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => {
            const avg = r.hoursToReply.length
              ? (r.hoursToReply.reduce((a, b) => a + b, 0) / r.hoursToReply.length).toFixed(1)
              : "—";
            return (
              <Card key={r.template}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{LABEL[r.template] ?? r.template}</CardTitle>
                  <CardDescription>{r.template}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      ["Trimise", r.sent, ""],
                      ["Livrate", r.delivered, pct(r.delivered, r.sent)],
                      ["Citite", r.read, pct(r.read, r.sent)],
                      ["Au răspuns", r.replied, pct(r.replied, r.sent)],
                    ].map(([l, v, p]) => (
                      <div key={l as string} className="rounded-lg border p-2">
                        <div className="text-xs text-muted-foreground">{l}</div>
                        <div className="text-xl font-semibold tabular-nums">{v}</div>
                        <div className="text-xs text-muted-foreground">{p || "\u00a0"}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Ce au ales proprietarii</div>
                    <ul className="text-sm space-y-1">
                      {BUTTONS.map((b) => (
                        <li key={b.key} className="flex justify-between">
                          <span>{b.label}</span>
                          <span className="tabular-nums">{r.buttons[b.key] ?? 0} · {pct(r.buttons[b.key] ?? 0, r.replied)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between">
                        <span>Au scris alt mesaj</span>
                        <span className="tabular-nums">{r.freeText} · {pct(r.freeText, r.replied)}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-sm text-muted-foreground">Timp mediu până la răspuns: {avg} ore</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        „Livrate” și „Citite” apar doar dacă Meta trimite confirmările. Doar primul mesaj de contact, fără reamintiri.
      </p>
    </AdminPageShell>
  );
}
