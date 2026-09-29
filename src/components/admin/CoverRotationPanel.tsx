import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { properties as staticProps } from "@/data/properties";

interface Row { id: string; slug: string | null; name: string; seo_title: string | null; image_path: string | null; images: string[] | null }

const toUrl = (p: string) =>
  p.startsWith("http") || p.startsWith("/") ? p : supabase.storage.from("property-images").getPublicUrl(p).data.publicUrl;

/** Admin / Rotire Coperți — toate pozele fiecărui apartament; clic = copertă nouă, live pe /cazare. */
export default function CoverRotationPanel({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [extra, setExtra] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rotateText, setRotateText] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("properties")
      .select("id, slug, name, seo_title, image_path, images")
      .eq("listing_type", "cazare").eq("is_active", true).order("display_order");
    const list = (data ?? []) as Row[];
    setRows(list);
    if (list.length) {
      const { data: im } = await supabase.from("property_images")
        .select("property_id, image_path").in("property_id", list.map((r) => r.id)).order("display_order");
      const m: Record<string, string[]> = {};
      (im ?? []).forEach((r) => { (m[r.property_id] ||= []).push(r.image_path); });
      setExtra(m);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-cover-rotation")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const setCover = async (r: Row, path: string) => {
    setBusy(r.id);
    const patch: { image_path: string; seo_title?: string; seo_description?: string } = { image_path: path };
    if (rotateText) {
      const { data: sg } = await supabase.from("property_seo_suggestions").select("titles, descriptions").eq("property_id", r.id).maybeSingle();
      const titles = (sg?.titles as string[] | null) ?? [];
      const descs = (sg?.descriptions as string[] | null) ?? [];
      if (titles.length) {
        const i = (titles.indexOf(r.seo_title ?? "") + 1) % titles.length;
        patch.seo_title = titles[i];
        if (descs.length) patch.seo_description = descs[i % descs.length].split("\n")[0];
      }
    }
    const { error } = await supabase.from("properties").update(patch).eq("id", r.id);
    setBusy(null);
    if (error) { toast({ title: "Eroare", description: error.message, variant: "destructive" }); return; }
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    toast({ title: "Coperta a fost schimbată", description: "Apare imediat pe realtrust.ro/cazare." });
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="text-xl font-semibold text-foreground">Rotire coperți</h2>
          <p className="text-sm text-muted-foreground">Apasă pe o poză ca s-o faci copertă. Schimbarea apare în timp real în lista de cazare.</p>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-foreground min-h-12">
        <input type="checkbox" checked={rotateText} onChange={(e) => setRotateText(e.target.checked)} className="w-5 h-5" />
        La schimbarea copertei, rotește și titlul + descrierea SEO Andrei AI (test A/B live)
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const st = staticProps.find((s) => s.slug === r.slug);
          const all = Array.from(new Set([...(extra[r.id] ?? []), ...(r.images ?? []), ...(st?.images ?? [])])).filter(Boolean);
          const current = r.image_path || all[0];
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground line-clamp-1">{r.seo_title || r.name}</p>
                {r.slug && (
                  <a href={`/proprietate/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Deschide anunțul" className="text-muted-foreground min-h-12 min-w-12 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {current && <img src={toUrl(current)} alt="Coperta actuală" className="w-full h-40 object-cover rounded-lg border-2 border-gold" />}
              <div className="grid grid-cols-5 gap-1.5">
                {all.slice(0, 20).map((p) => (
                  <button key={p} type="button" disabled={busy === r.id} onClick={() => setCover(r, p)}
                    aria-label="Setează ca copertă"
                    className={`relative rounded overflow-hidden border-2 ${p === current ? "border-gold" : "border-border hover:border-primary"}`}>
                    <img src={toUrl(p)} alt="" loading="lazy" className="w-full h-14 object-cover" />
                    {p === current && <Star className="absolute top-0.5 right-0.5 w-3 h-3 fill-current text-gold" />}
                  </button>
                ))}
              </div>
              {busy === r.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              {!all.length && <p className="text-xs text-muted-foreground">Nicio poză disponibilă.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
