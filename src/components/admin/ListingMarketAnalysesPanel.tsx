import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";

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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("listing_market_analyses")
      .select("id, created_at, channel, phone, source_url, title, zone, rooms, size, price, total_score, negotiation_eur, target_low, target_high")
      .order("created_at", { ascending: false }).limit(300);
    setRows((data ?? []) as Row[]);
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
              <tr><th className="p-2">Data</th><th className="p-2">Canal</th><th className="p-2">Anunț</th><th className="p-2">Preț cerut</th><th className="p-2">Scor</th><th className="p-2">Negociere</th><th className="p-2">Preț țintă</th><th className="p-2">Telefon</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{dt(r.created_at)}</td>
                  <td className="p-2"><Badge variant={r.channel === "whatsapp" ? "default" : "secondary"}>{r.channel === "whatsapp" ? "WhatsApp" : "Site"}</Badge></td>
                  <td className="p-2 max-w-xs">
                    <div className="font-medium truncate">{r.title || "—"}</div>
                    <div className="text-xs text-muted-foreground">{[r.zone, r.rooms ? `${r.rooms} cam.` : null, r.size ? `${r.size} m²` : null].filter(Boolean).join(" · ")}</div>
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
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{loading ? "Se încarcă…" : "Nicio analiză încă."}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
