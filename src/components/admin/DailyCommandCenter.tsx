import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, RefreshCw, Search, CheckCircle2, MessageSquare, TrendingDown,
  Clock, AlertTriangle, ArrowRight, Flame,
} from "lucide-react";

const AMBIGUOUS_TYPES = ["generic_search", "sale", "rent", "vanzare", "necunoscut"];

interface ActionCard {
  key: string;
  label: string;
  hint: string;
  count: number;
  tab: string;
  route?: string;
  icon: typeof Search;
  tone: "amber" | "green" | "blue" | "rose" | "slate";
}

const TONE: Record<ActionCard["tone"], string> = {
  amber: "border-amber-500/40 bg-amber-500/5",
  green: "border-emerald-500/40 bg-emerald-500/5",
  blue: "border-sky-500/40 bg-sky-500/5",
  rose: "border-rose-500/40 bg-rose-500/5",
  slate: "border-border bg-muted/20",
};

const since = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

async function headCount(build: () => PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await build();
  if (error) return 0;
  return count ?? 0;
}

/**
 * „Astăzi” — singurul ecran de start de care ai nevoie.
 * Adună tot ce cere o acțiune acum și te duce direct în secțiunea care o rezolvă,
 * ca să nu mai cauți prin cele 85+ de secțiuni (mai ales pe telefon).
 */
export default function DailyCommandCenter() {
  const navigate = useNavigate();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-daily-command-center"],
    staleTime: 30_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      const [
        toVerify, hot, newToday, outreachPending, waPending, waFailed,
        priceDrops, expiringSoon, anomalies,
      ] = await Promise.all([
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .or(`prospect_type.in.(${AMBIGUOUS_TYPES.join(",")}),prospect_type.is.null`)),
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("lifecycle_status", "new")
          .gt("lead_score", 80)),
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("created_at", since(24))),
        headCount(() => supabase.from("owner_outreach_messages")
          .select("*", { count: "exact", head: true })
          .in("status", ["auto_queued", "draft", "pending"])),
        headCount(() => supabase.from("wa_outbound_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")),
        headCount(() => supabase.from("wa_outbound_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")),
        headCount(() => supabase.from("prospect_price_drop_alerts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since(24))),
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .lt("last_seen_at", since(21 * 24))),
        headCount(() => supabase.from("automation_anomalies")
          .select("*", { count: "exact", head: true })
          .is("resolved_at", null)),
      ]);
      return { toVerify, hot, newToday, outreachPending, waPending, waFailed, priceDrops, expiringSoon, anomalies };
    },
  });

  const go = useCallback((tab: string, route?: string) => {
    if (route) navigate(route);
    else navigate(tab === "dashboard" ? "/admin" : `/admin/${tab}`);
  }, [navigate]);

  const d = data;

  const cards: ActionCard[] = d ? [
    { key: "new", label: "Anunțuri noi (24h)", hint: "găsite automat pe portaluri", count: d.newToday, tab: "flux-proprietari", icon: Search, tone: "blue" },
    { key: "verify", label: "De verificat", hint: "așteaptă aprobarea ta", count: d.toVerify, tab: "flux-proprietari", icon: CheckCircle2, tone: "amber" },
    { key: "hot", label: "Proprietari fierbinți", hint: "scor peste 80, gata de contact", count: d.hot, tab: "flux-proprietari", icon: Flame, tone: "rose" },
    { key: "outreach", label: "Mesaje pregătite", hint: "oferte de trimis proprietarilor", count: d.outreachPending, tab: "flux-proprietari", icon: MessageSquare, tone: "green" },
    { key: "wa", label: "În coada WhatsApp", hint: "așteaptă trimiterea", count: d.waPending, tab: "whatsapp-queue", icon: MessageSquare, tone: "slate" },
    { key: "wa-failed", label: "WhatsApp eșuate", hint: "necesită reluare manuală", count: d.waFailed, tab: "whatsapp-queue", icon: AlertTriangle, tone: d.waFailed > 0 ? "rose" : "slate" },
    { key: "drops", label: "Scăderi de preț (24h)", hint: "ocazii de negociere", count: d.priceDrops, tab: "price-drops", icon: TrendingDown, tone: "green" },
    { key: "stale", label: "Posibil expirate", hint: "nevăzute peste 21 de zile", count: d.expiringSoon, tab: "expired-listings", icon: Clock, tone: "slate" },
    { key: "anomalies", label: "Probleme automatizări", hint: "nerezolvate", count: d.anomalies, tab: "automation", icon: AlertTriangle, tone: d.anomalies > 0 ? "rose" : "slate" },
  ] : [];

  const urgent = cards.filter((c) => c.count > 0 && ["verify", "hot", "outreach", "wa-failed", "anomalies"].includes(c.key));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Astăzi
              {urgent.length > 0 && (
                <Badge variant="destructive">{urgent.reduce((s, c) => s + c.count, 0)} de rezolvat</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Tot ce cere o acțiune acum, cu un singur clic până la locul unde o rezolvi.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Reîmprospătează">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Se încarcă…</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => go(c.tab, c.route)}
                  className={`text-left rounded-lg border p-3 min-h-[96px] transition-colors hover:bg-accent/40 ${TONE[c.tone]}`}
                  aria-label={`${c.label}: ${c.count}. Deschide secțiunea.`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <c.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{c.count}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{c.hint}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Continuă fluxul</CardTitle>
          <CardDescription>De la căutare până la ofertă, fără să schimbi secțiunea.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => go("flux-proprietari")} className="gap-2">
            Deschide fluxul proprietari <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => go("owner-search")}>Doar căutarea</Button>
          <Button variant="outline" onClick={() => go("whatsapp-chat")}>Discuții WhatsApp</Button>
          <Button variant="outline" onClick={() => go("saved-listings")}>Anunțuri salvate</Button>
        </CardContent>
      </Card>
    </div>
  );
}
