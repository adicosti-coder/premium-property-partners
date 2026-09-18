import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Loader2, Phone, RefreshCw, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

interface Row {
  id: string;
  collection: string;
  keyword: string;
  title: string | null;
  price: number | null;
  size: number | null;
  rooms: number | null;
  zone: string | null;
  source_platform: string | null;
  source_url: string | null;
  contact_phone: string | null;
  created_at: string;
  last_seen_at: string | null;
}

const COLLECTION_LABELS: Record<string, string> = {
  blocuri_noi: "Blocuri noi",
  ansambluri: "Ansambluri rezidențiale",
  complexe_prestigiu: "Complexe de prestigiu",
};

const PERIODS = [
  { value: "7", label: "Ultimele 7 zile" },
  { value: "30", label: "Ultimele 30 zile" },
  { value: "90", label: "Ultimele 90 zile" },
];

const label = (c: string) => COLLECTION_LABELS[c] || c;
const fmtPrice = (p: number | null) => (p ? `${Number(p).toLocaleString("ro-RO")} €` : "—");
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
const sec = (ms: number | undefined) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Anunțurile găsite pe fiecare colecție de cuvinte cheie (Blocuri noi, Ansambluri, Complexe),
 * cu preț, €/mp, durata medie a sursei și link direct către anunț.
 */
export default function CollectionListingsReport() {
  const [days, setDays] = useState("30");
  const [collection, setCollection] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [platformMs, setPlatformMs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_collection_listings_report", {
      p_days: Number(days),
      p_collection: collection === "all" ? null : collection,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Eroare raport colecții", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data || []) as unknown as Row[]);

    // Durata medie reală a fiecărei surse, din ultimele scanări.
    const { data: runs } = await supabase
      .from("keyword_radar_runs")
      .select("stats")
      .order("started_at", { ascending: false })
      .limit(15);
    const acc: Record<string, { total: number; calls: number }> = {};
    for (const run of runs || []) {
      const details = (run as { stats?: { details?: unknown[] } }).stats?.details || [];
      for (const d of details as { platforms?: Record<string, { duration_ms?: number }> }[]) {
        for (const [p, res] of Object.entries(d.platforms || {})) {
          const ms = Number(res?.duration_ms || 0);
          if (ms <= 0) continue;
          const cur = acc[p] || { total: 0, calls: 0 };
          cur.total += ms;
          cur.calls += 1;
          acc[p] = cur;
        }
      }
    }
    const out: Record<string, number> = {};
    for (const [p, v] of Object.entries(acc)) out[p] = Math.round(v.total / v.calls);
    setPlatformMs(out);
  }, [days, collection]);

  useEffect(() => { void load(); }, [load]);

  const collections = useMemo(() => {
    const map = new Map<string, { count: number; sum: number; priced: number }>();
    for (const r of rows) {
      const cur = map.get(r.collection) || { count: 0, sum: 0, priced: 0 };
      cur.count += 1;
      if (r.price) { cur.sum += Number(r.price); cur.priced += 1; }
      map.set(r.collection, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return rows;
    return rows.filter((r) => norm(`${r.title || ""} ${r.zone || ""} ${r.keyword}`).includes(q));
  }, [rows, search]);

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-pe-colectii"),
      ["Colecție", "Cuvânt cheie", "Titlu", "Zonă", "Camere", "Suprafață", "Preț", "€/mp", "Platformă", "Durata medie sursă (ms)", "Telefon", "Link", "Găsit la", "Ultima verificare"],
      filtered.map((r) => [
        label(r.collection),
        r.keyword,
        r.title ?? "",
        r.zone ?? "",
        r.rooms ?? "",
        r.size ?? "",
        r.price ?? "",
        r.price && r.size ? Math.round(Number(r.price) / Number(r.size)) : "",
        r.source_platform ?? "",
        (r.source_platform && platformMs[r.source_platform]) || "",
        r.contact_phone ?? "",
        r.source_url ?? "",
        r.created_at,
        r.last_seen_at ?? "",
      ]),
    );
  };

  return (
    <Card className="border-2 border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Anunțuri pe colecții de cuvinte cheie</CardTitle>
            <CardDescription className="text-xs">
              Ce aduce fiecare colecție — Blocuri noi, Ansambluri, Complexe de prestigiu — cu preț, durata sursei și link direct.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={collection} onValueChange={setCollection}>
              <SelectTrigger className="w-[190px] min-h-[44px] sm:min-h-0" aria-label="Alege colecția">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate colecțiile</SelectItem>
                {Object.keys(COLLECTION_LABELS).map((c) => (
                  <SelectItem key={c} value={c}>{COLLECTION_LABELS[c]}</SelectItem>
                ))}
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
          {collections.length === 0 && !loading && (
            <span className="text-xs text-muted-foreground">Nicio colecție cu anunțuri în perioada aleasă.</span>
          )}
          {collections.map(([c, s]) => (
            <Badge key={c} variant="secondary" className="text-[11px]">
              {label(c)}: {s.count} anunțuri
              {s.priced ? ` · preț mediu ${fmtPrice(Math.round(s.sum / s.priced))}` : ""}
            </Badge>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută în titlu, zonă sau cuvânt cheie"
            className="pl-8 min-h-[44px] sm:min-h-0"
            aria-label="Caută în anunțurile colecțiilor"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">{loading ? "Se încarcă…" : "Niciun anunț pentru filtrele alese."}</p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[560px] overflow-auto">
            {filtered.map((r) => (
              <div key={`${r.id}-${r.collection}`} className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px]">{label(r.collection)}</Badge>
                  <span className="font-medium">{r.title || "Anunț fără titlu"}</span>
                  <Badge variant="secondary" className="text-[10px]">{fmtPrice(r.price)}</Badge>
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-primary underline min-h-[44px] sm:min-h-0"
                      aria-label={`Deschide anunțul pe ${r.source_platform || "platformă"}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Deschide anunțul
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.source_platform || "platformă necunoscută"} · durata medie sursă{" "}
                  {sec(r.source_platform ? platformMs[r.source_platform] : undefined)} · cuvânt cheie „{r.keyword}”
                  {r.zone ? ` · ${r.zone}` : ""}
                  {r.rooms ? ` · ${r.rooms} camere` : ""}
                  {r.size ? ` · ${r.size} mp` : ""}
                  {r.price && r.size ? ` · ${Math.round(Number(r.price) / Number(r.size)).toLocaleString("ro-RO")} €/mp` : ""}
                  {" · găsit "}{fmtDate(r.created_at)}
                </p>
                {r.contact_phone && (
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary underline min-h-[44px] sm:min-h-0"
                    aria-label={`Sună la ${r.contact_phone}`}
                  >
                    <Phone className="h-3.5 w-3.5" /> {r.contact_phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
