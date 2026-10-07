import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, PhoneOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ManualProspectingStats from "@/components/admin/ManualProspectingStats";

type Row = {
  id: string;
  updated_at?: string;
  created_at: string;
  prospect_listing_id: string;
  prospect_listings: {
    title: string | null; zone: string | null; price: number | null; rooms: number | null;
    category: string | null; source_platform: string | null; source_url: string | null;
  } | null;
};

export default function ManualProspectingPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["manual-prospecting-no-phone"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("listing_inspections") as any)
        .select("id, created_at, prospect_listing_id, prospect_listings(title, zone, price, rooms, category, source_platform, source_url)")
        .eq("status", "no_phone")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const retry = async (prospectId: string) => {
    setBusy(prospectId);
    const { data, error } = await supabase.functions.invoke("prospect-recover-phone", { body: { prospect_id: prospectId } });
    setBusy(null);
    if (error || !data?.success) return toast.error("Nu am putut citi pagina anunțului");
    if (data.found) toast.success(`Telefon găsit: ${data.phone} — anunțul merge la inspecție`);
    else toast.info("Tot fără telefon — contactați manual de pe pagina anunțului");
    setTimeout(() => q.refetch(), 4000);
  };

  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <ManualProspectingStats />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PhoneOff className="h-4 w-4" /> Prospectare Manuală (Fără Telefon)
          </h3>
          <p className="text-sm text-muted-foreground">
            Anunțuri fără număr de mobil — nu sunt trimise pe WhatsApp la inspecție. {rows.length} în listă.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className="h-4 w-4 mr-1" /> Reîncarcă
        </Button>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun anunț fără telefon.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((r) => {
            const p = r.prospect_listings;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p?.title || "Fără titlu"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p?.zone || "—"} · {p?.rooms ? `${p.rooms} cam.` : "—"} · {p?.price ? `${Number(p.price).toLocaleString("ro-RO")} €` : "—"} · {new Date(r.created_at).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                {p?.category && <Badge variant="secondary">{p.category}</Badge>}
                {p?.source_platform && <Badge variant="outline">{p.source_platform}</Badge>}
                <Button size="sm" variant="outline" disabled={busy === r.prospect_listing_id} onClick={() => retry(r.prospect_listing_id)}>
                  {busy === r.prospect_listing_id ? "Caut…" : "Caută iar telefonul"}
                </Button>
                {p?.source_url && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer" aria-label="Deschide anunțul original">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
