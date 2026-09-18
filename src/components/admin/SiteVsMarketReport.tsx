/**
 * Raport comparativ: anunțurile publicate pe realtrust.ro vs anunțurile găsite pe
 * platforme (Anunțuri noi găsite), pe zonă și tip de imobil. Datele vin din
 * istoricul de preț, care se actualizează automat la fiecare scanare și la
 * fiecare schimbare de preț a anunțurilor de pe site.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, RefreshCw, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface Row {
  zone: string;
  property_type: string;
  site_count: number;
  site_avg_price: number | null;
  site_avg_sqm: number | null;
  market_count: number;
  market_avg_price: number | null;
  market_avg_sqm: number | null;
  price_diff_pct: number | null;
  sqm_diff_pct: number | null;
}

const TYPES = [
  { value: "__all__", label: "Toate tipurile" },
  { value: "apartament", label: "Apartament" },
  { value: "garsoniera", label: "Garsonieră" },
  { value: "casa", label: "Casă / vilă" },
  { value: "teren", label: "Teren" },
  { value: "comercial", label: "Spațiu comercial" },
];

const eur = (v: number | null) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`;

const Diff = ({ v }: { v: number | null }) => {
  const Icon = v == null ? Minus : v > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {v == null ? "—" : `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`}
    </span>
  );
};

export default function SiteVsMarketReport() {
  const [days, setDays] = useState("90");
  const [type, setType] = useState("__all__");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_site_vs_market_report", {
      p_days: Number(days),
      p_type: type === "__all__" ? null : type,
    });
    if (!error) setRows((data || []) as unknown as Row[]);
    setLoading(false);
  }, [days, type]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    site: rows.reduce((s, r) => s + Number(r.site_count || 0), 0),
    market: rows.reduce((s, r) => s + Number(r.market_count || 0), 0),
  }), [rows]);

  const exportCsv = () => {
    downloadCsv(
      csvFileName("realtrust-vs-platforme"),
      ["Zonă", "Tip", "Anunțuri realtrust.ro", "Preț mediu realtrust.ro", "€/mp realtrust.ro",
        "Anunțuri platforme", "Preț mediu platforme", "€/mp platforme", "Diferență preț %", "Diferență €/mp %"],
      rows.map((r) => [
        r.zone, r.property_type, r.site_count, r.site_avg_price ?? "", r.site_avg_sqm ?? "",
        r.market_count, r.market_avg_price ?? "", r.market_avg_sqm ?? "",
        r.price_diff_pct ?? "", r.sqm_diff_pct ?? "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-4 w-4" /> realtrust.ro vs anunțurile găsite
          </CardTitle>
          <CardDescription>
            Compară prețurile anunțurilor publicate pe realtrust.ro cu cele de pe platforme, pe zonă și tip de imobil.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 zile</SelectItem>
              <SelectItem value="90">90 zile</SelectItem>
              <SelectItem value="180">180 zile</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}
            aria-label="Reîncarcă raportul comparativ">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-1 h-4 w-4" /> Descarcă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{totals.site} înregistrări realtrust.ro</Badge>
          <Badge variant="secondary">{totals.market} înregistrări platforme</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zonă</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Pe realtrust.ro</TableHead>
                <TableHead className="text-right">Preț mediu site</TableHead>
                <TableHead className="text-right">€/mp site</TableHead>
                <TableHead className="text-right">Pe platforme</TableHead>
                <TableHead className="text-right">Preț mediu platforme</TableHead>
                <TableHead className="text-right">€/mp platforme</TableHead>
                <TableHead className="text-right">Diferență preț</TableHead>
                <TableHead className="text-right">Diferență €/mp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.zone}-${r.property_type}`}>
                  <TableCell className="font-medium">{r.zone}</TableCell>
                  <TableCell className="capitalize">{r.property_type}</TableCell>
                  <TableCell className="text-right">{r.site_count || 0}</TableCell>
                  <TableCell className="text-right">{eur(r.site_avg_price)}</TableCell>
                  <TableCell className="text-right">{eur(r.site_avg_sqm)}</TableCell>
                  <TableCell className="text-right">{r.market_count || 0}</TableCell>
                  <TableCell className="text-right">{eur(r.market_avg_price)}</TableCell>
                  <TableCell className="text-right">{eur(r.market_avg_sqm)}</TableCell>
                  <TableCell className="text-right"><Diff v={r.price_diff_pct} /></TableCell>
                  <TableCell className="text-right"><Diff v={r.sqm_diff_pct} /></TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                    {loading ? "Se încarcă..." : "Niciun preț înregistrat în perioada selectată."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
