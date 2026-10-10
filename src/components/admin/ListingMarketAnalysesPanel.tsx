import { useEffect, useMemo, useState } from "react";
import { GoogleMapButton } from "@/components/maps/GoogleMapEmbed";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string; created_at: string; channel: string; phone: string | null; source_url: string | null;
  title: string | null; zone: string | null; rooms: number | null; size: number | null; price: number | null;
  total_score: number | null; negotiation_eur: number | null; target_low: number | null; target_high: number | null;
};

const eur = (n: number | null) => (n ? `${Math.round(n).toLocaleString("ro-RO")} €` : "—");
const dt = (s: string) => new Date(s).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" });

export default function ListingMarketAnalysesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  // source_url → { prospectId, consent: granted|published|requested|none }
  const [consents, setConsents] = useState<Record<string, { prospectId: string; status: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadConsents = async (list: Row[]) => {
    const urls = Array.from(new Set(list.map((r) => r.source_url).filter(Boolean))) as string[];
    if (!urls.length) return;
    const variants = urls.flatMap((u) => { const b = u.replace(/^https:\/\/www\./, "https://"); return [u, b, b.replace("https://", "https://www.")]; });
    const { data: pros } = await (supabase.from("prospect_listings") as any).select("id, source_url").in("source_url", Array.from(new Set(variants)).slice(0, 300));
    const ids = (pros ?? []).map((p: any) => p.id);
    const { data: cs } = ids.length
      ? await (supabase.from("wa_publish_consents") as any).select("prospect_listing_id, status, consented_at, revoked_at").in("prospect_listing_id", ids)
      : { data: [] };
    const out: Record<string, { prospectId: string; status: string }> = {};
    const key = (u: string) => u.replace(/^https:\/\/(www\.)?/, "");
    for (const p of pros ?? []) {
      const c = (cs ?? []).filter((x: any) => x.prospect_listing_id === p.id && !x.revoked_at);
      const st = c.find((x: any) => x.status === "published") ? "published" : c.find((x: any) => x.consented_at) ? "granted" : c.length ? "requested" : "none";
      out[key(p.source_url)] = { prospectId: p.id, status: st };
    }
    const mapped: Record<string, { prospectId: string; status: string }> = {};
    for (const u of urls) if (out[key(u)]) mapped[u] = out[key(u)];
    setConsents(mapped);
  };

  const publish = async (url: string) => {
    const c = consents[url];
    if (!c || c.status !== "granted") return;
    if (!confirm("Publici anunțul pe realtrust.ro? Proprietarul a răspuns „DA”.")) return;
    setBusy(url);
    const { data, error } = await supabase.functions.invoke("publish-consented-listing", { body: { prospect_id: c.prospectId } });
    setBusy(null);
    if (error || !(data as any)?.success) toast.error((data as any)?.error || "Publicarea a eșuat.");
    else { toast.success("Anunț publicat pe realtrust.ro."); setConsents((s) => ({ ...s, [url]: { ...c, status: "published" } })); }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("listing_market_analyses")
      .select("id, created_at, channel, phone, source_url, title, zone, rooms, size, price, total_score, negotiation_eur, target_low, target_high")
      .order("created_at", { ascending: false }).limit(300);
    setRows((data ?? []) as Row[]);
    loadConsents((data ?? []) as Row[]).catch(() => undefined);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => [r.title, r.zone, r.phone, r.source_url].some((v) => v?.toLowerCase().includes(s))) : rows;
  }, [rows, q]);
  const wa = rows.filter((r) => r.channel === "whatsapp").length;
  const withPhone = rows.filter((r) => r.phone).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Analize anunțuri</CardTitle>
          <p className="text-sm text-muted-foreground">
            {rows.length} cereri · {wa} din WhatsApp · {withPhone} cu telefon (lead)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Reîncarcă
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Caută după zonă, titlu, telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="p-2">Data</th><th className="p-2">Canal</th><th className="p-2">Anunț</th><th className="p-2">Preț cerut</th><th className="p-2">Scor</th><th className="p-2">Negociere</th><th className="p-2">Preț țintă</th><th className="p-2">Telefon</th><th className="p-2">Publicare</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{dt(r.created_at)}</td>
                  <td className="p-2"><Badge variant={r.channel === "whatsapp" ? "default" : "secondary"}>{r.channel === "whatsapp" ? "WhatsApp" : "Site"}</Badge></td>
                  <td className="p-2 max-w-xs">
                    <div className="font-medium truncate">{r.title || "—"}</div>
                    <div className="text-xs text-muted-foreground">{[r.zone, r.rooms ? `${r.rooms} cam.` : null, r.size ? `${r.size} m²` : null].filter(Boolean).join(" · ")}</div>
                    <GoogleMapButton query={r.zone} title={r.title || "Locație anunț"} />
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {new URL(r.source_url).hostname.replace(/^www\./, "")} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{eur(r.price)}</td>
                  <td className="p-2 font-semibold">{r.total_score ?? "—"}</td>
                  <td className="p-2 whitespace-nowrap">~{eur(r.negotiation_eur)}</td>
                  <td className="p-2 whitespace-nowrap">{eur(r.target_low)} – {eur(r.target_high)}</td>
                  <td className="p-2 whitespace-nowrap">{r.phone ? <a className="text-primary hover:underline" href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^0/, "40")}`} target="_blank" rel="noopener noreferrer">{r.phone}</a> : "—"}</td>
                  <td className="p-2 whitespace-nowrap">{(() => {
                    const c = r.source_url ? consents[r.source_url] : undefined;
                    if (c?.status === "published") return <Badge>Publicat</Badge>;
                    return (
                      <Button size="sm" className="min-h-12 gap-1" disabled={c?.status !== "granted" || busy === r.source_url}
                        title={c?.status === "granted" ? "Proprietarul a răspuns DA" : "Necesită acordul „DA” al proprietarului"}
                        onClick={() => r.source_url && publish(r.source_url)}>
                        <Upload className="h-4 w-4" /> Publică pe realtrust.ro
                      </Button>
                    );
                  })()}
                    {(() => { const c = r.source_url ? consents[r.source_url] : undefined; return c && c.status !== "published" ? <div className="text-xs text-muted-foreground mt-1">{c.status === "granted" ? "Acord DA primit" : c.status === "requested" ? "Acord cerut" : "Fără acord"}</div> : !c ? <div className="text-xs text-muted-foreground mt-1">Nu e în scraper</div> : null; })()}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">{loading ? "Se încarcă…" : "Nicio analiză încă."}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
