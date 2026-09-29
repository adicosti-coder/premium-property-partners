import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

const RANGES = [7, 30, 90];

interface Stats { views: number; cazare: number; contact: number; evaluare: number; active: number }

/** Raport conversii din listele de anunțuri: vizite → clic „Cazare” → formular contact/evaluare. */
export default function ListingConversionReport() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const c = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
    Promise.all([
      c(supabase.from("property_views").select("id", { count: "exact", head: true }).gte("viewed_at", since)),
      c(supabase.from("cta_analytics").select("id", { count: "exact", head: true }).eq("cta_type", "listing_cazare_click").gte("created_at", since)),
      c(supabase.from("cta_analytics").select("id", { count: "exact", head: true }).eq("cta_type", "form_submit").ilike("page_path", "/contact%").gte("created_at", since)),
      c(supabase.from("leads").select("id", { count: "exact", head: true }).ilike("source", "%evaluare%").gte("created_at", since)),
      c(supabase.from("properties").select("id", { count: "exact", head: true }).eq("is_active", true)),
    ]).then(([views, cazare, contact, evaluare, active]) => setS({ views, cazare, contact, evaluare, active }));
  }, [days]);

  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
  const cards = s ? [
    { l: "Vizite în anunțuri (pagini Proprietăți)", v: s.views },
    { l: "Clicuri „Cazare / Rezervă”", v: s.cazare, r: pct(s.cazare, s.views) },
    { l: "Formulare contact trimise", v: s.contact, r: pct(s.contact, s.views) },
    { l: "Formulare evaluare trimise", v: s.evaluare, r: pct(s.evaluare, s.views) },
    { l: "Anunțuri active", v: s.active },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Conversii anunțuri</h2>
          <p className="text-sm text-muted-foreground">Rata e calculată față de vizitele în anunțuri.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)} className="min-h-12">{d} zile</Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {s ? cards.map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.l}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{c.v}</p>
            {c.r && <p className="text-xs text-primary mt-1">conversie {c.r}</p>}
          </div>
        )) : <p className="text-sm text-muted-foreground">Se încarcă…</p>}
      </div>
      <p className="text-xs text-muted-foreground">Clicurile „Cazare” se înregistrează de la această versiune; datele anterioare nu există.</p>
    </div>
  );
}
