import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Loader2, Plus, Trash2, Globe, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import KeywordRadarLiveReport from "./KeywordRadarLiveReport";
import KeywordRadarSourceHealth from "./KeywordRadarSourceHealth";
import KeywordRadarNewListings, { PROSPECT_REFRESH_EVENT } from "./KeywordRadarNewListings";
import PlatformReportPanel from "./PlatformReportPanel";
import PlatformConfigPanel from "./PlatformConfigPanel";

interface SourceRow {
  id: string;
  keyword: string;
  platform: string | null;
  is_active: boolean;
  created_at: string;
}

interface AdHocListing {
  title?: string | null;
  url?: string | null;
  price?: number | string | null;
  phone?: string | null;
  zone?: string | null;
  rooms?: number | null;
  source_platform?: string | null;
  platform?: string | null;
}

const ZONE_OPTIONS = [
  "Aradului",
  "Girocului",
  "Complex Studențesc",
  "Iosefin",
  "Cetate / Centru",
  "Fabric",
  "Dumbrăvița",
  "Circumvalațiunii",
  "Calea Lipovei",
  "Șagului",
];

const ALL_PLATFORMS = "__all__";

const PLATFORM_OPTIONS = [
  "Facebook Groups",
  "Facebook Marketplace",
  "OLX",
  "Storia.ro",
  "imobiliare.ro",
  "Publi24",
  "BursaImobiliara.ro",
  "Custom",
];

// Platformele acoperite când se caută „pe toate" (cele cu anunțuri de proprietari)
const MULTI_SEARCH_PLATFORMS = ["OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro"];

const ANY_TYPE = "__any__";
const ANY_ZONE = "__anyzone__";

const PROPERTY_TYPES = [
  { value: "apartament", label: "Apartament" },
  { value: "garsonieră", label: "Garsonieră" },
  { value: "casă", label: "Casă / vilă" },
  { value: "teren", label: "Teren" },
  { value: "spațiu comercial", label: "Spațiu comercial" },
];

const normalizeText = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ĂÂÎȘȚăâîșț]/g, c => ({ Ă: "A", Â: "A", Î: "I", Ș: "S", Ț: "T", ă: "a", â: "a", î: "i", ș: "s", ț: "t" }[c] || c))
    .toLowerCase()
    .trim();

export default function KeywordRadarPanel() {
  const [running, setRunning] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatform, setNewPlatform] = useState<string>("Custom");
  const [adding, setAdding] = useState(false);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [zone, setZone] = useState<string>(ZONE_OPTIONS[0]);
  const [zoneKeyword, setZoneKeyword] = useState("");
  const [zonePlatform, setZonePlatform] = useState<string>("OLX");
  const [addingZone, setAddingZone] = useState(false);
  // Căutare liberă de anunțuri de la proprietari (nu în cuvintele salvate)
  const [search, setSearch] = useState("");
  const [searchPlatform, setSearchPlatform] = useState<string>(ALL_PLATFORMS);
  const [searchType, setSearchType] = useState<string>(ANY_TYPE);
  const [searchZone, setSearchZone] = useState<string>(ANY_ZONE);
  const [searchResults, setSearchResults] = useState<AdHocListing[] | null>(null);
  const [searchSummary, setSearchSummary] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  // Căutare pe zonă + caracteristică
  const [zsZone, setZsZone] = useState<string>(ZONE_OPTIONS[0]);
  const [zsPlatform, setZsPlatform] = useState<string>(ALL_PLATFORMS);
  const [zsType, setZsType] = useState<string>("apartament");
  const [zsFeature, setZsFeature] = useState("2 camere");
  const [zsSearching, setZsSearching] = useState(false);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id,keyword,platform,is_active,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setSources((data || []) as SourceRow[]);
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  // Căutare la cerere: orice frază scrisă aici este trimisă la scraper cu
  // filtrul „doar proprietari" activ. Nu salvează cuvântul în listă.
  const searchOnePlatform = async (term: string, platform: string) => {
    const { data, error } = await supabase.functions.invoke("scrape-prospects", {
      body: {
        custom_query: term,
        custom_platform: platform,
        max_results: 10,
        preserve_agency_filter: true,
        hydrate_phones: false,
      },
    });
    if (error) throw error;
    const listings = Array.isArray((data as any)?.listings) ? ((data as any).listings as AdHocListing[]) : [];
    const b = (data as any)?.funnel_breakdown || {};
    return {
      platform,
      listings: listings.map(l => ({ ...l, source_platform: l.source_platform || l.platform || platform })),
      agency: Number(b.agency_signal || 0),
      duplicate: Number(b.duplicate || 0),
    };
  };

  const executeSearch = async (term: string, platform: string) => {
    setSearchResults(null);
    setSearchSummary(null);
    const platforms = platform === ALL_PLATFORMS ? MULTI_SEARCH_PLATFORMS : [platform];

    const settled = await Promise.allSettled(platforms.map(p => searchOnePlatform(term, p)));
    const ok = settled.flatMap(r => (r.status === "fulfilled" ? [r.value] : []));
    const failedCount = settled.length - ok.length;
    if (ok.length === 0) {
      const first = settled.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
      throw new Error(first?.reason?.message || "Căutarea nu a returnat rezultate.");
    }

    // Deduplicare pe link între platforme
    const seen = new Set<string>();
    const listings: AdHocListing[] = [];
    for (const r of ok) {
      for (const l of r.listings) {
        const key = (l.url || "").trim() || `${l.title || ""}|${l.price || ""}`;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        listings.push(l);
      }
    }
    setSearchResults(listings);

    const agency = ok.reduce((s, r) => s + r.agency, 0);
    const duplicate = ok.reduce((s, r) => s + r.duplicate, 0);
    const perPlatform = ok
      .filter(r => r.listings.length > 0)
      .map(r => `${r.platform}: ${r.listings.length}`)
      .join(" · ");
    setSearchSummary(
      `${listings.length} anunțuri de la proprietari pe ${ok.length} ${ok.length === 1 ? "platformă" : "platforme"}` +
        (perPlatform ? ` (${perPlatform})` : "") +
        (agency ? ` · ${agency} agenții excluse` : "") +
        (duplicate ? ` · ${duplicate} deja în listă` : "") +
        (failedCount ? ` · ${failedCount} platforme fără răspuns` : ""),
    );
    // Anunțurile salvate apar imediat în „Anunțuri noi găsite"
    window.dispatchEvent(new Event(PROSPECT_REFRESH_EVENT));
    if (listings.length === 0) {
      toast({
        title: "Niciun anunț nou",
        description: "Toate rezultatele erau de la agenții sau existau deja. Încearcă altă formulare sau altă platformă.",
      });
    }
  };

  const runAdHocSearch = async () => {
    const typePart = searchType === ANY_TYPE ? "" : searchType;
    const zonePart = searchZone === ANY_ZONE ? "" : `${searchZone} Timișoara`;
    const term = `${typePart} ${search.trim()} ${zonePart}`.replace(/\s+/g, " ").trim();
    if (term.length < 3) {
      toast({ title: "Scrie cel puțin 3 litere", description: "Ex: apartament 2 camere Aradului" });
      return;
    }
    setSearching(true);
    try {
      await executeSearch(term, searchPlatform);
    } catch (e: any) {
      toast({ title: "Eroare căutare anunțuri", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const runZoneSearch = async () => {
    const feature = zsFeature.trim();
    const typePart = zsType === ANY_TYPE ? "" : zsType;
    const term = `${typePart} ${feature} ${zsZone} Timișoara proprietar`.replace(/\s+/g, " ").trim();
    setZsSearching(true);
    try {
      await executeSearch(term, zsPlatform);
      toast({ title: "Căutare pe zonă rulată", description: `${zsZone} · ${zsPlatform === ALL_PLATFORMS ? "toate platformele" : zsPlatform} · ${typePart || "orice tip"} · ${feature || "toate"}` });
    } catch (e: any) {
      toast({ title: "Eroare căutare pe zonă", description: e.message, variant: "destructive" });
    } finally {
      setZsSearching(false);
    }
  };

  const runDiscover = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-radar-discover", {
        body: { source: "admin_manual" },
      });
      if (error) throw error;
      const added = (data as any)?.added ?? (data as any)?.new_keywords ?? (data as any)?.count ?? "—";
      toast({
        title: "Keyword Radar rulat",
        description: `Cuvinte cheie noi descoperite: ${added}`,
      });
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare Keyword Radar", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const addSource = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      toast({ title: "Câmp gol", description: "Adaugă un URL sau o frază de căutare.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("scraper_search_keywords").insert({
        keyword: trimmed,
        platform: newPlatform,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Sursă adăugată", description: `${newPlatform}: ${trimmed.slice(0, 60)}` });
      setNewKeyword("");
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare adăugare", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const addZoneKeywords = async () => {
    const parts = zoneKeyword
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!parts.length) {
      toast({ title: "Câmp gol", description: "Scrie cel puțin un cuvânt cheie.", variant: "destructive" });
      return;
    }
    setAddingZone(true);
    try {
      const rows = parts.map(kw => ({
        keyword: `${kw} ${zone} Timișoara`.replace(/\s+/g, " "),
        platform: zonePlatform,
        is_active: true,
        owner_filters: { owner_only: true, zone } as any,
      }));
      const { error } = await supabase.from("scraper_search_keywords").insert(rows);
      if (error) throw error;
      toast({
        title: `${rows.length} cuvinte cheie adăugate`,
        description: `${zone} · ${zonePlatform} · doar proprietari`,
      });
      setZoneKeyword("");
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare adăugare", description: e.message, variant: "destructive" });
    } finally {
      setAddingZone(false);
    }
  };

  const toggleSource = async (row: SourceRow) => {
    try {
      const { error } = await supabase
        .from("scraper_search_keywords")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    }
  };

  const deleteSource = async (row: SourceRow) => {
    try {
      const { error } = await supabase.from("scraper_search_keywords").delete().eq("id", row.id);
      if (error) throw error;
      setSources(prev => prev.filter(s => s.id !== row.id));
      toast({ title: "Sursă ștearsă" });
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-blue-600" />
          Extindere Radare & Cuvinte Cheie
        </CardTitle>
        <CardDescription>
          Generează unghiuri noi de căutare pentru zonele premium din Timișoara sau adaugă manual surse (grupuri Facebook, platforme locale).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Raport scanare cu progres live */}
        <KeywordRadarLiveReport />

        <KeywordRadarSourceHealth />

        <KeywordRadarNewListings />

        {/* Rubrică separată: caută anunțuri de la proprietari cu orice cuvinte cheie */}
        <div className="space-y-2 p-4 rounded-lg border-2 border-amber-500/40 bg-amber-500/5">
          <label className="text-sm font-medium flex items-center gap-2" htmlFor="kw-search">
            <Search className="h-4 w-4" /> Caută anunțuri de la proprietari
          </label>
          <p className="text-xs text-muted-foreground">
            Scrie orice cuvinte cheie (zonă, tip, detalii) și caut direct anunțuri noi publicate de proprietari. Agențiile sunt excluse automat. Cuvintele nu se salvează în listă.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="kw-search"
                placeholder="ex: apartament 2 camere Aradului proprietar"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runAdHocSearch(); }}
                className="pl-8 pr-8"
                aria-label="Cuvinte cheie pentru căutarea anunțurilor de la proprietari"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Șterge căutarea"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={searchPlatform} onValueChange={setSearchPlatform}>
              <SelectTrigger className="sm:w-[180px]" aria-label="Alege platforma de căutare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLATFORMS}>Toate platformele</SelectItem>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAdHocSearch} disabled={searching} className="shrink-0 min-h-[44px]">
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Caută anunțuri
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="sm:w-[190px] min-h-[44px] sm:min-h-0" aria-label="Tip de imobil">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TYPE}>Orice tip de imobil</SelectItem>
                {PROPERTY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={searchZone} onValueChange={setSearchZone}>
              <SelectTrigger className="sm:w-[190px] min-h-[44px] sm:min-h-0" aria-label="Zonă">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_ZONE}>Toate zonele</SelectItem>
                {ZONE_OPTIONS.map(z => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {searching && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Caut anunțuri de la proprietari…
            </div>
          )}

          {!searching && searchResults && (
            <div className="pt-1">
              <div className="text-xs text-muted-foreground mb-1">
                {searchSummary || `${searchResults.length} anunțuri`}
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-[360px] overflow-y-auto bg-background/60">
                  {searchResults.map((l, idx) => (
                    <div key={`${l.url || idx}`} className="p-2 space-y-1 hover:bg-accent/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px] shrink-0">
                          {l.source_platform || l.platform || "—"}
                        </Badge>
                        <span className="text-xs flex-1 truncate" title={l.title || ""}>
                          {l.title || "Anunț fără titlu"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {l.zone && <span>{l.zone}</span>}
                        {l.rooms ? <span>{l.rooms} camere</span> : null}
                        {l.price ? <span>{String(l.price)}</span> : null}
                        {l.phone && <span className="font-medium text-foreground">{l.phone}</span>}
                        {l.url && (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                          >
                            Deschide anunțul
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Căutare pe zonă + caracteristică */}
        <div className="space-y-2 p-4 rounded-lg border-2 border-sky-500/40 bg-sky-500/5">
          <label className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" /> Caută pe zonă (doar proprietari)
          </label>
          <p className="text-xs text-muted-foreground">
            Alege zona și platforma, scrie o caracteristică (ex: 2 camere, garsonieră, mobilat) și primești anunțurile noi de la proprietari.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ZONE_OPTIONS.map(z => (
              <button
                key={z}
                type="button"
                onClick={() => setZsZone(z)}
                aria-pressed={zsZone === z}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  zsZone === z
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Select value={zsPlatform} onValueChange={setZsPlatform}>
              <SelectTrigger className="sm:w-[180px]" aria-label="Platformă căutare pe zonă">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLATFORMS}>Toate platformele</SelectItem>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={zsType} onValueChange={setZsType}>
              <SelectTrigger className="sm:w-[180px] min-h-[44px] sm:min-h-0" aria-label="Tip de imobil pentru căutarea pe zonă">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TYPE}>Orice tip de imobil</SelectItem>
                {PROPERTY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="ex: 2 camere, garsonieră, mobilat, etaj 2"
              value={zsFeature}
              onChange={e => setZsFeature(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") runZoneSearch(); }}
              className="flex-1"
              aria-label="Caracteristică apartament"
            />
            <Button onClick={runZoneSearch} disabled={zsSearching} className="shrink-0 min-h-[44px]">
              {zsSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Caută în {zsZone}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rezultatele apar mai sus și se salvează automat în „Anunțuri noi găsite”.
          </p>
        </div>


        {/* Discover button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-background/50">
          <div className="flex-1">
            <div className="font-medium text-sm">Descoperire automată cuvinte cheie</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analizează onsite + GSC + proprietăți + zone și generează unghiuri noi pentru OLX/Storia/imobiliare.
            </p>
          </div>
          <Button onClick={runDiscover} disabled={running} className="shrink-0">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radar className="h-4 w-4 mr-2" />}
            Rulează Descoperire Cuvinte Cheie
          </Button>
        </div>

        {/* Zone keywords */}
        <div className="space-y-2 p-4 rounded-lg border bg-background/50">
          <label className="text-sm font-medium">Cuvinte cheie pe zonă (doar proprietari)</label>
          <p className="text-xs text-muted-foreground">
            Alege zona, scrie cuvintele cheie (unul pe linie sau separate prin virgulă) și se caută doar anunțuri de la proprietari, fără agenții.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ZONE_OPTIONS.map(z => (
              <button
                key={z}
                type="button"
                onClick={() => setZone(z)}
                aria-pressed={zone === z}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  zone === z
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Select value={zonePlatform} onValueChange={setZonePlatform}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="ex: apartament 2 camere, garsonieră, apartament 3 camere"
              value={zoneKeyword}
              onChange={e => setZoneKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addZoneKeywords(); }}
              className="flex-1"
            />
            <Button onClick={addZoneKeywords} disabled={addingZone}>
              {addingZone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Adaugă în {zone}
            </Button>
          </div>
        </div>

        {/* Add manual source */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Adaugă manual sursă / URL</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder='ex: site:facebook.com/groups/12345 "proprietar" OR https://...'
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSource(); }}
              className="flex-1"
            />
            <Button onClick={addSource} disabled={adding} variant="default">
              {adding ? <Loader2 className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
              Adaugă
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Acceptă query Google (cu <code>site:</code>), URL direct la grup Facebook, sau frază de căutare. Devine activ imediat în următorul scan.
          </p>
        </div>

        {/* Sources list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Surse active recente
              <Badge variant="outline">{sources.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={loadSources} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻"}
            </Button>
          </div>
          <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto">
            {sources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Nicio sursă încă.</div>
            ) : sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 hover:bg-accent/30">
                <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {s.platform || "—"}
                </Badge>
                <code className="text-xs flex-1 truncate" title={s.keyword}>{s.keyword}</code>
                <Button size="sm" variant="ghost" onClick={() => toggleSource(s)} className="h-7 text-xs">
                  {s.is_active ? "Dezactivează" : "Activează"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSource(s)} className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
