/**
 * Câte anunțuri găsește fiecare platformă pe zi — ca să vedem unde datele sunt live.
 * Citește direct anunțurile găsite (prospect_listings) și le grupează pe zi + platformă.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, Radio } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";
import { PORTAL_ZONE_LABELS, canonicalZone } from "@/lib/timisoaraPortalZones";

interface Raw {
  source_platform: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  price: number | null;
  price_per_sqm: number | null;
  zone: string | null;
  title: string | null;
}

interface HistRow {
  listing_id: string | null;
  source_platform: string | null;
  price: number | null;
  recorded_at: string | null;
}

const dayKey = (iso: string) => iso.slice(0, 10);
const dayRo = (v: string) =>
  new Date(`${v}T12:00:00Z`).toLocaleDateString("ro-RO", { weekday: "short", day: "2-digit", month: "2-digit" });

const normPlatform = (p: string | null) => {
  const v = (p || "").trim().toLowerCase();
  if (!v) return "Necunoscut";
  if (v.includes("olx")) return "OLX";
  if (v.includes("storia")) return "Storia.ro";
  if (v.includes("imobiliare")) return "imobiliare.ro";
  if (v.includes("publi24")) return "Publi24";
  if (v.includes("bursa")) return "BursaImobiliara.ro";
  if (v.includes("facebook")) return "Facebook";
  return p as string;
};

const ALL_ZONES = "__all_zones__";

export default function PlatformDailyCoverage() {
  const [raw, setRaw] = useState<Raw[]>([]);
  const [hist, setHist] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("14");
  const [zoneFilter, setZoneFilter] = useState(ALL_ZONES);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
    const [listings, history] = await Promise.all([
      supabase
        .from("prospect_listings")
        .select("source_platform,created_at,last_seen_at,price,price_per_sqm,zone,title")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("prospect_price_history")
        .select("listing_id,source_platform,price,recorded_at")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(10000),
    ]);
    if (listings.error) toast.error("Nu am putut încărca datele pe platforme");
    setRaw((listings.data || []) as unknown as Raw[]);
    setHist((history.data || []) as unknown as HistRow[]);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const { platforms, dayRows, totals, lastSeen } = useMemo(() => {
    const platformSet = new Set<string>();
    const byDay = new Map<string, Map<string, number>>();
    const tot = new Map<string, number>();
    const seen = new Map<string, string>();

    for (const r of raw) {
      if (!r.created_at) continue;
      const p = normPlatform(r.source_platform);
      const d = dayKey(r.created_at);
      platformSet.add(p);
      if (!byDay.has(d)) byDay.set(d, new Map());
      const m = byDay.get(d)!;
      m.set(p, (m.get(p) || 0) + 1);
      tot.set(p, (tot.get(p) || 0) + 1);
      const ls = r.last_seen_at || r.created_at;
      if (!seen.has(p) || (seen.get(p) as string) < ls) seen.set(p, ls);
    }

    const plats = Array.from(platformSet).sort((a, b) => (tot.get(b) || 0) - (tot.get(a) || 0));
    const rows = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, m]) => ({ day, counts: m, total: Array.from(m.values()).reduce((s, v) => s + v, 0) }));
    return { platforms: plats, dayRows: rows, totals: tot, lastSeen: seen };
  }, [raw]);

  /** Preț mediu, €/mp mediu și scăderi de preț pe fiecare platformă. */
  const stats = useMemo(() => {
    const acc = new Map<string, { count: number; priceSum: number; priceN: number; sqmSum: number; sqmN: number; drops: number }>();
    const get = (p: string) => {
      if (!acc.has(p)) acc.set(p, { count: 0, priceSum: 0, priceN: 0, sqmSum: 0, sqmN: 0, drops: 0 });
      return acc.get(p)!;
    };
    for (const r of raw) {
      const s = get(normPlatform(r.source_platform));
      s.count += 1;
      if (r.price && Number(r.price) > 0) { s.priceSum += Number(r.price); s.priceN += 1; }
      if (r.price_per_sqm && Number(r.price_per_sqm) > 0) { s.sqmSum += Number(r.price_per_sqm); s.sqmN += 1; }
    }
    // scăderi: preț mai mic decât precedentul aceluiași anunț
    const byListing = new Map<string, HistRow[]>();
    for (const h of hist) {
      const id = h.listing_id || "";
      if (!id) continue;
      if (!byListing.has(id)) byListing.set(id, []);
      byListing.get(id)!.push(h);
    }
    for (const rows of byListing.values()) {
      for (let i = 1; i < rows.length; i++) {
        const prev = Number(rows[i - 1].price || 0);
        const cur = Number(rows[i].price || 0);
        if (prev > 0 && cur > 0 && cur < prev) get(normPlatform(rows[i].source_platform)).drops += 1;
      }
    }
    return acc;
  }, [raw, hist]);

  const isLive = (p: string) => {
    const ls = lastSeen.get(p);
    if (!ls) return false;
    return Date.now() - new Date(ls).getTime() < 48 * 3600 * 1000;
  };

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-pe-platforma-pe-zi"),
      ["Zi", ...platforms, "Total"],
      dayRows.map((r) => [r.day, ...platforms.map((p) => r.counts.get(p) || 0), r.total]),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4" /> Anunțuri pe platformă, pe zi
            </CardTitle>
            <CardDescription>
              Câte anunțuri noi a adus fiecare platformă în fiecare zi. Verde = a adus anunțuri în ultimele 48 de ore.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ultimele 7 zile</SelectItem>
                <SelectItem value="14">Ultimele 14 zile</SelectItem>
                <SelectItem value="30">Ultimele 30 zile</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!dayRows.length}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Badge key={p} variant={isLive(p) ? "default" : "secondary"} className="gap-1">
                {p}: {totals.get(p) || 0}
                {isLive(p) ? " • live" : " • fără anunțuri noi"}
              </Badge>
            ))}
            {!platforms.length && !loading && (
              <span className="text-sm text-muted-foreground">Nicio platformă cu anunțuri în perioada aleasă.</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="mb-1 text-xs font-medium">Rezumat pe platformă</div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Platformă</th>
                  <th className="py-2 pr-3 font-medium">Anunțuri</th>
                  <th className="py-2 pr-3 font-medium">Preț mediu</th>
                  <th className="py-2 pr-3 font-medium">€/mp mediu</th>
                  <th className="py-2 pr-3 font-medium">Scăderi de preț</th>
                  <th className="py-2 font-medium">Ultimul anunț</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => {
                  const s = stats.get(p);
                  const avg = s && s.priceN ? Math.round(s.priceSum / s.priceN) : null;
                  const sqm = s && s.sqmN ? Math.round(s.sqmSum / s.sqmN) : null;
                  const ls = lastSeen.get(p);
                  return (
                    <tr key={p} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap font-medium">{p}</td>
                      <td className="py-2 pr-3">{s?.count ?? 0}</td>
                      <td className="py-2 pr-3">{avg == null ? "—" : `${avg.toLocaleString("ro-RO")} €`}</td>
                      <td className="py-2 pr-3">{sqm == null ? "—" : `${sqm.toLocaleString("ro-RO")} €`}</td>
                      <td className="py-2 pr-3">{s?.drops ?? 0}</td>
                      <td className="py-2 whitespace-nowrap text-muted-foreground">
                        {ls ? new Date(ls).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {!platforms.length && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={6}>
                      {loading ? "Se încarcă…" : "Nicio platformă cu anunțuri."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mb-1 text-xs font-medium">Pe zi</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Zi</th>
                  {platforms.map((p) => (
                    <th key={p} className="py-2 pr-3 font-medium whitespace-nowrap">
                      {p}
                    </th>
                  ))}
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((r) => (
                  <tr key={r.day} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{dayRo(r.day)}</td>
                    {platforms.map((p) => {
                      const v = r.counts.get(p) || 0;
                      return (
                        <td key={p} className={`py-2 pr-3 ${v ? "" : "text-muted-foreground"}`}>
                          {v || "—"}
                        </td>
                      );
                    })}
                    <td className="py-2 font-medium">{r.total}</td>
                  </tr>
                ))}
                {!dayRows.length && (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={platforms.length + 2}>
                      {loading ? "Se încarcă…" : "Nu există anunțuri în perioada aleasă."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
