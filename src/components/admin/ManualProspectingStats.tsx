import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/automation/StatCard";

type R = { status: string; prospect_listings: { category: string | null } | null };

export default function ManualProspectingStats() {
  const q = useQuery({
    queryKey: ["manual-prospecting-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("listing_inspections") as any)
        .select("status, prospect_listings(category)")
        .in("status", ["no_phone", "published"])
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as R[];
    },
  });
  const rows = q.data ?? [];
  const count = (s: string, c: string) =>
    rows.filter((r) => r.status === s && String(r.prospect_listings?.category || "vanzare").toLowerCase() === c).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Manual · Vânzare" value={count("no_phone", "vanzare")} warn />
      <StatCard label="Manual · Închiriere" value={count("no_phone", "inchiriere")} warn />
      <StatCard label="Publicate · Vânzare" value={count("published", "vanzare")} highlight />
      <StatCard label="Publicate · Închiriere" value={count("published", "inchiriere")} highlight />
    </div>
  );
}
