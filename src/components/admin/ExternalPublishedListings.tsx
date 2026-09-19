/**
 * „Anunțuri publicate extern" — anunțurile mele marcate ca publicate pe OLX, Storia.ro,
 * imobiliare.ro, Publi24 și BursaImobiliara.ro, cu link direct, preț, durata de la publicare
 * și durata rămasă estimată până la expirarea anunțului pe platformă.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, RefreshCw, Download, Clock, AlertTriangle, Loader2, Euro } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";

/** Durata standard de afișare a unui anunț pe fiecare platformă (zile). */
const PLATFORM_LIFETIME_DAYS: Record<string, number> = {
  "OLX": 30,
  "Storia.ro": 60,
  "imobiliare.ro": 30,
  "Publi24": 30,
  "BursaImobiliara.ro": 30,
  "realtrust.ro": 365,
};

interface MyListingRow {
  id: string;
  title: string | null;
  zone: string | null;
  property_type: string | null;
  rooms: number | null;
  size: number | null;
  price: number | null;
  image_url: string | null;
  publish_status: Record<string, unknown> | null;
}

interface PublishedRow {
  listingId: string;
  title: string;
  platform: string;
  url: string | null;
  price: number | null;
  size: number | null;
  zone: string | null;
  publishedAt: string | null;
  daysOnline: number | null;
  daysLeft: number | null;
}

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const readPublish = (raw: unknown): { at: string | null; url: string | null } | null => {
  if (!raw) return null;
  if (typeof raw === "string") return { at: raw, url: null };
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return { at: typeof o.at === "string" ? o.at : null, url: typeof o.url === "string" ? o.url : null };
  }
  return null;
};

export default function ExternalPublishedListings() {
  const [rows, setRows] = useState<PublishedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [q, setQ] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, number | null>>({});
  const [liveCheckedAt, setLiveCheckedAt] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);

  /** Citește prețul afișat chiar acum pe pagina anunțului de pe fiecare platformă. */
  const checkLivePrices = async (urls: string[]) => {
    const list = Array.from(new Set(urls.filter(Boolean))).slice(0, 12);
    if (!list.length) {
      toast({ title: "Niciun link de verificat", description: "Adaugă linkul anunțului publicat pe platformă." });
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-listing-prices", { body: { urls: list } });
      if (error) throw error;
      const map = (data as { prices?: Record<string, { price: number | null; rent: number | null }> } | null)?.prices;
      if (!map) throw new Error("Platformele nu au returnat prețuri.");
      const next: Record<string, number | null> = {};
      for (const [u, v] of Object.entries(map)) next[u] = v?.price ?? v?.rent ?? null;
      setLivePrices(prev => ({ ...prev, ...next }));
      const stamp = new Date().toLocaleString("ro-RO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
      setLiveCheckedAt(prev => {
        const upd = { ...prev };
        for (const u of Object.keys(next)) upd[u] = stamp;
        return upd;
      });
      const found = Object.values(next).filter(v => v != null).length;
      toast({ title: "Prețuri live citite", description: `${found} din ${list.length} anunțuri au preț citit acum (${stamp}).` });
    } catch (e) {
      toast({
        title: "Nu am putut citi prețurile live",
        description: e instanceof Error ? e.message : "Eroare necunoscută",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("my_listings")
      .select("id,title,zone,property_type,rooms,size,price,image_url,publish_status")
      .order("updated_at", { ascending: false })
      .limit(300);

    const out: PublishedRow[] = [];
    for (const r of (data ?? []) as unknown as MyListingRow[]) {
      const status = (r.publish_status || {}) as Record<string, unknown>;
      for (const [platformName, raw] of Object.entries(status)) {
        const info = readPublish(raw);
        if (!info?.at) continue;
        const at = new Date(info.at).getTime();
        const daysOnline = Number.isFinite(at) ? Math.max(0, Math.floor((Date.now() - at) / 86_400_000)) : null;
        const lifetime = PLATFORM_LIFETIME_DAYS[platformName] ?? 30;
        out.push({
          listingId: r.id,
          title: r.title || "Anunț fără titlu",
          platform: platformName,
          url: info.url,
          price: r.price,
          size: r.size,
          zone: r.zone,
          publishedAt: info.at,
          daysOnline,
          daysLeft: daysOnline == null ? null : Math.max(0, lifetime - daysOnline),
        });
      }
    }
    out.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    setRows(out);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const platforms = useMemo(
    () => Array.from(new Set(rows.map(r => r.platform))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (platform !== "all" && r.platform !== platform) return false;
      if (!term) return true;
      return `${r.title} ${r.zone || ""}`.toLowerCase().includes(term);
    });
  }, [rows, platform, q]);

  const expiringSoon = filtered.filter(r => r.daysLeft != null && r.daysLeft <= 7);

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-publicate-extern"),
      ["Titlu", "Platformă", "Preț", "€/mp", "Zonă", "Publicat", "Zile online", "Zile rămase", "Link"],
      filtered.map(r => [
        r.title,
        r.platform,
        r.price == null ? "" : String(r.price),
        r.price && r.size ? String(Math.round(Number(r.price) / Number(r.size))) : "",
        r.zone || "",
        dateRo(r.publishedAt),
        r.daysOnline == null ? "" : String(r.daysOnline),
        r.daysLeft == null ? "" : String(r.daysLeft),
        r.url || "",
      ]),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" /> Anunțuri publicate extern
            </CardTitle>
            <CardDescription>
              Anunțurile mele publicate pe platformele externe, cu link, preț, durata de la publicare
              și durata rămasă estimată — pentru comparație cu „Anunțuri salvate”.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="min-h-[40px]">
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void checkLivePrices(filtered.map(r => r.url || ""))}
              disabled={checking || !filtered.length}
              className="min-h-[40px]"
            >
              {checking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Euro className="h-4 w-4 mr-1" />}
              Preț live
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length} className="min-h-[40px]">
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Caută după titlu sau zonă"
            className="min-h-[44px]"
            aria-label="Caută în anunțurile publicate extern"
          />
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="sm:w-[200px] min-h-[44px]" aria-label="Filtrează pe platformă">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate platformele</SelectItem>
              {platforms.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {expiringSoon.length > 0 && (
          <div className="flex items-center gap-2 text-xs rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            {expiringSoon.length} {expiringSoon.length === 1 ? "anunț expiră" : "anunțuri expiră"} în mai puțin de 7 zile — reînnoiește-le pe platformă.
          </div>
        )}

        <div className="text-xs text-muted-foreground">{filtered.length} publicări</div>

        {filtered.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Niciun anunț marcat ca publicat. Marchează publicarea din „Anunțurile mele”.
          </p>
        )}

        <div className="divide-y rounded-lg border">
          {filtered.map(r => (
            <div key={`${r.listingId}-${r.platform}`} className="p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] shrink-0">{r.platform}</Badge>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex-1 truncate underline underline-offset-2 hover:text-primary"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span className="text-sm flex-1 truncate">{r.title}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{eur(r.price)}</span>
                {r.url && livePrices[r.url] != null && (
                  <span className="font-medium text-emerald-600">
                    live: {eur(livePrices[r.url] as number)}
                    {r.price != null && Number(livePrices[r.url]) !== Number(r.price) && (
                      <span className="ml-1 text-amber-600">
                        ({Number(livePrices[r.url]) > Number(r.price) ? "+" : ""}
                        {Math.round(Number(livePrices[r.url]) - Number(r.price)).toLocaleString("ro-RO")} €)
                      </span>
                    )}
                  </span>
                )}
                {r.url && (
                  <button
                    type="button"
                    onClick={() => void checkLivePrices([r.url as string])}
                    className="underline hover:text-foreground"
                    disabled={checking}
                  >
                    Verifică prețul live
                  </button>
                )}
                {r.price && r.size ? <span>{Math.round(Number(r.price) / Number(r.size)).toLocaleString("ro-RO")} €/mp</span> : null}
                {r.zone && <span>{r.zone}</span>}
                <span>Publicat: {dateRo(r.publishedAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {r.daysOnline ?? "—"} zile online
                </span>
                <span className={r.daysLeft != null && r.daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>
                  {r.daysLeft == null ? "durată rămasă necunoscută" : `${r.daysLeft} zile rămase`}
                </span>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-foreground hover:bg-accent min-h-[32px]"
                  >
                    <ExternalLink className="h-3 w-3" /> Deschide
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
