import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—";

async function countQ(table: string, apply: (q: any) => any) {
  const { count } = await apply((supabase as any).from(table).select("id", { count: "exact", head: true }));
  return count ?? 0;
}

export default function OutreachMonitorPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["outreach-monitor"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since24 = new Date(Date.now() - 86_400_000).toISOString();
      const [sent, pending, delivered, failed, lastSent, lastInbound, inbound7d, scored24, lastScored, hot, settings] =
        await Promise.all([
          countQ("wa_outbound_queue", (q) => q.eq("status", "sent")),
          countQ("wa_outbound_queue", (q) => q.eq("status", "pending")),
          countQ("wa_outbound_queue", (q) => q.not("delivered_at", "is", null)),
          countQ("wa_outbound_queue", (q) => q.eq("status", "failed")),
          (supabase as any).from("wa_outbound_queue").select("sent_at").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle(),
          (supabase as any).from("wa_messages").select("created_at").eq("direction", "inbound").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          countQ("wa_messages", (q) => q.eq("direction", "inbound").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())),
          countQ("prospect_listings", (q) => q.gte("ai_scored_at", since24)),
          (supabase as any).from("prospect_listings").select("ai_scored_at").not("ai_scored_at", "is", null).order("ai_scored_at", { ascending: false }).limit(1).maybeSingle(),
          (supabase as any).from("prospect_listings").select("id, title, lead_score, platform, ai_scored_at").gte("lead_score", 70).not("ai_scored_at", "is", null).order("ai_scored_at", { ascending: false }).limit(5),
          (supabase as any).from("wa_agent_settings").select("outbound_paused, outbound_pause_reason").eq("id", 1).maybeSingle(),
        ]);
      return {
        sent, pending, delivered, failed, inbound7d, scored24,
        lastSent: lastSent.data?.sent_at, lastInbound: lastInbound.data?.created_at,
        lastScored: lastScored.data?.ai_scored_at, hot: hot.data ?? [], settings: settings.data,
      };
    },
  });

  const tiles = data
    ? [
        { label: "Trimise", v: data.sent },
        { label: "În coadă", v: data.pending },
        { label: "Livrate (confirmat Meta)", v: data.delivered },
        { label: "Eșuate", v: data.failed },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Monitorizare outreach
          {data?.settings?.outbound_paused && <Badge variant="destructive">Trimitere pe pauză</Badge>}
        </CardTitle>
        <CardDescription>Mesaje WhatsApp, răspunsuri primite și activitatea scorării AI. Se actualizează la fiecare minut.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <div className="text-sm text-muted-foreground">Se încarcă…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                  <div className="text-2xl font-semibold tabular-nums">{t.v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="font-medium">WhatsApp</div>
                <div>Ultimul mesaj trimis: {fmt(data.lastSent)}</div>
                <div>Ultimul răspuns primit: {fmt(data.lastInbound)}</div>
                <div>Răspunsuri în ultimele 7 zile: {data.inbound7d}</div>
                {data.sent > 0 && data.delivered === 0 && (
                  <div className="text-destructive text-xs">Nu sosesc confirmări de la Meta — verifică legătura webhook.</div>
                )}
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="font-medium">Scorare AI (Gemini)</div>
                <div>Ultima scorare: {fmt(data.lastScored)}</div>
                <div>Anunțuri scorate în 24h: {data.scored24} (~{(data.scored24 / 24).toFixed(1)}/oră)</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Ultimele scoruri ≥70</div>
              {data.hot.length === 0 ? (
                <div className="text-sm text-muted-foreground">Niciun anunț încă.</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.hot.map((h: any) => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span className="truncate">{h.title ?? "Anunț"} <span className="text-muted-foreground">· {h.platform}</span></span>
                      <Badge variant="secondary">{h.lead_score}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
