import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, TrendingUp, Clock, AlertTriangle, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

// Priority zones — slug → array de keywords care matchează în coloana `zone`
// sau în `title` din prospect_listings (free-text, RO diacritics aware).
const PRIORITY_ZONES: { slug: string; label: string; keywords: string[] }[] = [
  { slug: "isho", label: "ISHO", keywords: ["isho"] },
  { slug: "zona-aradului", label: "Aradului", keywords: ["aradului", "calea aradului"] },
  { slug: "zona-girocului", label: "Girocului", keywords: ["giroc"] },
  { slug: "complex-studentesc", label: "Complex Studențesc", keywords: ["complex student", "studentesc", "studențesc"] },
  { slug: "sagului", label: "Șagului", keywords: ["sagului", "șagului", "calea sagului"] },
  { slug: "circumvalatiunii", label: "Circumvalațiunii", keywords: ["circumval"] },
  { slug: "calea-lipovei", label: "Calea Lipovei", keywords: ["lipovei"] },
];

// Un prospect e considerat "prioritar" dacă are lead_score ≥ 70.
const PRIORITY_LEAD_SCORE = 70;

export default function ScraperStatusDashboard() {
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const navigate = useNavigate();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const { data: todayStats, isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: ["prospect-today-stats"],
    queryFn: async () => {
      const [{ count: totalToday }, { count: priorityToday }] = await Promise.all([
        supabase
          .from("prospect_listings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayISO)
          .eq("is_active", true),
        supabase
          .from("prospect_listings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayISO)
          .eq("is_active", true)
          .gte("lead_score", PRIORITY_LEAD_SCORE),
      ]);
      return { total: totalToday ?? 0, priority: priorityToday ?? 0 };
    },
    refetchInterval: 30000,
  });

  const { data: zoneBreakdown, isLoading: loadingZones, refetch: refetchZones } = useQuery({
    queryKey: ["prospect-zone-breakdown"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        PRIORITY_ZONES.map(async (zone) => {
          const orFilter = zone.keywords
            .flatMap((k) => [`zone.ilike.%${k}%`, `title.ilike.%${k}%`])
            .join(",");
          const { count } = await supabase
            .from("prospect_listings")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .or(orFilter);
          results[zone.slug] = count ?? 0;
        }),
      );
      return results;
    },
    refetchInterval: 60000,
  });

  const { data: recentPriority, refetch: refetchRecent } = useQuery({
    queryKey: ["prospect-recent-priority"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospect_listings")
        .select("id, title, zone, lead_score, price, currency, created_at")
        .gte("lead_score", PRIORITY_LEAD_SCORE)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const matchZoneLabel = (raw: string | null): string => {
    if (!raw) return "—";
    const lc = raw.toLowerCase();
    const hit = PRIORITY_ZONES.find((z) => z.keywords.some((k) => lc.includes(k.toLowerCase())));
    return hit?.label ?? raw;
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([refetchToday(), refetchZones(), refetchRecent()]);
      toast.success("Date reîmprospătate din prospect_listings (live).");
    } catch {
      toast.error("Eroare la refresh");
    } finally {
      setSyncing(false);
    }
  };

  const handleForceBackfill = async () => {
    if (!confirm("Rulează auto-publish-listings cu force=true pentru a procesa candidații acumulați?")) return;
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-publish-listings", {
        body: {
          batch_size: 25,
          use_ai_rewrite: true,
          force: true,
          triggered_by: "manual_backfill_dashboard",
        },
      });
      if (error) throw error;
      const published = data?.summary?.published ?? 0;
      const candidates = data?.summary?.candidates ?? 0;
      toast.success(`Backfill complet: ${published}/${candidates} publicate`);
      await Promise.all([refetchToday(), refetchZones(), refetchRecent()]);
    } catch (e: any) {
      toast.error(`Eroare backfill: ${e?.message || String(e)}`);
    } finally {
      setBackfilling(false);
    }
  };

  const getBucharestTime = () =>
    new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scraper Status</h2>
          <p className="text-sm text-muted-foreground">
            Live · prospect_listings · Ultima verificare: {getBucharestTime()} (Bucharest)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleForceBackfill} disabled={backfilling} variant="default" size="sm">
            {backfilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Backfill forțat candidați
          </Button>
          <Button onClick={handleForceSync} disabled={syncing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Lead-uri azi</p>
                <p className="text-3xl font-bold text-foreground">
                  {loadingToday ? "..." : todayStats?.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Prioritare azi (≥{PRIORITY_LEAD_SCORE})</p>
                <p className="text-3xl font-bold text-foreground">
                  {loadingToday ? "..." : todayStats?.priority}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rată prioritare</p>
                <p className="text-3xl font-bold text-foreground">
                  {loadingToday || !todayStats?.total
                    ? "—"
                    : `${Math.round(((todayStats?.priority ?? 0) / Math.max(todayStats.total, 1)) * 100)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuție pe Zone Prioritare (active)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingZones ? (
            <p className="text-muted-foreground">Se încarcă...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRIORITY_ZONES.map((zone) => (
                <div key={zone.slug} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-foreground">{zone.label}</span>
                  <Badge variant={zoneBreakdown?.[zone.slug] ? "default" : "secondary"}>
                    {zoneBreakdown?.[zone.slug] ?? 0}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Priority Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ultimele Lead-uri Prioritare</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentPriority?.length ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <AlertTriangle className="h-4 w-4" />
              <span>Niciun lead prioritar recent.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPriority.map((lead: any) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/admin?tab=pipeline&subtab=hot&search=${encodeURIComponent(lead.title?.substring(0, 30) || "")}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2 cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {matchZoneLabel(lead.zone)}
                      </Badge>
                      {lead.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {Number(lead.price).toLocaleString("ro-RO")} {lead.currency || "€"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-green-600">
                      Score {lead.lead_score ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
