import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SourceLink from "@/components/admin/shared/SourceLink";

type Row = { id: string; title: string | null; price: number | null; zone: string | null; location: string | null; phone_normalized: string | null; contact_phone: string | null; source_url: string | null; reason: "no_mobile" | "no_reply" };
const isMobile = (p?: string | null) => /^\+407\d{8}$/.test(p ?? "");
const COLS = "id, title, price, zone, location, phone_normalized, contact_phone, source_url";

export default function CallsToMakePanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["calls-to-make"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Row[]> => {
      const since14 = new Date(Date.now() - 14 * 864e5).toISOString();
      const before48 = new Date(Date.now() - 48 * 3600e3).toISOString();
      const [a, b] = await Promise.all([
        (supabase.from("prospect_listings") as any).select(COLS).eq("is_active", true).is("published_at", null)
          .eq("do_not_call", false).gte("created_at", since14).order("created_at", { ascending: false }).limit(300),
        (supabase.from("wa_outbound_queue") as any).select("prospect_listing_id").eq("status", "sent")
          .is("replied_at", null).lte("sent_at", before48).not("prospect_listing_id", "is", null).limit(300),
      ]);
      if (a.error) throw a.error;
      const noMobile: Row[] = (a.data ?? []).filter((r: any) => !isMobile(r.phone_normalized)).map((r: any) => ({ ...r, reason: "no_mobile" }));
      const ids = [...new Set((b.data ?? []).map((x: any) => x.prospect_listing_id))] as string[];
      let noReply: Row[] = [];
      if (ids.length) {
        const { data } = await (supabase.from("prospect_listings") as any).select(COLS).in("id", ids).eq("is_active", true).is("published_at", null).eq("do_not_call", false);
        noReply = (data ?? []).map((r: any) => ({ ...r, reason: "no_reply" }));
      }
      return [...noMobile, ...noReply];
    },
  });

  const confirmCall = async (id: string) => {
    if (!confirm("Confirmi că proprietarul a fost sunat și și-a dat acordul verbal? Anunțul va fi publicat pe realtrust.ro.")) return;
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("admin-manual-publish", { body: { prospect_id: id, reason: "verbal_consent_call" } });
    setBusy(null);
    if (error) return toast.error("Publicarea a eșuat");
    if (data?.published) toast.success("Anunț aprobat și publicat pe realtrust.ro");
    else toast.info(`Nepublicat: ${data?.reason ?? "motiv necunoscut"}`);
    q.refetch();
  };

  const rows = q.data ?? [];
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Apeluri de făcut · {rows.length}</h3>
        <p className="text-sm text-muted-foreground">Prospecte fără mobil WhatsApp și prospecte fără răspuns la 48h după primul mesaj.</p>
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
      {!q.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Nimic de sunat acum.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Titlu</th><th className="p-2">Preț</th><th className="p-2">Cartier</th><th className="p-2">Telefon</th><th className="p-2">Anunț</th><th className="p-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const phone = r.phone_normalized || r.contact_phone;
              return (
                <tr key={`${r.reason}-${r.id}`}>
                  <td className="p-2 max-w-[260px]">
                    <div className="truncate">{r.title || "Fără titlu"}</div>
                    <Badge variant="secondary" className="text-[10px] mt-1">{r.reason === "no_mobile" ? "Fără mobil" : "Fără răspuns 48h"}</Badge>
                  </td>
                  <td className="p-2 whitespace-nowrap">{r.price ? `${Number(r.price).toLocaleString("ro-RO")} €` : "—"}</td>
                  <td className="p-2">{r.zone || r.location || "—"}</td>
                  <td className="p-2 whitespace-nowrap">{phone ? <a className="text-primary underline" href={`tel:${phone}`}>{phone}</a> : "—"}</td>
                  <td className="p-2"><SourceLink url={r.source_url} /></td>
                  <td className="p-2">
                    <Button size="sm" className="min-h-[44px]" disabled={busy === r.id} onClick={() => confirmCall(r.id)}>
                      {busy === r.id ? "Public…" : "A fost apelat - Acord verbal primit"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
