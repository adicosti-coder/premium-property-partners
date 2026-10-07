import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/automation/StatCard";

type R = { consented_at: string | null; published_at: string | null; prospect_listings: { category: string | null } | null };

/** Acorduri „DA” și publicări din fluxul de prospectare, pe Vânzare / Închiriere. */
export default function ManualConsentStats() {
  const q = useQuery({
    queryKey: ["manual-consent-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("wa_publish_consents") as any)
        .select("consented_at, published_at, prospect_listings(category)")
        .not("prospect_listing_id", "is", null)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as R[];
    },
  });
  const rows = q.data ?? [];
  const cat = (r: R) => String(r.prospect_listings?.category || "vanzare").toLowerCase();
  const n = (k: "consented_at" | "published_at", c: string) => rows.filter((r) => r[k] && cat(r) === c).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Au răspuns DA · Vânzare" value={n("consented_at", "vanzare")} />
      <StatCard label="Au răspuns DA · Închiriere" value={n("consented_at", "inchiriere")} />
      <StatCard label="Publicate după DA · Vânzare" value={n("published_at", "vanzare")} highlight />
      <StatCard label="Publicate după DA · Închiriere" value={n("published_at", "inchiriere")} highlight />
    </div>
  );
}
