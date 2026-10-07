import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name: string; slug: string | null; created_at: string; views: number; requests: number; income: number };

export default function PublishedListingGains() {
  const q = useQuery({
    queryKey: ["published-listing-gains"],
    queryFn: async () => {
      const { data: props, error } = await (supabase.from("properties") as any)
        .select("id, name, slug, created_at").not("migrated_from_prospect_id", "is", null)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const list = (props ?? []) as any[];
      if (!list.length) return [] as Row[];
      const ids = list.map((p) => p.id);
      const slugs = list.map((p) => p.slug).filter(Boolean);
      const [v, r, f] = await Promise.all([
        (supabase.from("property_views") as any).select("property_id, viewed_at").in("property_id", ids).limit(20000),
        slugs.length ? (supabase.from("property_requests") as any).select("source_property_slug, created_at").in("source_property_slug", slugs).limit(5000) : Promise.resolve({ data: [] }),
        (supabase.from("financial_records") as any).select("property_id, type, amount, date").in("property_id", ids).limit(5000),
      ]);
      return list.map((p) => {
        const since = new Date(p.created_at).getTime();
        const after = (d: string) => new Date(d).getTime() >= since;
        return {
          ...p,
          views: (v.data ?? []).filter((x: any) => x.property_id === p.id && after(x.viewed_at)).length,
          requests: (r.data ?? []).filter((x: any) => x.source_property_slug === p.slug && after(x.created_at)).length,
          income: (f.data ?? []).filter((x: any) => x.property_id === p.id && after(x.date) && String(x.type).toLowerCase().startsWith("inc"))
            .reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
        } as Row;
      });
    },
  });
  const rows = q.data ?? [];
  const total = rows.reduce((s, r) => s + r.income, 0);
  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Câștig real pe anunț (de la publicarea pe realtrust.ro)</p>
        <span className="text-sm font-semibold">{total.toLocaleString("ro-RO")} € total</span>
      </div>
      {q.isLoading ? <p className="text-xs text-muted-foreground">Se încarcă…</p> : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Încă niciun anunț preluat publicat.</p>
      ) : (
        <div className="divide-y divide-border text-xs">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap gap-3 py-2">
              <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
              <span className="text-muted-foreground">din {new Date(r.created_at).toLocaleDateString("ro-RO")}</span>
              <span>{r.views} vizite</span>
              <span>{r.requests} cereri</span>
              <span className="font-semibold">{r.income.toLocaleString("ro-RO")} €</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Câștigul vine din veniturile înregistrate în Financiar pentru fiecare proprietate.</p>
    </div>
  );
}
