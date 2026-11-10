import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageSquare, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TODAY_ROUTES, prospectDetailRoute, whatsappChatRoute } from "@/lib/adminTodayRoutes";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—";

async function countQ(table: string, apply: (q: any) => any) {
  const { count } = await apply((supabase as any).from(table).select("id", { count: "exact", head: true }));
  return count ?? 0;
}

export default function OutreachMonitorPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["outreach-monitor"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since24 = new Date(Date.now() - 86_400_000).toISOString();
      const [sent, pending, delivered, failed, chatSent, chatReplies, lastSent, lastInbound, inbound7d, scored24, lastScored, hot, settings, replies] =
        await Promise.all([
          countQ("wa_outbound_queue", (q) => q.eq("status", "sent")),
          countQ("wa_outbound_queue", (q) => q.eq("status", "pending")),
          countQ("wa_outbound_queue", (q) => q.not("delivered_at", "is", null)),
          countQ("wa_outbound_queue", (q) => q.eq("status", "failed")),
          countQ("chat_messages", (q) => q.eq("role", "user")),
          countQ("chat_messages", (q) => q.eq("role", "assistant")),
          (supabase as any).from("wa_outbound_queue").select("sent_at").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle(),
          (supabase as any).from("wa_messages").select("created_at").eq("direction", "inbound").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          countQ("wa_messages", (q) => q.eq("direction", "inbound").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())),
          countQ("prospect_listings", (q) => q.gte("ai_scored_at", since24)),
          (supabase as any).from("prospect_listings").select("ai_scored_at").not("ai_scored_at", "is", null).order("ai_scored_at", { ascending: false }).limit(1).maybeSingle(),
          (supabase as any).from("prospect_listings").select("id, title, lead_score, source_platform, ai_scored_at").gte("lead_score", 70).not("ai_scored_at", "is", null).order("ai_scored_at", { ascending: false }).limit(5),
          (supabase as any).from("wa_agent_settings").select("outbound_paused, outbound_pause_reason").eq("id", 1).maybeSingle(),
          (supabase as any).from("wa_conversations").select("id, wa_profile_name, phone_normalized, last_inbound_at, prospect_id").not("last_inbound_at", "is", null).order("last_inbound_at", { ascending: false }).limit(5),
        ]);
      const convs = replies.data ?? [];
      const pids = convs.map((c: any) => c.prospect_id).filter(Boolean);
      const { data: pls } = pids.length
        ? await (supabase as any).from("prospect_listings").select("id, title, zone, contact_name").in("id", pids)
        : { data: [] };
      const plMap = new Map((pls ?? []).map((p: any) => [p.id, p]));
      const recentReplies = convs.map((c: any) => ({ ...c, listing: plMap.get(c.prospect_id) }));
      return {
        sent, pending, delivered, failed, chatSent, chatReplies, inbound7d, scored24,
        lastSent: lastSent.data?.sent_at, lastInbound: lastInbound.data?.created_at,
        lastScored: lastScored.data?.ai_scored_at, hot: hot.data ?? [], settings: settings.data, recentReplies,
      };
    },
  });

  // Reîmprospătare grupată: mai multe evenimente apropiate → o singură reîncărcare.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void refetch(); }, 1200);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // „Livrate (confirmat Meta)” se reîmprospătează la fiecare confirmare reală de livrare,
  // iar mesajele noi primite apar imediat, fără să aștepte minutul următor.
  useRealtimeChannel("outreach-monitor", [
    { event: "UPDATE", table: "wa_outbound_queue", handler: scheduleRefetch },
    { event: "INSERT", table: "wa_messages", handler: scheduleRefetch },
  ]);


  const tiles = data
    ? [
        { label: "Trimise", v: data.sent },
        { label: "În coadă", v: data.pending },
        { label: "Livrate (confirmat Meta)", v: data.delivered },
        { label: "Eșuate", v: data.failed },
        { label: "Chat mobil · trimise", v: data.chatSent },
        { label: "Chat mobil · răspunsuri", v: data.chatReplies },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Monitorizare outreach
          {data?.settings?.outbound_paused && <Badge variant="destructive">Trimitere pe pauză</Badge>}
        </CardTitle>
        <CardDescription>Mesaje WhatsApp, răspunsuri primite și activitatea scorării AI. Mesajele noi apar imediat.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <div className="text-sm text-muted-foreground">Se încarcă…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
              <div className="text-sm font-medium mb-2">Ultimele răspunsuri de la proprietari</div>
              {data.recentReplies.length === 0 ? (
                <div className="text-sm text-muted-foreground">Niciun răspuns încă.</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentReplies.map((r: any) => {
                    const name = r.wa_profile_name || r.listing?.contact_name || r.phone_normalized;
                    return (
                      <li key={r.id}>
                        <Link
                          to={whatsappChatRoute(r.phone_normalized)}
                          aria-label={`Deschide chatul WhatsApp cu ${name}`}
                          className="flex min-h-[44px] items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.listing ? `${r.listing.title ?? "Anunț"} · ${r.listing.zone ?? "zonă necunoscută"}` : "fără anunț legat"} · {fmt(r.last_inbound_at)}
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">Deschide chat</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Ultimele scoruri ≥70</div>
              {data.hot.length === 0 ? (
                <div className="text-sm text-muted-foreground">Niciun anunț încă.</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.hot.map((h: any) => (
                    <li key={h.id} className="flex items-stretch gap-2">
                      <Link
                        to={prospectDetailRoute(h.id)}
                        aria-label={`Deschide fișa anunțului ${h.title ?? "fără titlu"}, scor ${h.lead_score}`}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border p-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Badge variant="secondary" className="shrink-0 tabular-nums">{h.lead_score}</Badge>
                        <span className="min-w-0 flex-1 truncate">
                          {h.title ?? "Anunț"} <span className="text-muted-foreground">· {h.source_platform}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                      <Button asChild variant="outline" size="sm" className="min-h-[44px] min-w-[44px] shrink-0 gap-1.5 px-3">
                        <Link to={TODAY_ROUTES.contact} aria-label={`Contactează proprietarul: ${h.title ?? "anunț"}`}>
                          <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="hidden sm:inline">Contactează</span>
                        </Link>
                      </Button>
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
