import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PROSPECT_REFRESH_EVENT } from "./KeywordRadarNewListings";
import AddAgencyPhoneDialog from "./AddAgencyPhoneDialog";
import MarkAsAgencyButton from "./MarkAsAgencyButton";

export interface AdHocListing {
  title?: string | null;
  url?: string | null;
  price?: number | string | null;
  phone?: string | null;
  zone?: string | null;
  rooms?: number | null;
  source_platform?: string | null;
  platform?: string | null;
}

const ALL_PLATFORMS = "__all__";
const ANY_TYPE = "__any__";
const ANY_ZONE = "__anyzone__";

const PLATFORM_OPTIONS = [
  "OLX",
  "Storia.ro",
  "imobiliare.ro",
  "Publi24",
  "BursaImobiliara.ro",
  "Facebook Groups",
  "Facebook Marketplace",
];

const MULTI_SEARCH_PLATFORMS = ["OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro"];

const ZONE_OPTIONS = [
  "Calea Lipovei",
  "Aradului",
  "Torontalului",
  "Circumvalațiunii",
  "Dumbrăvița",
  "Girocului",
  "Cetate / Centru",
  "Iosefin",
  "Fabric",
  "Șagului",
  "Complex Studențesc",
];

const PROPERTY_TYPES = [
  { value: "apartament", label: "Apartament" },
  { value: "garsonieră", label: "Garsonieră" },
  { value: "casă", label: "Casă / vilă" },
  { value: "teren", label: "Teren" },
  { value: "spațiu comercial", label: "Spațiu comercial" },
];

/** Blocuri și ansambluri din zona proprie — completează rapid căutarea. */
const BUILDINGS = [
  "NordOne",
  "Fructus Plaza",
  "City of Mara",
  "Ring",
  "Ateneo",
  "XCity",
  "Denya Forest",
  "Vivalia",
  "Monarh",
];

interface Props {
  /** Variantă compactă folosită în interiorul panoului Keyword Radar. */
  embedded?: boolean;
}

/**
 * Căutare de anunțuri publicate de PROPRIETARI pe platformele de anunțuri.
 * Nu salvează cuvintele în listele de scanare — este o căutare la cerere.
 */
export default function OwnerListingSearch({ embedded = false }: Props) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<string>(ALL_PLATFORMS);
  const [type, setType] = useState<string>(ANY_TYPE);
  const [zone, setZone] = useState<string>(ANY_ZONE);
  const [results, setResults] = useState<AdHocListing[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const searchOnePlatform = async (term: string, p: string) => {
    const { data, error } = await supabase.functions.invoke("scrape-prospects", {
      body: {
        custom_query: term,
        custom_platform: p,
        max_results: 10,
        preserve_agency_filter: true,
        hydrate_phones: false,
      },
    });
    if (error) throw error;
    const listings = Array.isArray((data as any)?.listings) ? ((data as any).listings as AdHocListing[]) : [];
    const b = (data as any)?.funnel_breakdown || {};
    return {
      platform: p,
      listings: listings.map(l => ({ ...l, source_platform: l.source_platform || l.platform || p })),
      agency: Number(b.agency_signal || 0),
      duplicate: Number(b.duplicate || 0),
    };
  };

  /**
   * Păstrează doar anunțuri individuale de proprietari.
   * Elimină paginile generice de căutare/listare ale platformelor.
   */
  const isIndividualAd = (l: AdHocListing): boolean => {
    const url = (l.url || "").trim();
    if (!url) return false;
    let path = url;
    let hasQuery = false;
    try {
      const u = new URL(url);
      path = u.pathname;
      hasQuery = u.search.length > 1;
    } catch {
      /* fallback pe string brut */
    }
    const lowerPath = path.toLowerCase();
    // pagini de căutare / liste / filtre
    const genericPath = /(caut|search|rezultate|results|filtr|anunturi\/?$|oferte\/?$|lista|categorie|category|zona\/|cartier\/|\/q\/|\/sitemap)/.test(
      lowerPath,
    );
    if (genericPath || hasQuery) return false;
    // un anunț individual are un identificator în URL (id numeric sau slug lung cu hash)
    const last = lowerPath.replace(/\/+$/, "").split("/").pop() || "";
    const looksLikeAd = /\d{4,}/.test(last) || /-[a-z0-9]{6,}$/.test(last) || /ID[a-zA-Z0-9]{4,}/.test(last);
    if (!looksLikeAd) return false;
    // titluri de tip listă
    const title = (l.title || "").toLowerCase();
    if (/^(apartamente|case|garsoniere|terenuri|imobile|anunturi|anunțuri)\b/.test(title)) return false;
    return true;
  };

  /** Anunțuri deja salvate care se potrivesc cu căutarea — ca să avem mereu linkuri. */
  const fetchExisting = async (base: string, platforms: string[]): Promise<AdHocListing[]> => {
    const words = base.split(/\s+/).filter(w => w.length >= 3).slice(0, 3);
    const fetchFor = async (w?: string) => {
      let q = supabase
        .from("prospect_listings")
        .select("title,source_url,price,contact_phone,zone,rooms,source_platform,updated_at")
        .not("source_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(25);
      if (w) q = q.or(`title.ilike.%${w}%,zone.ilike.%${w}%,address.ilike.%${w}%`);
      if (platform !== ALL_PLATFORMS) q = q.in("source_platform", platforms);
      const { data, error } = await q;
      if (error) return [];
      return data ?? [];
    };

    // Caută pe fiecare cuvânt (titlu / zonă / adresă); dacă nimic, arată ultimele salvate.
    let rows: any[] = [];
    if (words.length) {
      const parts = await Promise.all(words.map(w => fetchFor(w)));
      const seenUrl = new Set<string>();
      for (const p of parts) {
        for (const r of p) {
          if (seenUrl.has(r.source_url)) continue;
          seenUrl.add(r.source_url);
          rows.push(r);
        }
      }
    }
    if (rows.length === 0) rows = await fetchFor();

    return rows.map((r: any) => ({
      title: r.title,
      url: r.source_url,
      price: r.price,
      phone: r.contact_phone,
      zone: r.zone,
      rooms: r.rooms,
      source_platform: r.source_platform,
    }));
  };


  const run = async (prefill?: string) => {
    const base = (prefill ?? search).trim();
    const typePart = type === ANY_TYPE ? "" : type;
    const zonePart = zone === ANY_ZONE ? "" : `${zone} Timișoara`;
    const term = `${typePart} ${base} ${zonePart}`.replace(/\s+/g, " ").trim();
    if (term.length < 3) {
      toast({ title: "Scrie cel puțin 3 litere", description: "Ex: apartament 2 camere NordOne" });
      return;
    }
    setSearching(true);
    setResults(null);
    setSummary(null);
    try {
      const platforms = platform === ALL_PLATFORMS ? MULTI_SEARCH_PLATFORMS : [platform];
      const settled = await Promise.allSettled(platforms.map(p => searchOnePlatform(term, p)));
      const ok = settled.flatMap(r => (r.status === "fulfilled" ? [r.value] : []));
      const failedCount = settled.length - ok.length;
      if (ok.length === 0) {
        const first = settled.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
        throw new Error(first?.reason?.message || "Căutarea nu a returnat rezultate.");
      }

      const seen = new Set<string>();
      const listings: AdHocListing[] = [];
      let generic = 0;
      for (const r of ok) {
        for (const l of r.listings) {
          if (!isIndividualAd(l)) { generic++; continue; }
          const key = (l.url || "").trim() || `${l.title || ""}|${l.price || ""}`;
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          listings.push(l);
        }
      }
      const newCount = listings.length;

      // Completăm cu anunțuri deja salvate, ca răspunsul să aibă mereu linkuri.
      const existing = await fetchExisting(base, platforms);
      let existingShown = 0;
      for (const l of existing) {
        if (!(l.url || "").trim()) continue; // salvate deja verificate; cerem doar link

        const key = (l.url || "").trim() || `${l.title || ""}|${l.price || ""}`;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        listings.push(l);
        existingShown++;
      }
      setResults(listings);

      const agency = ok.reduce((s, r) => s + r.agency, 0);
      const duplicate = ok.reduce((s, r) => s + r.duplicate, 0);
      const perPlatform = ok.filter(r => r.listings.length > 0).map(r => `${r.platform}: ${r.listings.length}`).join(" · ");
      setSummary(
        `${newCount} anunțuri noi pe ${ok.length} ${ok.length === 1 ? "platformă" : "platforme"}` +
          (perPlatform ? ` (${perPlatform})` : "") +
          (existingShown ? ` · ${existingShown} anunțuri deja salvate afișate cu link` : "") +
          (agency ? ` · ${agency} agenții excluse` : "") +
          (duplicate ? ` · ${duplicate} deja în listă` : "") +
          (generic ? ` · ${generic} pagini de căutare eliminate` : "") +
          (failedCount ? ` · ${failedCount} platforme fără răspuns` : ""),
      );
      window.dispatchEvent(new Event(PROSPECT_REFRESH_EVENT));
      if (listings.length === 0) {
        toast({
          title: "Niciun anunț găsit",
          description: "Toate rezultatele erau de la agenții. Încearcă altă formulare sau altă platformă.",
        });
      }
    } catch (e: any) {
      toast({ title: "Eroare căutare anunțuri", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const body = (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="owner-listing-search"
            placeholder="ex: apartament 2 camere NordOne proprietar"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") run(); }}
            className="pl-8 pr-8 min-h-[48px]"
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
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="sm:w-[190px] min-h-[48px]" aria-label="Alege platforma de căutare">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PLATFORMS}>Toate platformele</SelectItem>
            {PLATFORM_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => run()} disabled={searching} className="shrink-0 min-h-[48px]">
          {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          Caută anunțuri
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-[200px] min-h-[48px] sm:min-h-0" aria-label="Tip de imobil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_TYPE}>Orice tip de imobil</SelectItem>
            {PROPERTY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger className="sm:w-[200px] min-h-[48px] sm:min-h-0" aria-label="Zonă">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_ZONE}>Toate zonele</SelectItem>
            {ZONE_OPTIONS.map(z => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddAgencyPhoneDialog size="default" className="min-h-[48px] sm:min-h-0" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground self-center mr-1">Blocuri din zona mea:</span>
        {BUILDINGS.map(b => (
          <Button
            key={b}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => { setSearch(`${b} proprietar`); run(`${b} proprietar`); }}
          >
            {b}
          </Button>
        ))}
      </div>

      {searching && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Caut anunțuri de la proprietari…
        </div>
      )}

      {!searching && results && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">{summary || `${results.length} anunțuri`}</div>
          {results.length > 0 && (
            <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto bg-background/60">
              {results.map((l, idx) => (
                <div key={`${l.url || idx}`} className="p-2 space-y-1 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] shrink-0">
                      {l.source_platform || l.platform || "—"}
                    </Badge>
                    {l.url ? (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex-1 truncate underline underline-offset-2 hover:text-primary"
                        title={l.url}
                      >
                        {l.title || "Anunț fără titlu"}
                      </a>
                    ) : (
                      <span className="text-xs flex-1 truncate" title={l.title || ""}>
                        {l.title || "Anunț fără titlu"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {l.zone && <span>{l.zone}</span>}
                    {l.rooms ? <span>{l.rooms} camere</span> : null}
                    {l.price ? <span>{String(l.price)}</span> : null}
                    {l.phone && <span className="font-medium text-foreground">{l.phone}</span>}
                    {l.phone && (
                      <MarkAsAgencyButton
                        rawPhone={l.phone}
                        url={l.url || undefined}
                        contextLabel="căutare anunțuri proprietari"
                        label="Agenție"
                        className="h-8 px-2 text-[11px]"
                        onMarked={() =>
                          setResults(prev => (prev ? prev.filter(x => x.phone !== l.phone) : prev))
                        }
                      />
                    )}
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium text-foreground hover:bg-accent min-h-[32px]"
                      >
                        <ExternalLink className="h-3 w-3" /> Deschide anunțul
                      </a>
                    )}
                    {l.url && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard?.writeText(l.url!); toast({ title: "Link copiat" }); }}
                        className="underline hover:text-foreground"
                      >
                        Copiază linkul
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2 p-4 rounded-lg border-2 border-amber-500/40 bg-amber-500/5">
        <div className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4" /> Caută anunțuri de la proprietari
        </div>
        <p className="text-xs text-muted-foreground">
          Scrie orice cuvinte cheie (zonă, bloc, tip, detalii) și caut direct anunțuri publicate de proprietari. Agențiile sunt excluse automat.
        </p>
        {body}
      </div>
    );
  }

  return (
    <Card className="border-2 border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-amber-600" />
          Caută anunțuri de la proprietari
        </CardTitle>
        <CardDescription>
          Caută pe OLX, Storia.ro, imobiliare.ro, Publi24 și BursaImobiliara.ro doar anunțurile publicate de proprietari.
          Agențiile sunt excluse automat, iar rezultatele intră și în „Anunțuri noi găsite”.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
