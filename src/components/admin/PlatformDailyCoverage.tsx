/**
 * Câte anunțuri găsește fiecare platformă pe zi — ca să vedem unde datele sunt live.
 * Citește direct anunțurile găsite (prospect_listings) și le grupează pe zi + platformă.
 * Fiecare rând poate fi desfăcut cu „Vezi anunțurile”: titlul extras de pe portal și
 * linkul către pagina-sursă, ca să verifici rapid că cifrele vin din anunțuri reale.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ListingSourceSamples, { type Sample } from "@/components/admin/ListingSourceSamples";
import { bucharestDayRange } from "@/lib/bucharestDay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, Radio } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";
import { PORTAL_ZONE_LABELS, canonicalZone } from "@/lib/timisoaraPortalZones";
import { isSearchPageUrl } from "@/lib/listingUrl";

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

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });

/** Citește toate rândurile pe pagini de 1000 (limita serverului), max 20.000. */
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) return { data: out, error };
    const page = (data ?? []) as T[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return { data: out, error: null };
}
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

/** Cuvântul după care recunoaștem portalul în lista de anunțuri. */
const platformKeyword = (p: string) => {
  const v = p.toLowerCase();
  return ["olx", "storia", "imobiliare", "publi24", "bursa", "facebook"].find((k) => v.includes(k)) || null;
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
      fetchAll<Raw>((f, t) => supabase
        .from("prospect_listings")
        .select("source_platform,created_at,last_seen_at,price,price_per_sqm,zone,title")
        .is("duplicate_of", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(f, t)),
      fetchAll<HistRow>((f, t) => supabase
        .from("prospect_price_history")
        .select("listing_id,source_platform,price,recorded_at")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .range(f, t)),
    ]);
    if (listings.error) toast.error("Nu am putut încărca datele pe platforme");
    if (history.error) toast.error("Nu am putut încărca istoricul prețurilor — scăderile pot apărea 0");
    setRaw((listings.data || []) as unknown as Raw[]);
    setHist((history.data || []) as unknown as HistRow[]);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  /** De la această oră numărăm „anunțuri noi” — aceleași limite ca în tabele. */
  const sinceIso = useMemo(
    () => new Date(Date.now() - Number(days) * 86400000).toISOString(),
    [days],
  );

  /** Anunțurile din perioada aleasă, cu zona canonică după denumirile reale de pe portaluri. */
  const withZone = useMemo(
    () => raw.map((r) => ({ ...r, canonZone: canonicalZone(`${r.zone || ""} ${r.title || ""}`) })),
    [raw],
  );

  /** Anunțurile din zona selectată (sau toate). */
  const filtered = useMemo(
    () => (zoneFilter === ALL_ZONES ? withZone : withZone.filter((r) => r.canonZone === zoneFilter)),
    [withZone, zoneFilter],
  );

  /** Câte anunțuri are fiecare zonă, pe fiecare portal + denumirile reale de zonă din grup. */
  const zoneRows = useMemo(() => {
    const byZone = new Map<string, Map<string, number>>();
    const rawZones = new Map<string, Set<string>>();
    for (const r of withZone) {
      const z = r.canonZone || "Zonă nedetectată";
      const p = normPlatform(r.source_platform);
      if (!byZone.has(z)) byZone.set(z, new Map());
      const m = byZone.get(z)!;
      m.set(p, (m.get(p) || 0) + 1);
      if (!rawZones.has(z)) rawZones.set(z, new Set());
      if (r.zone) rawZones.get(z)!.add(r.zone);
    }
    return Array.from(byZone.entries())
      .map(([zone, counts]) => ({
        zone,
        counts,
        raws: Array.from(rawZones.get(zone) || []),
        total: Array.from(counts.values()).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [withZone]);

  const { platforms, dayRows, totals, lastSeen } = useMemo(() => {
    const platformSet = new Set<string>();
    const byDay = new Map<string, Map<string, number>>();
    const tot = new Map<string, number>();
    const seen = new Map<string, string>();

    for (const r of filtered) {
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
  }, [filtered]);

  /** Preț mediu, €/mp mediu și scăderi de preț pe fiecare platformă. */
  const stats = useMemo(() => {
    const acc = new Map<string, { count: number; priceSum: number; priceN: number; sqmSum: number; sqmN: number; drops: number }>();
    const get = (p: string) => {
      if (!acc.has(p)) acc.set(p, { count: 0, priceSum: 0, priceN: 0, sqmSum: 0, sqmN: 0, drops: 0 });
      return acc.get(p)!;
    };
    for (const r of filtered) {
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
  }, [filtered, hist]);

  const isLive = (p: string) => {
    const ls = lastSeen.get(p);
    if (!ls) return false;
    return Date.now() - new Date(ls).getTime() < 48 * 3600 * 1000;
  };

  const baseSamples = () =>
    supabase
      .from("prospect_listings")
      .select("id,title,source_url,source_platform,price")
      .is("duplicate_of", null)
      .eq("is_active", true)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(60);

  /** Păstrăm doar anunțuri reale: titlul și linkul nu trebuie să fie o pagină de căutare. */
  const onlyReal = (rows: Sample[]) =>
    rows.filter((r) => !isSearchPageUrl(r.source_url, r.title)).slice(0, 5);

  /** Anunțurile aduse de portalul respectiv în perioada aleasă. */
  const platformSamples = (p: string) => async (): Promise<Sample[]> => {
    const key = platformKeyword(p);
    let q = baseSamples();
    if (key) q = q.ilike("source_platform", `%${key}%`);
    else if (p === "Necunoscut") q = q.is("source_platform", null);
    else q = q.eq("source_platform", p);
    const { data, error } = await q;
    if (error) throw error;
    return onlyReal((data ?? []) as Sample[]);
  };

  /** Anunțurile adunate în ziua respectivă (ora României). */
  const daySamples = (day: string) => async (): Promise<Sample[]> => {
    const { from, to } = bucharestDayRange(day);
    const { data, error } = await baseSamples().gte("created_at", from).lt("created_at", to);
    if (error) throw error;
    return onlyReal((data ?? []) as Sample[]);
  };

  /** Anunțurile din zona respectivă, cu denumirea exactă de pe portal. */
  const zoneSamples = (raws: string[]) => async (): Promise<Sample[]> => {
    const { data, error } = await baseSamples().in("zone", raws);
    if (error) throw error;
    return onlyReal((data ?? []) as Sample[]);
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
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[190px]" aria-label="Zona de pe portaluri">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value={ALL_ZONES}>Toate zonele</SelectItem>
                {PORTAL_ZONE_LABELS.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!dayRows.length}>
              <Download className="h-4 h-4" />
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
              <span className="text-sm text-muted-foreground">
                {zoneFilter === ALL_ZONES
                  ? "Nicio platformă cu anunțuri în perioada aleasă."
                  : `Nicio platformă nu a adus anunțuri în zona ${zoneFilter} în perioada aleasă.`}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="mb-1 text-xs font-medium">Zone, cum apar pe portaluri</div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Zonă</th>
                  <th className="py-2 pr-3 font-medium">imobiliare.ro</th>
                  <th className="py-2 pr-3 font-medium">OLX</th>
                  <th className="py-2 pr-3 font-medium">Publi24</th>
                  <th className="py-2 pr-3 font-medium">Storia.ro</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 font-medium">Anunțuri din zonă</th>
                </tr>
              </thead>
              <tbody>
                {zoneRows.slice(0, 25).map((r) => (
                  <tr key={r.zone} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap font-medium">{r.zone}</td>
                    {["imobiliare.ro", "OLX", "Publi24", "Storia.ro"].map((p) => (
                      <td key={p} className={`py-2 pr-3 ${r.counts.get(p) ? "" : "text-muted-foreground"}`}>
                        {r.counts.get(p) || "—"}
                      </td>
                    ))}
                    <td className="py-2 pr-3 font-medium">{r.total}</td>
                    <td className="py-2">
                      {r.raws.length ? (
                        <ListingSourceSamples label="Vezi anunțurile" load={zoneSamples(r.raws)} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!zoneRows.length && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={7}>
                      {loading ? "Se încarcă…" : "Nicio zonă cu anunțuri în perioada aleasă."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                  <th className="py-2 pr-3 font-medium">Ultimul anunț</th>
                  <th className="py-2 font-medium">Anunțuri de pe portal</th>
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
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {ls ? new Date(ls).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2">
                        <ListingSourceSamples label="Vezi anunțurile" load={platformSamples(p)} />
                      </td>
                    </tr>
                  );
                })}
                {!platforms.length && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={7}>
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
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 font-medium">Anunțuri din zi</th>
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
                    <td className="py-2 pr-3 font-medium">{r.total}</td>
                    <td className="py-2">
                      <ListingSourceSamples label="Vezi anunțurile" load={daySamples(r.day)} />
                    </td>
                  </tr>
                ))}
                {!dayRows.length && (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={platforms.length + 3}>
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
