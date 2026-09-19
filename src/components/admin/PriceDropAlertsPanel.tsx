/**
 * „Scăderi de preț" — alertă în Admin când un anunț salvat (din baza de anunțuri
 * găsite pe platforme) își scade prețul peste un procent ales de administrator.
 * Pragul se salvează local, pentru fiecare utilizator.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ExternalLink, TrendingDown, Download, BellRing } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";

const STORAGE_KEY = "rt_price_drop_threshold";

interface Row {
  id: string;
  listing_id: string | null;
  old_price: number | null;
  new_price: number | null;
  drop_pct: number | null;
  source_platform: string | null;
  source_url: string | null;
  recorded_at: string | null;
}

interface Titles {
  [id: string]: { title: string | null; zone: string | null; contact_phone: string | null };
}

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);

const dateRo = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function PriceDropAlertsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [titles, setTitles] = useState<Titles>({});
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("30");
  const [platform, setPlatform] = useState("all");
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const n = saved ? Number(saved) : NaN;
    // Interval recomandat 3–5%: nu pierdem scăderi mici, dar nici nu ne inundă cu zgomot.
    return Number.isFinite(n) && n >= 3 && n <= 5 ? n : 3;
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(threshold));
  }, [threshold]);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("prospect_price_drop_alerts")
      .select("id,listing_id,old_price,new_price,drop_pct,source_platform,source_url,recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(400);
    if (error) {
      toast.error("Nu am putut încărca scăderile de preț");
      setLoading(false);
      return;
    }
    const list = ((data || []) as unknown as Row[]) || [];
    setRows(list);

    const ids = Array.from(new Set(list.map((r) => r.listing_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ls } = await supabase
        .from("prospect_listings")
        .select("id,title,zone,contact_phone")
        .in("id", ids);
      const map: Titles = {};
      (ls || []).forEach((l: { id: string; title: string | null; zone: string | null; contact_phone: string | null }) => {
        map[l.id] = { title: l.title, zone: l.zone, contact_phone: l.contact_phone };
      });
      setTitles(map);
    } else {
      setTitles({});
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("price-drop-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prospect_price_drop_alerts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const platforms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source_platform).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (platform !== "all" && (r.source_platform || "") !== platform) return false;
        return Number(r.drop_pct ?? 0) >= threshold;
      }),
    [rows, platform, threshold],
  );

  const last24h = useMemo(
    () => filtered.filter((r) => r.recorded_at && Date.now() - new Date(r.recorded_at).getTime() < 86_400_000),
    [filtered],
  );

  /** Rulează verificarea imediat, cu pragul ales aici (3–5%). */
  const checkNow = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-price-drop-alert", {
        body: { min_pct: threshold, min_abs: 0, hours: 24 },
      });
      if (error) throw error;
      const drops = Number((data as { drops?: number } | null)?.drops || 0);
      toast[drops ? "success" : "info"](
        drops ? `${drops} scădere(i) de preț de cel puțin ${threshold}%` : "Nicio scădere nouă de preț",
      );
      await load();
    } catch (e) {
      toast.error("Nu am putut verifica scăderile de preț");
    } finally {
      setChecking(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      csvFileName("scaderi-preturi"),
      ["Data", "Anunț", "Zonă", "Platformă", "Preț vechi", "Preț nou", "Scădere %", "Telefon", "Link"],
      filtered.map((r) => [
        dateRo(r.recorded_at),
        titles[r.listing_id || ""]?.title || "",
        titles[r.listing_id || ""]?.zone || "",
        r.source_platform || "",
        r.old_price ?? "",
        r.new_price ?? "",
        r.drop_pct ?? "",
        titles[r.listing_id || ""]?.contact_phone || "",
        r.source_url || "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Scăderi de preț la anunțurile salvate
        </CardTitle>
        <CardDescription>
          Anunțurile salvate sunt cele găsite pe platforme (OLX, Storia.ro, imobiliare.ro, Publi24,
          BursaImobiliara.ro) și păstrate în listă. Aici apar doar cele care au scăzut prețul cu cel puțin
          procentul ales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {last24h.length > 0 && (
          <Alert>
            <BellRing className="h-4 w-4" />
            <AlertTitle>{last24h.length} scădere(i) de preț în ultimele 24 de ore</AlertTitle>
            <AlertDescription>
              Cea mai mare scădere: {Math.max(...last24h.map((r) => Number(r.drop_pct ?? 0))).toFixed(1)}%. Contactează
              proprietarul cât timp prețul este proaspăt actualizat.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Scădere minimă (%)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={3}
                max={5}
                step={0.5}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(3, Math.min(5, Number(e.target.value) || 3)))}
                className="w-24"
              />
              <div className="flex gap-1">
                {[3, 4, 5].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={threshold === v ? "default" : "outline"}
                    onClick={() => setThreshold(v)}
                    aria-label={`Setează scăderea minimă la ${v}%`}
                  >
                    {v}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Perioadă</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 zile</SelectItem>
                <SelectItem value="30">30 zile</SelectItem>
                <SelectItem value="90">90 zile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Platformă</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate platformele</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Reîncarcă
          </Button>
          <Button variant="outline" onClick={checkNow} disabled={checking}>
            <BellRing className={`h-4 w-4 mr-2 ${checking ? "animate-pulse" : ""}`} />
            Verifică scăderile acum
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {filtered.length} anunț(uri) cu scădere de cel puțin {threshold}% în ultimele {days} de zile.
        </p>

        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = titles[r.listing_id || ""] || { title: null, zone: null, contact_phone: null };
            return (
              <div key={r.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">-{Number(r.drop_pct ?? 0).toFixed(1)}%</Badge>
                  {r.source_platform && <Badge variant="secondary">{r.source_platform}</Badge>}
                  {meta.zone && <Badge variant="outline">{meta.zone}</Badge>}
                  <span className="text-xs text-muted-foreground">{dateRo(r.recorded_at)}</span>
                </div>
                <div className="font-medium text-sm">
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      {meta.title || "Anunț fără titlu"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    meta.title || "Anunț fără titlu"
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">{eur(r.old_price)}</span> → <strong>{eur(r.new_price)}</strong>
                  {meta.contact_phone ? ` · ${meta.contact_phone}` : ""}
                </div>
              </div>
            );
          })}
          {!loading && !filtered.length && (
            <p className="text-sm text-muted-foreground">
              Nicio scădere de preț peste {threshold}% în perioada selectată.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
