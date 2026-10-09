import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";

type Row = {
  id: string; url: string; phone_number: string | null; channel: string; calculated_score: number | null;
  pdf_downloads: number; pdf_downloaded_at: string | null; created_at: string;
  extracted_data: any; negotiation_range: any;
};
const eur = (n: unknown) => (Number(n) ? `${Math.round(Number(n)).toLocaleString("ro-RO")} €` : "—");
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—");

export default function AnalysisPdfReportsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const [{ data }, { count }] = await Promise.all([
      (supabase.from("analyzed_listings") as any).select("id, url, phone_number, channel, calculated_score, pdf_downloads, pdf_downloaded_at, created_at, extracted_data, negotiation_range")
        .gt("pdf_downloads", 0).order("pdf_downloaded_at", { ascending: false }).limit(300),
      (supabase.from("analyzed_listings") as any).select("id", { count: "exact", head: true }),
    ]);
    setRows((data ?? []) as Row[]);
    setTotal(count ?? 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const downloads = rows.reduce((s, r) => s + (r.pdf_downloads || 0), 0);
  const rate = total ? Math.round((rows.length / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Rapoarte PDF descărcate</CardTitle>
          <p className="text-sm text-muted-foreground">
            {rows.length} din {total} analize au descărcat raportul ({rate}%) · {downloads} descărcări în total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 min-h-12">
          <RefreshCw className="h-4 w-4" /> Reîncarcă
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="p-2">Ultima descărcare</th><th className="p-2">Anunț</th><th className="p-2">Scor</th><th className="p-2">Preț cerut</th><th className="p-2">Preț țintă</th><th className="p-2">Descărcări</th><th className="p-2">Telefon</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{dt(r.pdf_downloaded_at)}</td>
                <td className="p-2 max-w-xs">
                  <div className="font-medium truncate">{r.extracted_data?.titlu || "—"}</div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {new URL(r.url).hostname.replace(/^www\./, "")} <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="p-2 font-semibold">{r.calculated_score ?? "—"}</td>
                <td className="p-2 whitespace-nowrap">{eur(r.extracted_data?.pret_listare)}</td>
                <td className="p-2 whitespace-nowrap">{eur(r.negotiation_range?.target_low)} – {eur(r.negotiation_range?.target_high)}</td>
                <td className="p-2"><Badge variant="secondary">{r.pdf_downloads}</Badge></td>
                <td className="p-2 whitespace-nowrap">{r.phone_number || "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{loading ? "Se încarcă…" : "Niciun raport descărcat încă."}</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
