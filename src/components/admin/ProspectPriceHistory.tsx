import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, History, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface HistoryRow {
  id: string;
  listing_id: string | null;
  source_platform: string;
  source_url: string | null;
  zone: string | null;
  rooms: number | null;
  surface: number | null;
  price: number | null;
  property_type: string | null;
  recorded_at: string;
}

const DAYS: Record<string, number> = { "7": 7, "30": 30, "90": 90, "365": 365 };

const ALL = "__all__";

const TYPE_LABELS: Record<string, string> = {
  apartament: "Apartament",
  garsoniera: "Garsonieră",
  casa: "Casă",
  teren: "Teren",
  comercial: "Spațiu comercial",
};

const typeLabel = (t: string | null) => (t ? TYPE_LABELS[t] || t : "Nespecificat");

const fmtPrice = (p: number | null) => (p ? `${Number(p).toLocaleString("ro-RO")} €` : "—");
const fmtDate = (v: string) => new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "2-digit" });

export default function ProspectPriceHistory() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("30");
  const [zoneFilter, setZoneFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - (DAYS[days] || 30) * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("prospect_price_history")
        .select("id,listing_id,source_platform,source_url,zone,rooms,surface,price,property_type,recorded_at")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      setRows((data || []) as unknown as HistoryRow[]);
    } catch (e: unknown) {
      toast({ title: "Eroare istoric prețuri", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const zoneOptions = useMemo(
    () => [...new Set(rows.map((r) => r.zone).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ro")),
    [rows],
  );

  const typeOptions = useMemo(
    () => [...new Set(rows.map((r) => r.property_type).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (zoneFilter === ALL || r.zone === zoneFilter) &&
          (typeFilter === ALL || r.property_type === typeFilter),
      ),
    [rows, zoneFilter, typeFilter],
  );

  // Preț mediu pe zonă + tip de imobil, defalcat pe platformă
  const byZoneType = useMemo(() => {
    const map = new Map<string, { zone: string; type: string | null; platforms: Map<string, { sum: number; n: number; perSqm: number[] }> }>();
    for (const r of filtered) {
      if (!r.price) continue;
      const zoneKey = r.zone || "Zonă nespecificată";
      const key = `${zoneKey}|${r.property_type || ""}`;
      const entry = map.get(key) || { zone: zoneKey, type: r.property_type, platforms: new Map() };
      const plat = r.source_platform || "Necunoscut";
      const agg = entry.platforms.get(plat) || { sum: 0, n: 0, perSqm: [] };
      agg.sum += Number(r.price);
      agg.n += 1;
      if (r.surface && Number(r.surface) > 10) agg.perSqm.push(Number(r.price) / Number(r.surface));
      entry.platforms.set(plat, agg);
      map.set(key, entry);
    }
    return [...map.values()]
      .map((e) => ({
        zone: e.zone,
        type: e.type,
        total: [...e.platforms.values()].reduce((s, a) => s + a.n, 0),
        platforms: [...e.platforms.entries()]
          .map(([platform, a]) => ({
            platform,
            n: a.n,
            avg: Math.round(a.sum / a.n),
            perSqm: a.perSqm.length ? Math.round(a.perSqm.reduce((s, v) => s + v, 0) / a.perSqm.length) : null,
          }))
          .sort((x, y) => y.n - x.n),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [filtered]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, { count: number; sum: number; priced: number; min: number; max: number; perSqm: number[] }>();
    for (const r of filtered) {
      const key = r.source_platform || "Necunoscut";
      const agg = map.get(key) || { count: 0, sum: 0, priced: 0, min: Infinity, max: 0, perSqm: [] };
      agg.count += 1;
      if (r.price) {
        agg.sum += Number(r.price);
        agg.priced += 1;
        agg.min = Math.min(agg.min, Number(r.price));
        agg.max = Math.max(agg.max, Number(r.price));
        if (r.surface && Number(r.surface) > 10) agg.perSqm.push(Number(r.price) / Number(r.surface));
      }
      map.set(key, agg);
    }
    return [...map.entries()]
      .map(([platform, a]) => ({
        platform,
        count: a.count,
        avg: a.priced ? Math.round(a.sum / a.priced) : null,
        min: a.priced ? a.min : null,
        max: a.priced ? a.max : null,
        perSqm: a.perSqm.length ? Math.round(a.perSqm.reduce((s, v) => s + v, 0) / a.perSqm.length) : null,
      }))
      .sort((x, y) => y.count - x.count);
  }, [filtered]);

  const changes = useMemo(() => {
    const byListing = new Map<string, HistoryRow[]>();
    for (const r of filtered) {
      if (!r.listing_id) continue;
      const list = byListing.get(r.listing_id) || [];
      list.push(r);
      byListing.set(r.listing_id, list);
    }
    const out: { row: HistoryRow; from: number; to: number }[] = [];
    for (const list of byListing.values()) {
      if (list.length < 2) continue;
      const sorted = [...list].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
      const first = sorted[0].price;
      const last = sorted[sorted.length - 1].price;
      if (first && last && first !== last) out.push({ row: sorted[sorted.length - 1], from: Number(first), to: Number(last) });
    }
    return out.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 25);
  }, [filtered]);

  const exportCsv = () => {
    downloadCsv(
      csvFileName("istoric-preturi"),
      ["Data", "Platformă", "Zonă", "Tip imobil", "Camere", "Suprafață", "Preț", "Link"],
      filtered.map((r) => [fmtDate(r.recorded_at), r.source_platform, r.zone, typeLabel(r.property_type), r.rooms, r.surface, r.price, r.source_url]),
    );
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-indigo-500/30 bg-background/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4 text-indigo-600" />
          Istoric prețuri pe zonă și platformă
          <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[150px] min-h-[44px] sm:min-h-0" aria-label="Perioadă istoric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimele 7 zile</SelectItem>
              <SelectItem value="30">Ultimele 30 zile</SelectItem>
              <SelectItem value="90">Ultimele 3 luni</SelectItem>
              <SelectItem value="365">Ultimul an</SelectItem>
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[160px] min-h-[44px] sm:min-h-0" aria-label="Filtrează pe zonă">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toate zonele</SelectItem>
              {zoneOptions.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] min-h-[44px] sm:min-h-0" aria-label="Filtrează pe tip de imobil">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toate tipurile</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Reîmprospătează istoricul" className="min-h-[44px] sm:min-h-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="min-h-[44px] sm:min-h-0">
            <Download className="h-4 w-4 mr-2" /> Descarcă
          </Button>
        </div>
      </div>

      {byZoneType.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">Preț mediu pe zonă și tip de imobil</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {byZoneType.map((g) => (
              <div key={`${g.zone}-${g.type || "na"}`} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{g.zone}</span>
                  <Badge variant="secondary" className="text-[10px]">{typeLabel(g.type)}</Badge>
                </div>
                {g.platforms.map((p) => (
                  <div key={p.platform} className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                    <span className="text-foreground">{p.platform}</span>
                    <span>{fmtPrice(p.avg)}</span>
                    {p.perSqm ? <span>{p.perSqm.toLocaleString("ro-RO")} €/m²</span> : null}
                    <span>({p.n})</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {byPlatform.length === 0 ? (
        <p className="text-xs text-muted-foreground">{loading ? "Se încarcă…" : "Încă nu există istoric în perioada selectată."}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {byPlatform.map((p) => (
            <div key={p.platform} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.platform}</span>
                <Badge variant="outline" className="text-[10px]">{p.count} înregistrări</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Preț mediu: <span className="text-foreground font-medium">{fmtPrice(p.avg)}</span>
                {p.perSqm ? ` · ${p.perSqm.toLocaleString("ro-RO")} €/m²` : ""}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Interval: {fmtPrice(p.min)} – {fmtPrice(p.max)}
              </div>
            </div>
          ))}
        </div>
      )}

      {changes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">Anunțuri cu preț modificat</div>
          <div className="border rounded-lg divide-y max-h-[260px] overflow-y-auto">
            {changes.map((c) => (
              <div key={c.row.id} className="p-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-[10px]">{c.row.source_platform}</Badge>
                {c.row.zone && <span className="text-muted-foreground">{c.row.zone}</span>}
                <span className="line-through text-muted-foreground">{fmtPrice(c.from)}</span>
                <span className={c.to < c.from ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                  {fmtPrice(c.to)} ({c.to < c.from ? "−" : "+"}
                  {Math.round((Math.abs(c.to - c.from) / c.from) * 100)}%)
                </span>
                {c.row.source_url && (
                  <a href={c.row.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Anunț
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
