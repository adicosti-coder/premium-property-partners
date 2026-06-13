import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Users, Flame, Zap, Building2, CalendarCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Strip compact de KPI live afișat în partea de sus a AdminDashboard.
 * Centralizează semnalele critice (lead-uri noi, prospecți fierbinți, scraper,
 * proprietăți active, bookings azi, alerte automation) într-un singur rând.
 * - polling 60s (30s pe hot-prospects pentru reactivitate)
 * - fiecare card e click-to-navigate spre tab-ul relevant
 * - layout responsiv: grid 2 col mobil → 6 col desktop
 */
export function AdminUnifiedKpiBar() {
  const navigate = useNavigate();

  const { data: newLeads = 0 } = useQuery({
    queryKey: ["kpi:new-leads"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: hotProspects = 0 } = useQuery({
    queryKey: ["kpi:hot-prospects"],
    queryFn: async () => {
      const { count } = await supabase
        .from("prospect_listings")
        .select("*", { count: "exact", head: true })
        .eq("lifecycle_status", "new")
        .gt("lead_score", 80);
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: newScraper = 0 } = useQuery({
    queryKey: ["kpi:scraper-new"],
    queryFn: async () => {
      const { count } = await supabase
        .from("scraper_leads_archive_2026" as never)
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: activeProps = 0 } = useQuery({
    queryKey: ["kpi:active-properties"],
    queryFn: async () => {
      const { count } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count ?? 0;
    },
    staleTime: 5 * 60_000,
  });

  const { data: bookingsToday = 0 } = useQuery({
    queryKey: ["kpi:bookings-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00Z`);
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: anomalies = 0 } = useQuery({
    queryKey: ["kpi:automation-anomalies"],
    queryFn: async () => {
      const { count } = await supabase
        .from("automation_anomalies")
        .select("*", { count: "exact", head: true })
        .is("resolved_at", null);
      return count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const items = [
    {
      label: "Lead-uri 24h",
      value: newLeads,
      icon: Users,
      tone: newLeads > 0 ? "text-red-500 bg-red-500/10 border-red-500/30" : "",
      onClick: () => navigate("/admin/leads"),
    },
    {
      label: "Hot prospects",
      value: hotProspects,
      icon: Flame,
      tone: hotProspects > 0 ? "text-orange-500 bg-orange-500/10 border-orange-500/30" : "",
      onClick: () => navigate("/admin/prospect-listings"),
    },
    {
      label: "Scraper new",
      value: newScraper,
      icon: Zap,
      tone: newScraper > 0 ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "",
      onClick: () => navigate("/scraper-leads"),
    },
    {
      label: "Properties active",
      value: activeProps,
      icon: Building2,
      tone: "text-emerald-600 bg-emerald-500/5 border-emerald-500/20",
      onClick: () => navigate("/admin/properties"),
    },
    {
      label: "Bookings azi",
      value: bookingsToday,
      icon: CalendarCheck,
      tone: "text-blue-500 bg-blue-500/5 border-blue-500/20",
      onClick: () => navigate("/admin/bookings"),
    },
    {
      label: "Anomalii auto",
      value: anomalies,
      icon: AlertTriangle,
      tone: anomalies > 0 ? "text-destructive bg-destructive/10 border-destructive/30 animate-pulse" : "",
      onClick: () => navigate("/admin/automation"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className={cn(
              "rounded-lg border border-border bg-card p-3 text-left transition-all hover:shadow-sm hover:-translate-y-0.5",
              it.tone,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4 opacity-80" />
              <span className="text-xl font-bold tabular-nums">{it.value}</span>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {it.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default AdminUnifiedKpiBar;
