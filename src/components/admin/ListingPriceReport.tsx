/**
 * „Raport pe anunț" — fiecare anunț găsit, cu data primei apariții, platforma,
 * prețul inițial vs prețul actual, prețul pe mp și linkul original.
 * Sursa: get_listing_price_report (prospect_listings + prospect_price_history).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileClock, RefreshCw, Download, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface Row {
  listing_id: string;
  title: string | null;
  zone: string | null;
  property_type: string | null;
  rooms: number | null;
  surface: number | null;
  source_platform: string | null;
  source_url: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  first_price: number | null;
  current_price: number | null;
  price_changes: number | null;
  price_sqm: number | null;
  contact_phone: string | null;
}

const PLATFORMS = ["OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro"];

const eur = (v: number | null) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`;

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export default function ListingPriceReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState("30");
  const [platform, setPlatform] = useState("__all__");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_listing_price_report", {
      p_days: Number(days),
      p_platform: platform === "__all__" ? null : platform,
    });
    if (!error) setRows((data || []) as unknown as Row[]);
    setLoading(false);
  }, [days, platform]);

  useEffect(() => { void load(); }, [load]);

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filtered = useMemo(() => {
    if (q.trim().length < 2) return rows;
    const needle = norm(q.trim());
    return rows.filter((r) =>
      norm(`${r.title || ""} ${r.zone || ""} ${r.property_type || ""} ${r.contact_phone || ""}`).includes(needle),
    );
  }, [rows, q]);

  const changed = useMemo(
    () => filtered.filter((r) => r.first_price && r.current_price && r.first_price !== r.current_price).length,
    [filtered],
  );

  const exportCsv = () => {
    downloadCsv(
      csvFileName("raport-pe-anunt"),
      ["Data apariției", "Ultima vedere", "Titlu", "Zonă", "Tip", "Camere", "mp", "Platformă",
        "Preț inițial", "Preț actual", "Preț/mp", "Modificări preț", "Telefon", "Link"],
      filtered.map((r) => [
        dateRo(r.first_seen_at),
        dateRo(r.last_seen_at),
        r.title || "",
        r.zone || "",
        r.property_type || "",
        r.rooms ?? "",
        r.surface ?? "",
        r.source_platform || "",
        r.first_price ?? "",
        r.current_price ?? "",
        r.price_sqm ?? "",
        r.price_changes ?? 0,
        r.contact_phone || "",
        r.source_url || "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileClock className="h-4 w-4" /> Raport pe anunț
          </CardTitle>
          <CardDescription>
            Fiecare anunț cu data apariției, platforma, prețul inițial și actual, prețul pe mp și linkul original.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toate platformele</SelectItem>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 zile</SelectItem>
              <SelectItem value="30">30 zile</SelectItem>
              <SelectItem value="90">90 zile</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}
            aria-label="Reîncarcă raportul pe anunț">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-1 h-4 w-4" /> Descarcă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută după titlu, zonă, tip sau telefon"
            className="max-w-sm"
          />
          <Badge variant="secondary">{filtered.length} anunțuri</Badge>
          <Badge variant="secondary">{changed} cu preț modificat</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data apariției</TableHead>
                <TableHead>Anunț</TableHead>
                <TableHead>Platformă</TableHead>
                <TableHead className="text-right">Preț inițial</TableHead>
                <TableHead className="text-right">Preț actual</TableHead>
                <TableHead className="text-right">Preț/mp</TableHead>
                <TableHead className="text-right">Evoluție</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const diff =
                  r.first_price && r.current_price
                    ? ((Number(r.current_price) - Number(r.first_price)) / Number(r.first_price)) * 100
                    : null;
                const Icon = diff == null || Math.abs(diff) < 0.5 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
                return (
                  <TableRow key={r.listing_id}>
                    <TableCell className="whitespace-nowrap text-xs">{dateRo(r.first_seen_at)}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="truncate text-sm font-medium">{r.title || "Anunț fără titlu"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[r.zone, r.property_type, r.rooms ? `${r.rooms} cam` : null, r.surface ? `${r.surface} mp` : null]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{r.source_platform || "—"}</TableCell>
                    <TableCell className="text-right text-xs">{eur(r.first_price)}</TableCell>
                    <TableCell className="text-right font-medium">{eur(r.current_price)}</TableCell>
                    <TableCell className="text-right text-xs">{eur(r.price_sqm)}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        {diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.source_url ? (
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs underline"
                          aria-label={`Deschide anunțul ${r.title || ""} pe ${r.source_platform || "platformă"}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Deschide
                        </a>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    {loading ? "Se încarcă..." : "Niciun anunț în perioada selectată."}
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
