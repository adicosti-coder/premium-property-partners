import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Loader2, RefreshCw, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface ReportRow {
  source_platform: string;
  found_period: number;
  with_phone: number;
  duplicates: number;
  agencies: number;
  invalid_data: number;
  avg_price: number | null;
  avg_price_this_month: number | null;
  avg_price_prev_month: number | null;
  avg_price_sqm: number | null;
  avg_sqm_this_month: number | null;
  avg_sqm_prev_month: number | null;
  last_found_at: string | null;
  /** Anunțuri preluate pe realtrust.ro din platforma respectivă. */
  site_published: number | null;
  site_avg_price: number | null;
  site_avg_price_sqm: number | null;
  site_last_published_at: string | null;
}

interface PlatformResult {
  ok?: boolean;
  inserted?: number;
  timeout_ms?: number;
  skipped?: string;
  error?: string;
  duration_ms?: number;
  agency?: number;
  duplicate?: number;
}

interface RunRow {
  id: string;
  started_at: string;
  duration_ms: number | null;
  stats: { details?: { platforms?: Record<string, PlatformResult> }[] } | null;
}

interface Timing {
  platform: string;
  calls: number;
  ok: number;
  timeouts: number;
  errors: number;
  skipped: number;
  inserted: number;
  avgMs: number | null;
}

const PERIODS = [
  { value: "7", label: "Ultimele 7 zile" },
  { value: "30", label: "Ultimele 30 zile" },
  { value: "90", label: "Ultimele 90 zile" },
];

const fmtPrice = (p: number | null) => (p ? `${Number(p).toLocaleString("ro-RO")} €` : "—");
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function variation(now: number | null, prev: number | null): number | null {
  if (!now || !prev) return null;
  return Math.round(((now - prev) / prev) * 1000) / 10;
}

export default function PlatformReportPanel() {
  const [days, setDays] = useState("30");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [report, runsRes] = await Promise.all([
        supabase.rpc("get_platform_scan_report_v3", { p_days: Number(days) }),
        supabase
          .from("keyword_radar_runs")
          .select("id,started_at,duration_ms,stats")
          .order("started_at", { ascending: false })
          .limit(15),
      ]);
      if (report.error) throw report.error;
      if (runsRes.error) throw runsRes.error;
      setRows((report.data || []) as unknown as ReportRow[]);
      setRuns((runsRes.data || []) as unknown as RunRow[]);
    } catch (e: unknown) {
      toast({
        title: "Eroare raport platforme",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const timings = useMemo(() => {
    const map = new Map<string, Timing & { msSum: number; msN: number }>();
    for (const run of runs) {
      for (const detail of run.stats?.details || []) {
        for (const [platform, res] of Object.entries(detail.platforms || {})) {
          const t =
            map.get(platform) ||
            { platform, calls: 0, ok: 0, timeouts: 0, errors: 0, skipped: 0, inserted: 0, avgMs: null, msSum: 0, msN: 0 };
          if (res?.skipped) {
            t.skipped += 1;
          } else {
            t.calls += 1;
            if (res?.ok) {
              t.ok += 1;
              t.inserted += Number(res.inserted || 0);
            } else if (res?.timeout_ms) {
              t.timeouts += 1;
              t.msSum += Number(res.timeout_ms);
              t.msN += 1;
            } else {
              t.errors += 1;
            }
            if (res?.duration_ms) {
              t.msSum += Number(res.duration_ms);
              t.msN += 1;
            }
          }
          map.set(platform, t);
        }
      }
    }
    return [...map.values()]
      .map((t) => ({ ...t, avgMs: t.msN ? Math.round(t.msSum / t.msN) : null }))
      .sort((a, b) => b.calls - a.calls);
  }, [runs]);

  const avgRunMs = useMemo(() => {
    const list = runs.map((r) => Number(r.duration_ms || 0)).filter((n) => n > 0);
    return list.length ? Math.round(list.reduce((s, n) => s + n, 0) / list.length) : null;
  }, [runs]);

  const totals = useMemo(
    () => ({
      found: rows.reduce((s, r) => s + Number(r.found_period || 0), 0),
      phone: rows.reduce((s, r) => s + Number(r.with_phone || 0), 0),
      dup: rows.reduce((s, r) => s + Number(r.duplicates || 0), 0),
      agency: rows.reduce((s, r) => s + Number(r.agencies || 0), 0),
    }),
    [rows],
  );

  const exportCsv = () => {
    downloadCsv(
      csvFileName("raport-platforme"),
      ["Platformă", "Anunțuri", "Cu telefon", "Duplicate", "Agenții", "Date incomplete", "Preț mediu",
        "Luna curentă", "Luna trecută", "Variație %", "Preț/mp", "Preț/mp luna curentă",
        "Preț/mp luna trecută", "Variație preț/mp %", "Ultimul anunț",
        "Publicate realtrust.ro", "Preț mediu realtrust.ro", "Preț/mp realtrust.ro", "Ultima publicare"],
      rows.map((r) => [
        r.source_platform,
        r.found_period,
        r.with_phone,
        r.duplicates,
        r.agencies,
        r.invalid_data,
        r.avg_price,
        r.avg_price_this_month,
        r.avg_price_prev_month,
        variation(r.avg_price_this_month, r.avg_price_prev_month),
        r.avg_price_sqm,
        r.avg_sqm_this_month,
        r.avg_sqm_prev_month,
        variation(r.avg_sqm_this_month, r.avg_sqm_prev_month),
        r.last_found_at,
        r.site_published ?? 0,
        r.site_avg_price ?? "",
        r.site_avg_price_sqm ?? "",
        r.site_last_published_at ?? "",
      ]),
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Raport pe platformă
              </CardTitle>
              <CardDescription className="text-xs">
                Anunțuri găsite, preț mediu și variația față de luna trecută — toate platformele într-o singură pagină.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[170px] min-h-[44px] sm:min-h-0" aria-label="Alege perioada raportului">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Reîmprospătează raportul" className="min-h-[44px] sm:min-h-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length} className="min-h-[44px] sm:min-h-0">
                <Download className="h-4 w-4 mr-1" /> Descarcă
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{totals.found} anunțuri</Badge>
            <Badge variant="secondary">{totals.phone} cu telefon</Badge>
            <Badge variant="outline">{totals.dup} duplicate</Badge>
            <Badge variant="outline">{totals.agency} agenții</Badge>
            {avgRunMs && <Badge variant="outline">scanare medie {(avgRunMs / 1000).toFixed(1)}s</Badge>}
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {loading ? "Se încarcă…" : "Niciun anunț în perioada selectată."}
            </p>
          ) : (
            <div className="border rounded-lg divide-y">
              {rows.map((r) => {
                const v = variation(r.avg_price_this_month, r.avg_price_prev_month);
                const Icon = v === null ? Minus : v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
                return (
                  <div key={r.source_platform} className="p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{r.source_platform}</span>
                      <Badge variant="secondary" className="text-[10px]">{r.found_period} anunțuri</Badge>
                      <span className="text-xs text-muted-foreground">
                        preț mediu {fmtPrice(r.avg_price)} · {fmtPrice(r.avg_price_sqm)}/mp
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs">
                        <Icon className={`h-3.5 w-3.5 ${v && v > 0 ? "text-emerald-600" : v && v < 0 ? "text-destructive" : "text-muted-foreground"}`} />
                        {v === null ? "fără comparație lunară" : `${v > 0 ? "+" : ""}${v}% luna aceasta`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      luna curentă {fmtPrice(r.avg_price_this_month)} · luna trecută {fmtPrice(r.avg_price_prev_month)} ·{" "}
                      preț/mp {fmtPrice(r.avg_sqm_this_month)} vs {fmtPrice(r.avg_sqm_prev_month)} ·{" "}
                      {r.with_phone} cu telefon · ultimul anunț {fmtDate(r.last_found_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eficiența scanării pe platformă</CardTitle>
          <CardDescription className="text-xs">
            Câte anunțuri aduce fiecare sursă, câte sunt duplicate sau agenții și cât durează scanarea
            {avgRunMs ? ` (o scanare durează în medie ${(avgRunMs / 1000).toFixed(1)} secunde)` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Încă nu există scanări înregistrate.</p>
          ) : (
            <div className="border rounded-lg divide-y">
              {timings.map((t) => {
                const rep = rows.find((r) => r.source_platform === t.platform);
                const efficiency = t.calls ? Math.round((t.inserted / t.calls) * 100) / 100 : 0;
                return (
                  <div key={t.platform} className="p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{t.platform}</span>
                      <Badge variant="secondary" className="text-[10px]">{t.inserted} anunțuri noi</Badge>
                      <Badge variant="outline" className="text-[10px]">{efficiency} anunțuri / verificare</Badge>
                      {t.avgMs && <Badge variant="outline" className="text-[10px]">~{(t.avgMs / 1000).toFixed(1)}s per verificare</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      {t.calls} verificări · {t.timeouts} depășiri de timp · {t.errors} erori · {t.skipped} sărite
                      {rep ? ` · ${rep.duplicates} duplicate · ${rep.agencies} agenții · ${rep.invalid_data} date incomplete` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
