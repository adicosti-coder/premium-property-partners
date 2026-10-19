import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SourceLink } from "@/components/admin/shared/SourceLink";
import AndreiBatchCampaignControl from "@/components/admin/AndreiBatchCampaignControl";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

type Row = { id: string; title: string | null; price: number | null; zone: string | null; location: string | null; phone_normalized: string | null; contact_phone: string | null; source_url: string | null; seller_type?: string | null; seller_type_reason?: string | null; reason: "no_mobile" | "no_reply" | "no_whatsapp" };
const isMobile = (p?: string | null) => /^\+407\d{8}$/.test(p ?? "");
const toE164 = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "").replace(/^0040/, "40");
  const n = d.startsWith("40") ? d : d.startsWith("0") ? `40${d.slice(1)}` : d;
  return n ? `+${n}` : "";
};
const COLS = "id, title, price, zone, location, phone_normalized, contact_phone, source_url, seller_type, seller_type_reason";
const SELLER: Record<string, { label: string; v: "default" | "destructive" | "outline" }> = {
  privat: { label: "Proprietar Privat", v: "default" },
  agentie: { label: "Agenție", v: "destructive" },
  de_verificat: { label: "De verificat", v: "outline" },
};
const REASON_LABELS: Record<Row["reason"], string> = {
  no_mobile: "Fără mobil",
  no_reply: "Fără răspuns 48h",
  no_whatsapp: "Fără WhatsApp",
};

export default function CallsToMakePanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [calling, setCalling] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["calls-to-make"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Row[]> => {
      const since14 = new Date(Date.now() - 14 * 864e5).toISOString();
      const before48 = new Date(Date.now() - 48 * 3600e3).toISOString();
      const [a, b, c] = await Promise.all([
        (supabase.from("prospect_listings") as any).select(COLS).eq("is_active", true).is("published_at", null)
          .eq("do_not_call", false).gte("created_at", since14).order("created_at", { ascending: false }).limit(300),
        (supabase.from("wa_outbound_queue") as any).select("prospect_listing_id").eq("status", "sent")
          .is("replied_at", null).lte("sent_at", before48).not("prospect_listing_id", "is", null).limit(300),
        // Erori Meta 131026 (numărul nu are WhatsApp) → de sunat direct.
        (supabase.from("wa_outbound_queue") as any).select("prospect_listing_id").eq("status", "failed")
          .ilike("last_error", "%131026%").not("prospect_listing_id", "is", null).limit(300),
      ]);
      if (a.error) throw a.error;
      const noMobile: Row[] = (a.data ?? []).filter((r: any) => !isMobile(r.phone_normalized)).map((r: any) => ({ ...r, reason: "no_mobile" }));
      const ids = [...new Set((b.data ?? []).map((x: any) => x.prospect_listing_id))] as string[];
      let noReply: Row[] = [];
      if (ids.length) {
        const { data } = await (supabase.from("prospect_listings") as any).select(COLS).in("id", ids).eq("is_active", true).is("published_at", null).eq("do_not_call", false);
        noReply = (data ?? []).map((r: any) => ({ ...r, reason: "no_reply" }));
      }
      const waIds = [...new Set((c.data ?? []).map((x: any) => x.prospect_listing_id))] as string[];
      let noWhatsApp: Row[] = [];
      if (waIds.length) {
        const { data } = await (supabase.from("prospect_listings") as any).select(COLS).in("id", waIds).eq("is_active", true).is("published_at", null).eq("do_not_call", false);
        noWhatsApp = (data ?? []).map((r: any) => ({ ...r, reason: "no_whatsapp" }));
      }
      const seen = new Set<string>();
      return [...noWhatsApp, ...noMobile, ...noReply].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
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

  const callAndrei = async (r: Row) => {
    const to = toE164(r.phone_normalized || r.contact_phone);
    if (!to) return toast.error("Număr invalid");
    if (!confirm(`Andrei îl va suna acum pe ${to} pentru „${r.title || "anunț"}”. Continui?`)) return;
    setCalling(r.id);
    const { data, error } = await supabase.functions.invoke("voice-agent-initiate", { body: { toNumber: to, prospectId: r.id } });
    setCalling(null);
    if (error) return toast.error("Apelul nu a pornit");
    if (data?.skipped) return toast.info(data.message || `Apel blocat: ${data.skipped}`);
    if (data?.error) return toast.error(data.error);
    toast.success("Andrei sună acum. Rezultatul apare la prospect după apel.");
  };

  const rows = q.data ?? [];

  useWebMCP({
    name: "list_calls_to_make",
    description: "List the owner prospects currently shown in 'Apeluri de făcut', with reason and zone.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () =>
      runWebMCPTool("list_calls_to_make", () => {
        if (q.isLoading) return "Still loading.";
        if (rows.length === 0) return "No calls to make right now.";
        return rows.map((r) => `${r.id}: ${r.title || "Fără titlu"} · ${r.zone || r.location || "—"} · ${REASON_LABELS[r.reason]}`).join("\n");
      }),
  });
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Apeluri de făcut · {rows.length}</h3>
        <p className="text-sm text-muted-foreground">Prospecte fără WhatsApp (eroare Meta), fără mobil valid sau fără răspuns la 48h după primul mesaj.</p>
      </div>
      <AndreiBatchCampaignControl />
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
                    <Badge variant={r.reason === "no_whatsapp" ? "destructive" : "secondary"} className="text-[10px] mt-1">{REASON_LABELS[r.reason]}</Badge>
                    {r.seller_type && SELLER[r.seller_type] && (
                      <Badge variant={SELLER[r.seller_type].v} title={r.seller_type_reason || undefined} className="text-[10px] mt-1 ml-1">{SELLER[r.seller_type].label}</Badge>
                    )}
                    {r.seller_type === "de_verificat" && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] ml-1" onClick={async () => {
                        const { error } = await (supabase.from("prospect_listings") as any).update({ agency_classified_at: new Date().toISOString(), agency_suspicion_score: 0 }).eq("id", r.id);
                        if (error) toast.error(error.message); else { toast.success("Marcat ca proprietar privat"); q.refetch(); }
                      }}>Confirmă proprietar</Button>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{r.price ? `${Number(r.price).toLocaleString("ro-RO")} €` : "—"}</td>
                  <td className="p-2">{r.zone || r.location || "—"}</td>
                  <td className="p-2 whitespace-nowrap">{phone ? <a className="text-primary underline" href={`tel:${phone}`}>{phone}</a> : "—"}</td>
                  <td className="p-2"><SourceLink url={r.source_url} /></td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      {isMobile(toE164(phone)) && (
                        <Button size="sm" variant="secondary" className="min-h-[44px]" disabled={calling === r.id} onClick={() => callAndrei(r)}>
                          {calling === r.id ? "Se apelează…" : "Sune Andrei (Agent AI)"}
                        </Button>
                      )}
                      <Button size="sm" className="min-h-[44px]" disabled={busy === r.id} onClick={() => confirmCall(r.id)}>
                        {busy === r.id ? "Public…" : "A fost apelat - Acord verbal primit"}
                      </Button>
                    </div>
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
