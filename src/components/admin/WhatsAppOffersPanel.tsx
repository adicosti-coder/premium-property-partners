import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Aceeași regulă de detectare a ofertei ca în wa-andrei-reply
const OFFER_RE = /\d[\d.\s]*\s?(€|eur\b|euro)|randament|9[,.]4\s*%|15\s*[-–]\s*20\s*%|evaluare(a)? gratuit|\/proprietate\/|\/imobiliare|\/anunt|\bofert/i;
const STAGE: Record<string, string> = { nou_necontactat: "Nou", contactat: "Contactat", ofertat: "Ofertat", contractat: "Contractat", pierdut: "Pierdut" };

interface Row {
  id: string; content: string; created_at: string; delivery_status: string | null;
  phone: string; ownerName: string | null;
  listing: { title: string | null; price: number | null; currency: string | null; zone: string | null; source_url: string | null } | null;
  stage: string | null;
}

const fmtPrice = (p: number | null, c: string | null) => (p ? `${Number(p).toLocaleString("ro-RO")} ${c === "RON" ? "lei" : "€"}` : "—");
const offerPrice = (t: string) => t.match(/\d{1,3}(?:[.\s]\d{3})+\s?(?:€|eur)|\d+[,.]?\d*\s?%/i)?.[0] ?? null;
const offerLink = (t: string) => t.match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") ?? null;

const WhatsAppOffersPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: msgs } = await supabase.from("wa_messages")
      .select("id, conversation_id, content, created_at, delivery_status")
      .eq("direction", "outbound").eq("role", "assistant")
      .order("created_at", { ascending: false }).limit(500);
    const offers = (msgs ?? []).filter((m) => m.content && OFFER_RE.test(m.content));
    const convIds = [...new Set(offers.map((m) => m.conversation_id))];
    const { data: convs } = convIds.length
      ? await supabase.from("wa_conversations").select("id, phone_normalized, prospect_id, wa_profile_name").in("id", convIds)
      : { data: [] as any[] };
    const convMap = new Map((convs ?? []).map((c: any) => [c.id, c]));
    const prospectIds = [...new Set((convs ?? []).map((c: any) => c.prospect_id).filter(Boolean))];
    const phones = [...new Set((convs ?? []).map((c: any) => c.phone_normalized).filter(Boolean))];
    const [{ data: listings }, { data: leads }] = await Promise.all([
      prospectIds.length
        ? supabase.from("prospect_listings").select("id, title, price, currency, zone, source_url, contact_name").in("id", prospectIds)
        : Promise.resolve({ data: [] as any[] }),
      phones.length
        ? supabase.from("leads").select("whatsapp_number, crm_status, name").in("whatsapp_number", phones)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const lMap = new Map((listings ?? []).map((l: any) => [l.id, l]));
    const leadMap = new Map((leads ?? []).map((l: any) => [l.whatsapp_number, l]));
    setRows(offers.map((m) => {
      const c: any = convMap.get(m.conversation_id) ?? {};
      const l: any = c.prospect_id ? lMap.get(c.prospect_id) : null;
      const lead: any = leadMap.get(c.phone_normalized);
      return {
        id: m.id, content: m.content, created_at: m.created_at, delivery_status: m.delivery_status,
        phone: c.phone_normalized ?? "—", ownerName: lead?.name ?? l?.contact_name ?? c.wa_profile_name ?? null,
        listing: l, stage: lead?.crm_status ?? null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const ofertat = rows.filter((r) => r.stage === "ofertat").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Oferte WhatsApp</h2>
          <p className="text-sm text-muted-foreground">{rows.length} oferte trimise de Andrei · {ofertat} lead-uri în etapa Ofertat</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Reîncarcă
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Andrei nu a trimis încă nicio ofertă pe WhatsApp.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const link = offerLink(r.content) ?? r.listing?.source_url ?? null;
            return (
              <Card key={r.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium [overflow-wrap:anywhere]">{r.listing?.title ?? "Anunț necunoscut"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.ownerName ?? "Proprietar"} · {r.phone} · {r.listing?.zone ?? "zonă necunoscută"} · {new Date(r.created_at).toLocaleString("ro-RO")}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={r.stage === "ofertat" ? "default" : "secondary"}>{r.stage ? STAGE[r.stage] ?? r.stage : "Fără lead"}</Badge>
                    {r.delivery_status && <Badge variant="outline">{r.delivery_status}</Badge>}
                  </div>
                </div>
                <div className="flex gap-4 text-sm flex-wrap">
                  <span><span className="text-muted-foreground">Preț anunț:</span> {fmtPrice(r.listing?.price ?? null, r.listing?.currency ?? null)}</span>
                  {offerPrice(r.content) && <span><span className="text-muted-foreground">În ofertă:</span> {offerPrice(r.content)}</span>}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      Link anunț <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere] bg-muted/50 rounded-md p-2">{r.content}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WhatsAppOffersPanel;
