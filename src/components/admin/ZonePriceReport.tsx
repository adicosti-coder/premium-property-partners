/**
 * Raport pe zonă: preț mediu, preț/mp, luna curentă vs luna precedentă,
 * pe fiecare tip de imobil. Datele vin din `prospect_price_history`, care se
 * actualizează automat la fiecare scanare (trigger pe prospect_listings).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, RefreshCw, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface ZoneRow {
  zone: string;
  property_type: string;
  samples: number;
  avg_price: number | null;
  avg_price_sqm: number | null;
  avg_price_this_month: number | null;
  avg_price_prev_month: number | null;
  avg_sqm_this_month: number | null;
  avg_sqm_prev_month: number | null;
  min_price_sqm: number | null;
  max_price_sqm: number | null;
  platforms: number;
  last_seen_at: string | null;
  /** Anunțurile publicate pe realtrust.ro în aceeași zonă. */
  site_published: number | null;
  site_avg_price: number | null;
  site_avg_price_sqm: number | null;
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

const variation = (now: number | null, prev: number | null) => {
  if (!now || !prev) return null;
  return ((now - prev) / prev) * 100;
};

export default function ZonePriceReport() {
  const [days, setDays] = useState("30");
  const [type, setType] = useState("__all__");
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_zone_price_report_v3", {
      p_days: Number(days),
      p_type: type === "__all__" ? null : type,
    });
    if (!error) setRows((data || []) as unknown as ZoneRow[]);
    setLoading(false);
  }, [days, type]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const samples = rows.reduce((s, r) => s + Number(r.samples || 0), 0);
    const zones = new Set(rows.map((r) => r.zone)).size;
    return { samples, zones };
  }, [rows]);

  const exportCsv = () => {
    downloadCsv(
      csvFileName("preturi-pe-zona"),
      ["Zonă", "Tip", "Anunțuri", "Preț mediu", "Preț/mp", "Preț/mp luna curentă",
        "Preț/mp luna precedentă", "Variație preț/mp %", "Min preț/mp", "Max preț/mp",
        "Luna curentă", "Luna precedentă", "Variație %", "Platforme",
        "Publicate realtrust.ro", "Preț mediu realtrust.ro", "Preț/mp realtrust.ro"],
      rows.map((r) => [
        r.zone,
        r.property_type,
        r.samples,
        r.avg_price ?? "",
        r.avg_price_sqm ?? "",
        r.avg_sqm_this_month ?? "",
        r.avg_sqm_prev_month ?? "",
        variation(r.avg_sqm_this_month, r.avg_sqm_prev_month)?.toFixed(1) ?? "",
        r.min_price_sqm ?? "",
        r.max_price_sqm ?? "",
        r.avg_price_this_month ?? "",
        r.avg_price_prev_month ?? "",
        variation(r.avg_price_this_month, r.avg_price_prev_month)?.toFixed(1) ?? "",
        r.platforms,
        r.site_published ?? 0,
        r.site_avg_price ?? "",
        r.site_avg_price_sqm ?? "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-4 w-4" /> Prețuri pe zonă
          </CardTitle>
          <CardDescription>
            Preț mediu și variație lunară pe fiecare zonă și tip de imobil — actualizat automat la fiecare scanare.
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
              <SelectItem value="7">7 zile</SelectItem>
              <SelectItem value="30">30 zile</SelectItem>
              <SelectItem value="90">90 zile</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-1 h-4 w-4" /> Descarcă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{totals.zones} zone</Badge>
          <Badge variant="secondary">{totals.samples} anunțuri analizate</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zonă</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Anunțuri</TableHead>
                <TableHead className="text-right">Preț mediu</TableHead>
                <TableHead className="text-right">Preț/mp</TableHead>
                <TableHead className="text-right">Preț/mp luna asta</TableHead>
                <TableHead className="text-right">Preț/mp luna trecută</TableHead>
                <TableHead className="text-right">Variație preț/mp</TableHead>
                <TableHead className="text-right">Interval preț/mp</TableHead>
                <TableHead className="text-right">Luna curentă</TableHead>
                <TableHead className="text-right">Luna precedentă</TableHead>
                <TableHead className="text-right">Variație</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const v = variation(r.avg_price_this_month, r.avg_price_prev_month);
                const vs = variation(r.avg_sqm_this_month, r.avg_sqm_prev_month);
                const Icon = v == null ? Minus : v > 0 ? TrendingUp : TrendingDown;
                const IconSqm = vs == null ? Minus : vs > 0 ? TrendingUp : TrendingDown;
                return (
                  <TableRow key={`${r.zone}-${r.property_type}`}>
                    <TableCell className="font-medium">{r.zone}</TableCell>
                    <TableCell className="capitalize">{r.property_type}</TableCell>
                    <TableCell className="text-right">{r.samples}</TableCell>
                    <TableCell className="text-right">{eur(r.avg_price)}</TableCell>
                    <TableCell className="text-right font-medium">{eur(r.avg_price_sqm)}</TableCell>
                    <TableCell className="text-right">{eur(r.avg_sqm_this_month)}</TableCell>
                    <TableCell className="text-right">{eur(r.avg_sqm_prev_month)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <IconSqm className="h-3.5 w-3.5" />
                        {vs == null ? "—" : `${vs > 0 ? "+" : ""}${vs.toFixed(1)}%`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.min_price_sqm && r.max_price_sqm
                        ? `${eur(r.min_price_sqm)} – ${eur(r.max_price_sqm)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{eur(r.avg_price_this_month)}</TableCell>
                    <TableCell className="text-right">{eur(r.avg_price_prev_month)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        {v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={12} className="py-6 text-center text-sm text-muted-foreground">
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
