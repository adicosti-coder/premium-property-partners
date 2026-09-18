import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface KeywordRow {
  id: string;
  keyword: string;
  platform: string;
  is_active: boolean;
  found_period: number;
  with_phone: number;
  avg_price: number | null;
  last_found_at: string | null;
  success_count: number;
  fail_count: number;
  consecutive_zero: number;
  unique_leads_count: number;
  last_success_at: string | null;
  /** Zona în care cuvântul cheie aduce cele mai multe anunțuri. */
  top_zone: string | null;
  zone_avg_price: number | null;
  zone_avg_price_prev: number | null;
  zone_variation_pct: number | null;
  zone_avg_sqm: number | null;
  site_zone_count: number;
  site_zone_avg_price: number | null;
}

const PLATFORMS = ["OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro"];
const PERIODS = [
  { value: "7", label: "Ultimele 7 zile" },
  { value: "30", label: "Ultimele 30 zile" },
  { value: "90", label: "Ultimele 90 zile" },
];

const fmtPrice = (p: number | null) => (p ? `${Number(p).toLocaleString("ro-RO")} €` : "—");
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }) : "—";

/** Durata surselor pentru un cuvânt cheie, calculată din ultimele scanări. */
interface KeywordTiming {
  calls: number;
  avgMs: number;
  slowestMs: number;
  slowestPlatform: string | null;
  timeouts: number;
  skipped: number;
}

export default function KeywordEfficiencyReport() {
  const [days, setDays] = useState("30");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [timings, setTimings] = useState<Record<string, KeywordTiming>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatform, setNewPlatform] = useState(PLATFORMS[0]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_keyword_scan_report_v2", {
      p_days: Number(days),
      p_platform: platform === "all" ? null : platform,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Eroare raport cuvinte cheie", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data || []) as unknown as KeywordRow[]);

    // Durata reală a surselor pentru fiecare cuvânt cheie, din ultimele scanări.
    const { data: runs } = await supabase
      .from("keyword_radar_runs")
      .select("stats")
      .order("started_at", { ascending: false })
      .limit(15);

    const acc: Record<string, KeywordTiming & { total: number }> = {};
    for (const run of runs || []) {
      const details = (run as { stats?: { details?: unknown[] } }).stats?.details || [];
      for (const d of details as {
        keyword?: string;
        platforms?: Record<string, { duration_ms?: number; timeout_ms?: number; skipped?: string }>;
      }[]) {
        const kw = d?.keyword;
        if (!kw) continue;
        const t = acc[kw] || {
          calls: 0, avgMs: 0, slowestMs: 0, slowestPlatform: null, timeouts: 0, skipped: 0, total: 0,
        };
        for (const [p, res] of Object.entries(d.platforms || {})) {
          if (res?.skipped) { t.skipped += 1; continue; }
          const ms = Number(res?.duration_ms || 0);
          if (res?.timeout_ms) t.timeouts += 1;
          if (ms > 0) {
            t.calls += 1;
            t.total += ms;
            if (ms > t.slowestMs) { t.slowestMs = ms; t.slowestPlatform = p; }
          }
        }
        acc[kw] = t;
      }
    }
    const out: Record<string, KeywordTiming> = {};
    for (const [kw, t] of Object.entries(acc)) {
      out[kw] = { ...t, avgMs: t.calls ? Math.round(t.total / t.calls) : 0 };
    }
    setTimings(out);
  }, [days, platform]);

  useEffect(() => { void load(); }, [load]);

  const sec = (ms: number | null | undefined) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    return q ? rows.filter((r) => norm(r.keyword).includes(q)) : rows;
  }, [rows, search]);

  const active = useMemo(() => filtered.filter((r) => r.is_active), [filtered]);
  const useless = useMemo(
    () => active.filter((r) => r.found_period === 0 && r.unique_leads_count === 0),
    [active],
  );

  const setActive = async (row: KeywordRow, is_active: boolean) => {
    setBusy(row.id);
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({
        is_active,
        auto_disabled_reason: is_active ? null : "fara_rezultate_raport",
      })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast({ title: "Nu s-a putut actualiza", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: is_active ? "Cuvânt cheie reactivat" : "Cuvânt cheie scos din scanare" });
    void load();
  };

  const disableUseless = async () => {
    if (!useless.length) return;
    setBusy("bulk");
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ is_active: false, auto_disabled_reason: "fara_rezultate_raport" })
      .in("id", useless.map((r) => r.id));
    setBusy(null);
    if (error) {
      toast({ title: "Nu s-au putut scoate", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${useless.length} cuvinte fără rezultate au fost scoase din scanare` });
    void load();
  };

  const addKeyword = async () => {
    const value = newKeyword.trim();
    if (value.length < 3) {
      toast({ title: "Scrie cuvântul cheie (minim 3 caractere)", variant: "destructive" });
      return;
    }
    setBusy("add");
    const { error } = await supabase
      .from("scraper_search_keywords")
      .insert({ keyword: value, platform: newPlatform, is_active: true });
    setBusy(null);
    if (error) {
      toast({ title: "Nu s-a putut adăuga", description: error.message, variant: "destructive" });
      return;
    }
    setNewKeyword("");
    toast({ title: "Cuvânt cheie adăugat", description: `${value} · ${newPlatform}` });
    void load();
  };

  const exportCsv = () => {
    downloadCsv(
      csvFileName("raport-cuvinte-cheie"),
      ["Cuvânt cheie", "Platformă", "Activ", "Anunțuri", "Cu telefon", "Preț mediu", "Ultimul anunț", "Scanări reușite", "Scanări fără rezultat", "Zero consecutiv", "Timp mediu sursă (ms)", "Cea mai lentă sursă", "Timp cea mai lentă (ms)", "Depășiri de timp", "Surse sărite", "Zonă principală", "Preț mediu zonă luna asta", "Preț mediu zonă luna trecută", "Variație lunară %", "€/mp zonă", "Anunțuri realtrust.ro în zonă", "Preț mediu realtrust.ro"],
      filtered.map((r) => {
        const t = timings[r.keyword];
        return [
          r.keyword,
          r.platform,
          r.is_active ? "da" : "nu",
          r.found_period,
          r.with_phone,
          r.avg_price ?? "",
          r.last_found_at ?? "",
          r.success_count,
          r.fail_count,
          r.consecutive_zero,
          t?.avgMs ?? "",
          t?.slowestPlatform ?? "",
          t?.slowestMs ?? "",
          t?.timeouts ?? "",
          t?.skipped ?? "",
          r.top_zone ?? "",
          r.zone_avg_price ?? "",
          r.zone_avg_price_prev ?? "",
          r.zone_variation_pct ?? "",
          r.zone_avg_sqm ?? "",
          r.site_zone_count ?? 0,
          r.site_zone_avg_price ?? "",
        ];
      }),
    );
  };

  return (
    <Card className="border-2 border-sky-500/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Eficiența cuvintelor cheie</CardTitle>
            <CardDescription className="text-xs">
              Câte anunțuri aduce fiecare cuvânt cheie, pe platformă. Cele care nu aduc nimic pot fi scoase și înlocuite.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[165px] min-h-[44px] sm:min-h-0" aria-label="Filtrează pe platformă">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate platformele</SelectItem>
                {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[150px] min-h-[44px] sm:min-h-0" aria-label="Alege perioada">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Reîmprospătează" className="min-h-[44px] sm:min-h-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length} className="min-h-[44px] sm:min-h-0">
              <Download className="h-4 w-4 mr-1" /> Descarcă
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută în cuvintele cheie"
              className="pl-8 min-h-[44px] sm:min-h-0"
              aria-label="Caută în cuvintele cheie"
            />
          </div>
          <Badge variant="secondary">{active.length} active</Badge>
          <Badge variant="outline">{useless.length} fără rezultate</Badge>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void disableUseless()}
            disabled={!useless.length || busy === "bulk"}
            className="min-h-[44px] sm:min-h-0"
          >
            {busy === "bulk" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Scoate cele fără rezultate
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addKeyword(); }}
            placeholder="Adaugă un cuvânt cheie nou (ex. apartament 3 camere Openville proprietar)"
            className="flex-1 min-w-[220px] min-h-[44px] sm:min-h-0"
            aria-label="Adaugă un cuvânt cheie nou"
          />
          <Select value={newPlatform} onValueChange={setNewPlatform}>
            <SelectTrigger className="w-[165px] min-h-[44px] sm:min-h-0" aria-label="Platforma cuvântului nou">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => void addKeyword()} disabled={busy === "add"} className="min-h-[44px] sm:min-h-0">
            {busy === "add" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Adaugă
          </Button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">{loading ? "Se încarcă…" : "Niciun cuvânt cheie pentru filtrele alese."}</p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[520px] overflow-auto">
            {filtered.map((r) => (
              <div key={r.id} className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{r.keyword}</span>
                  <Badge variant="outline" className="text-[10px]">{r.platform}</Badge>
                  <Badge variant={r.found_period > 0 ? "secondary" : "destructive"} className="text-[10px]">
                    {r.found_period} anunțuri
                  </Badge>
                  {!r.is_active && <Badge variant="outline" className="text-[10px]">inactiv</Badge>}
                  <Button
                    size="sm"
                    variant={r.is_active ? "outline" : "secondary"}
                    className="ml-auto min-h-[44px] sm:min-h-0"
                    disabled={busy === r.id}
                    onClick={() => void setActive(r, !r.is_active)}
                  >
                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : r.is_active ? "Scoate" : "Reactivează"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.with_phone} cu telefon · preț mediu {fmtPrice(r.avg_price)} · ultimul anunț {fmtDate(r.last_found_at)} ·{" "}
                  {r.success_count} scanări cu rezultat · {r.fail_count} fără · {r.consecutive_zero} zero consecutiv
                </p>
                {timings[r.keyword] && (
                  <p className="text-[11px] text-muted-foreground">
                    timp mediu pe sursă {sec(timings[r.keyword].avgMs)} · cea mai lentă{" "}
                    {timings[r.keyword].slowestPlatform || "—"} {sec(timings[r.keyword].slowestMs)} ·{" "}
                    {timings[r.keyword].timeouts} depășiri de timp · {timings[r.keyword].skipped} surse sărite
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
