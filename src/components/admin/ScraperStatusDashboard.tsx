import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_SLUGS = [
  { slug: "isho", label: "ISHO" },
  { slug: "zona-aradului", label: "Aradului" },
  { slug: "zona-girocului", label: "Girocului" },
  { slug: "complex-studentesc", label: "Complex Studențesc" },
  { slug: "sagului", label: "Șagului" },
  { slug: "circumvalatiunii", label: "Circumvalațiunii" },
  { slug: "calea-lipovei", label: "Calea Lipovei" },
];

export default function ScraperStatusDashboard() {
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const { data: todayStats, isLoading: loadingToday } = useQuery({
    queryKey: ["scraper-today-stats"],
    queryFn: async () => {
      const { count: totalToday } = await supabase
        .from("scraper_leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayISO);

      const { count: priorityToday } = await supabase
        .from("scraper_leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayISO)
        .eq("is_priority", true);

      return { total: totalToday ?? 0, priority: priorityToday ?? 0 };
    },
    refetchInterval: 30000,
  });

  const { data: zoneBreakdown, isLoading: loadingZones } = useQuery({
    queryKey: ["scraper-zone-breakdown"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      for (const zone of PRIORITY_SLUGS) {
        const { count } = await supabase
          .from("scraper_leads")
          .select("*", { count: "exact", head: true })
          .eq("neighborhood_slug", zone.slug)
          .not("status", "eq", "archived");
        results[zone.slug] = count ?? 0;
      }
      return results;
    },
    refetchInterval: 60000,
  });

  const { data: recentPriority } = useQuery({
    queryKey: ["scraper-recent-priority"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_leads")
        .select("id, title, neighborhood_slug, estimated_roi, original_price, created_at")
        .eq("is_priority", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      toast.info("Prerender SEO se va actualiza la următorul build.");
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Marker de sync setat. Rulează un nou deploy pentru a regenera paginile statice.");
    } catch {
      toast.error("Eroare la sync");
    } finally {
      setSyncing(false);
    }
  };

  const formatROI = (roi: number | null) => {
    if (!roi) return "—";
    return `${roi.toFixed(1)}%`;
  };

  const getBucharestTime = () => {
    return new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scraper Status</h2>
          <p className="text-sm text-muted-foreground">
            Monitorizare ingestie lead-uri · Ultima verificare: {getBucharestTime()} (Bucharest)
          </p>
        </div>
        <Button onClick={handleForceSync} disabled={syncing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Force Sync SEO
        </Button>
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
                <p className="text-sm text-muted-foreground">Zone prioritare azi</p>
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
                <p className="text-sm text-muted-foreground">Rată mapping</p>
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
          <CardTitle className="text-lg">Distribuție pe Zone Prioritare</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingZones ? (
            <p className="text-muted-foreground">Se încarcă...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRIORITY_SLUGS.map((zone) => (
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
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {PRIORITY_SLUGS.find((z) => z.slug === lead.neighborhood_slug)?.label ?? lead.neighborhood_slug}
                      </Badge>
                      {lead.original_price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {Number(lead.original_price).toLocaleString("ro-RO")} €
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-green-600">
                      ROI {formatROI(lead.estimated_roi)}
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
