/**
 * Raport zilnic: prețurile înregistrate pe zi, durata medie de stat pe sursă
 * și scăderile de preț din ziua respectivă, pentru a vedea trendul.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingSourceSamples, { type Sample } from "@/components/admin/ListingSourceSamples";
import { bucharestDayRange } from "@/lib/bucharestDay";
import { isSearchPageUrl } from "@/lib/listingUrl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, CalendarDays } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";

interface Row {
  day: string;
  listings_count: number;
  avg_price: number | null;
  avg_price_per_sqm: number | null;
  avg_source_days: number | null;
  drops_count: number;
  avg_drop_pct: number | null;
  max_drop_pct: number | null;
}

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);
const num = (v: number | null, suffix = "") => (v == null ? "—" : `${Number(v).toFixed(1)}${suffix}`);
const dayRo = (v: string) =>
  new Date(`${String(v).slice(0, 10)}T12:00:00Z`).toLocaleDateString("ro-RO", { weekday: "short", day: "2-digit", month: "2-digit" });

export default function DailyPriceTrendsReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("14");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_daily_price_trends", { p_days: Number(days) });
    if (error) toast.error("Nu am putut încărca raportul zilnic");
    setRows(((data || []) as unknown as Row[]) || []);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  /** Anunțurile ale căror prețuri au fost înregistrate în ziua respectivă (ora României). */
  const daySamples = (day: string) => async (): Promise<Sample[]> => {
    const { from, to } = bucharestDayRange(String(day));
    const { data, error } = await supabase
      .from("prospect_price_history")
      .select("price, recorded_at, prospect_listings(id, title, source_url, source_platform, is_active)")
      .gte("recorded_at", from)
      .lt("recorded_at", to)
      .order("recorded_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const seen = new Set<string>();
    const out: Sample[] = [];
    for (const r of (data ?? []) as Array<{
      price: number | null;
      recorded_at: string | null;
      prospect_listings: { id: string; title: string | null; source_url: string | null; source_platform: string | null; is_active: boolean | null } | null;
    }>) {
      const l = r.prospect_listings;
      // Doar anunțuri reale, active: titlul și linkul nu trebuie să fie o pagină de căutare.
      if (!l || !l.is_active || seen.has(l.id) || isSearchPageUrl(l.source_url, l.title)) continue;
      seen.add(l.id);
      out.push({ id: l.id, title: l.title, source_url: l.source_url, source_platform: l.source_platform, price: r.price });
      if (out.length === 5) break;
    }
    return out;
  };

  const exportCsv = () => {
    downloadCsv(
      csvFileName("raport-zilnic-preturi"),
      ["Zi", "Prețuri înregistrate", "Preț mediu", "€/mp mediu", "Durată medie pe sursă (zile)", "Scăderi", "Scădere medie %", "Scădere maximă %"],
      rows.map((r) => [
        r.day,
        r.listings_count,
        r.avg_price ?? "",
        r.avg_price_per_sqm ?? "",
        r.avg_source_days ?? "",
        r.drops_count,
        r.avg_drop_pct ?? "",
        r.max_drop_pct ?? "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Raport zilnic prețuri și scăderi
        </CardTitle>
        <CardDescription>
          Pe fiecare zi: câte prețuri au fost înregistrate, prețul mediu și pe metru pătrat, câte zile stau
          anunțurile pe platformă și câte scăderi de preț au apărut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 zile</SelectItem>
              <SelectItem value="14">14 zile</SelectItem>
              <SelectItem value="30">30 zile</SelectItem>
              <SelectItem value="90">90 zile</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Reîncarcă
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-3">Zi</th>
                <th className="py-2 pr-3">Prețuri</th>
                <th className="py-2 pr-3">Preț mediu</th>
                <th className="py-2 pr-3">€/mp</th>
                <th className="py-2 pr-3">Zile pe sursă</th>
                <th className="py-2 pr-3">Scăderi</th>
                <th className="py-2 pr-3">Scădere medie</th>
                <th className="py-2 pr-3">Scădere max.</th>
                <th className="py-2">Anunțuri din zi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{dayRo(r.day)}</td>
                  <td className="py-2 pr-3">{r.listings_count}</td>
                  <td className="py-2 pr-3">{eur(r.avg_price)}</td>
                  <td className="py-2 pr-3">{eur(r.avg_price_per_sqm)}</td>
                  <td className="py-2 pr-3">{num(r.avg_source_days)}</td>
                  <td className="py-2 pr-3">
                    {r.drops_count > 0 ? <Badge variant="destructive">{r.drops_count}</Badge> : "—"}
                  </td>
                  <td className="py-2 pr-3">{num(r.avg_drop_pct, "%")}</td>
                  <td className="py-2 pr-3">{num(r.max_drop_pct, "%")}</td>
                  <td className="py-2">
                    <ListingSourceSamples label="Vezi anunțurile" load={daySamples(r.day)} />
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={9} className="py-3 text-muted-foreground">
                    Nu există date pentru perioada selectată.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
