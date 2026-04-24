import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Activity, Users, Building, Zap, Flame } from "lucide-react";

interface Props {
  newLeads: number;
  newScraper: number;
  hotProspects: number;
  onJump: (tab: string, route?: string) => void;
}

export function AdminStatusBar({ newLeads, newScraper, hotProspects, onJump }: Props) {
  const { data: activeProperties = 0 } = useQuery({
    queryKey: ["admin-status:active-properties"],
    queryFn: async () => {
      const { count } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: bookingsToday = 0 } = useQuery({
    queryKey: ["admin-status:bookings-today"],
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

  const items = [
    {
      icon: Users,
      label: "Lead-uri noi",
      value: newLeads,
      color: newLeads > 0 ? "text-red-500" : "text-muted-foreground",
      onClick: () => onJump("leads"),
    },
    {
      icon: Flame,
      label: "Hot prospects",
      value: hotProspects,
      color: hotProspects > 0 ? "text-orange-500" : "text-muted-foreground",
      onClick: () => onJump("prospect-listings", "/admin/prospect-listings"),
    },
    {
      icon: Zap,
      label: "Scraper noi",
      value: newScraper,
      color: newScraper > 0 ? "text-amber-500" : "text-muted-foreground",
      onClick: () => onJump("scraper-leads", "/scraper-leads"),
    },
    {
      icon: Building,
      label: "Properties active",
      value: activeProperties,
      color: "text-emerald-600",
      onClick: () => onJump("properties"),
    },
    {
      icon: Activity,
      label: "Booking-uri azi",
      value: bookingsToday,
      color: "text-blue-500",
      onClick: () => onJump("bookings"),
    },
  ];

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 text-xs">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={it.onClick}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-muted"
              title={it.label}
            >
              <Icon className={`h-3.5 w-3.5 ${it.color}`} />
              <span className="text-muted-foreground hidden sm:inline">{it.label}:</span>
              <span className={`font-semibold ${it.color}`}>{it.value}</span>
            </button>
          );
        })}
        <div className="ml-auto hidden shrink-0 text-[10px] text-muted-foreground md:block">
          ⌘K pentru căutare rapidă
        </div>
      </div>
    </div>
  );
}
