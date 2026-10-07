import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ManualDailyIntake() {
  const q = useQuery({
    queryKey: ["manual-daily-intake"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data, error } = await (supabase.from("listing_inspections") as any)
        .select("created_at").eq("status", "no_phone").gte("created_at", since).limit(5000);
      if (error) throw error;
      const m = new Map<string, number>();
      for (let i = 13; i >= 0; i--) m.set(new Date(Date.now() - i * 86400000).toLocaleDateString("ro-RO"), 0);
      (data ?? []).forEach((r: any) => {
        const k = new Date(r.created_at).toLocaleDateString("ro-RO");
        if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
      });
      return [...m.entries()];
    },
  });
  const rows = q.data ?? [];
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-medium mb-1">Anunțuri noi în Prospectare Manuală pe zi (ultimele 14 zile)</p>
      <p className="text-xs text-muted-foreground mb-2">Scanare automată OLX + Storia la 08:00, 12:00, 16:00 și 20:00.</p>
      <div className="flex items-end gap-1 h-24">
        {rows.map(([d, n]) => (
          <div key={d} className="flex-1 flex flex-col items-center gap-1" title={`${d}: ${n}`}>
            <span className="text-[10px] text-muted-foreground">{n}</span>
            <div className="w-full rounded-sm bg-primary" style={{ height: `${(n / max) * 64 + 2}px` }} />
            <span className="text-[9px] text-muted-foreground">{d.slice(0, 5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
