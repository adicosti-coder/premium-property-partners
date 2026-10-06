import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, UserCheck, Home, KeyRound, TrendingUp } from "lucide-react";

/** Metrici rapide pentru fluxul inspecție → acord proprietar → publicare + conversia lui Andrei la Administrare. */
const cnt = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export default function ListingPipelineMetrics() {
  const { data } = useQuery({
    queryKey: ["kpi:listing-pipeline"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [waitAdmin, waitOwner, sale, rent, contacted, converted] = await Promise.all([
        cnt(supabase.from("listing_inspections").select("id", { count: "exact", head: true }).eq("status", "pending")),
        cnt(supabase.from("listing_inspections").select("id", { count: "exact", head: true }).eq("status", "approved_waiting_consent")),
        cnt(supabase.from("properties").select("id", { count: "exact", head: true }).eq("is_active", true).eq("listing_type", "vanzare").not("migrated_from_prospect_id", "is", null)),
        cnt(supabase.from("properties").select("id", { count: "exact", head: true }).eq("is_active", true).eq("listing_type", "inchiriere").not("migrated_from_prospect_id", "is", null)),
        cnt(supabase.from("prospect_listings").select("id", { count: "exact", head: true }).in("category", ["inchiriere", "hotelier"]).not("lifecycle_status", "in", "(new,scoring,to_review)")),
        cnt(supabase.from("prospect_listings").select("id", { count: "exact", head: true }).in("category", ["inchiriere", "hotelier"]).in("lifecycle_status", ["interested", "posted"])),
      ]);
      return { waitAdmin, waitOwner, sale, rent, contacted, converted };
    },
  });

  const d = data ?? { waitAdmin: 0, waitOwner: 0, sale: 0, rent: 0, contacted: 0, converted: 0 };
  const rate = d.contacted ? `${((d.converted / d.contacted) * 100).toFixed(1)}%` : "—";
  const cards = [
    { l: "Așteaptă aprobarea ta", v: d.waitAdmin, i: ShieldCheck, warn: d.waitAdmin > 0 },
    { l: "Așteaptă acord proprietar", v: d.waitOwner, i: UserCheck },
    { l: "Publicate · Vânzare", v: d.sale, i: Home },
    { l: "Publicate · Închiriere", v: d.rent, i: KeyRound },
    { l: "Conversie Andrei → Administrare", v: rate, i: TrendingUp, sub: `${d.converted} interesați din ${d.contacted} contactați` },
  ];

  return (
    <section aria-label="Metrici anunțuri" className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Flux anunțuri · inspecție și publicare</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.l} className={`rounded-lg border p-3 ${c.warn ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center justify-between gap-2">
              <c.i className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold tabular-nums text-foreground">{c.v}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{c.l}</p>
            {c.sub && <p className="text-[11px] text-muted-foreground">{c.sub}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
