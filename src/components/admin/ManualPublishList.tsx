import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ManualPublishList() {
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["awaiting-consent-list"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("listing_inspections") as any)
        .select("id, prospect_listing_id, clean_title, price, neighborhood, prospect_listings(category, title)")
        .in("status", ["approved_waiting_consent", "no_phone", "pending"])
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const publish = async (id: string) => {
    if (!confirm("Publici anunțul pe realtrust.ro fără „DA” de la proprietar? Asigură-te că ai acordul lui (ex. la telefon).")) return;
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("admin-manual-publish", { body: { prospect_id: id } });
    setBusy(null);
    if (error || !data?.success) return toast.error("Publicarea a eșuat");
    if (data.published) toast.success("Anunț publicat pe realtrust.ro");
    else toast.info(`Nepublicat: ${data.reason}`);
    q.refetch();
  };
  const rows = q.data as any[] | undefined ?? [];
  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <p className="text-sm font-medium">Publicare manuală (când „DA” nu vine) · {rows.length}</p>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 text-xs">
            <span className="flex-1 min-w-0 truncate">{r.clean_title || r.prospect_listings?.title || "Fără titlu"}</span>
            <span className="text-muted-foreground">{r.prospect_listings?.category ?? "—"}</span>
            <Button size="sm" disabled={busy === r.prospect_listing_id} onClick={() => publish(r.prospect_listing_id)}>
              {busy === r.prospect_listing_id ? "Public…" : "Publică manual"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
