import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Loader2, Search, X, XCircle } from "lucide-react";
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
const ANY_DEAL = "__anydeal__";
const ANY_ROOMS = "__anyrooms__";

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

/**
 * Zonele Timișoarei exact cum sunt definite de platformele de anunțuri
 * (imobiliare.ro, olx.ro, publi24.ro) — nu cartierele administrative.
 */
const ZONE_OPTIONS = [
  // Zone centrale, așa cum apar pe portaluri
  "Ultracentral",
  "Central",
  "Semicentral",
  "Cetate",
  "Iosefin",
  "Elisabetin",
  "Fabric",
  "Traian",
  "Complex Studențesc",
  "Mehala",
  // Zone nord
  "Aradului",
  "Bucovina",
  "Lipovei",
  "Circumvalațiunii",
  "Torontalului",
  "Ronaț",
  "Take Ionescu",
  "Dacia",
  "Gheorghe Lazăr",
  "Sever Bocu (Lipovei II)",
  // Zone sud
  "Girocului",
  "Soarelui",
  "Braytim",
  "Buziașului",
  "Lunei",
  "Șagului",
  "Steaua",
  "Dâmbovița",
  "Blașcovici",
  "Olimpia-Stadion",
  "Zona Medicină",
  // Zone est / vest / periferice
  "Plopi",
  "Ciarda Roșie",
  "Freidorf",
  "Kuncz",
  "Modern",
  "Tipografilor",
  "UMT",
  "Zona Gării",
  "Zona Industrială",
  // Localități limitrofe (zone separate pe portaluri)
  "Dumbrăvița",
  "Giroc",
  "Chișoda",
  "Ghiroda",
  "Moșnița Nouă",
  "Sânmihaiu Român",
  "Săcălaz",
  "Șag",
  "Remetea Mare",
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
  const [deal, setDeal] = useState<string>(ANY_DEAL);
  const [rooms, setRooms] = useState<string>(ANY_ROOMS);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  /** Filtru pe portalul unde a fost găsit anunțul (se aplică pe rezultate). */
  const [portalFilter, setPortalFilter] = useState<string>(ALL_PLATFORMS);
  const [results, setResults] = useState<AdHocListing[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [exactPrices, setExactPrices] = useState<Record<string, number>>({});
  const [preferredZones, setPreferredZones] = useState<string[]>([]);
  const [newZone, setNewZone] = useState("");
  const [savingZone, setSavingZone] = useState(false);

  /** Text fără diacritice și majuscule, pentru potriviri de zonă. */
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /** Anunțul aparține zonei date (după câmpul zone sau titlu). */
  const zoneMatches = (l: AdHocListing, z: string) => {
    const needle = norm(z.split("/")[0]);
    if (!needle) return false;
    return norm(`${l.zone || ""} ${l.title || ""}`).includes(needle);
  };

  const loadPreferredZones = async () => {
    const { data } = await supabase
      .from("admin_preferred_zones")
      .select("zone")
      .order("zone", { ascending: true });
    setPreferredZones(((data ?? []) as { zone: string }[]).map(r => r.zone));
  };

  useEffect(() => { void loadPreferredZones(); }, []);

  const addPreferredZone = async () => {
    const z = newZone.trim();
    if (z.length < 3) {
      toast({ title: "Scrie numele zonei", description: "Ex: Dumbrăvița" });
      return;
    }
    setSavingZone(true);
    const { error } = await supabase.from("admin_preferred_zones").insert({ zone: z } as never);
    setSavingZone(false);
    if (error) {
      toast({ title: "Nu am putut adăuga zona", description: error.message, variant: "destructive" });
      return;
    }
    setNewZone("");
    await loadPreferredZones();
    toast({ title: "Zonă adăugată", description: z });
  };

  const removePreferredZone = async (z: string) => {
    const { error } = await supabase.from("admin_preferred_zones").delete().eq("zone", z);
    if (error) {
      toast({ title: "Nu am putut șterge zona", description: error.message, variant: "destructive" });
      return;
    }
    setPreferredZones(prev => prev.filter(x => x !== z));
  };

  /** Extrage prima valoare numerică dintr-un preț de tip "55.000 €" sau 2021450. */
  const priceValue = (p: AdHocListing["price"]): number | null => {
    if (p === null || p === undefined) return null;
    if (typeof p === "number") return Number.isFinite(p) ? p : null;
    const digits = String(p).replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  };

  const resetFilters = () => {
    setType(ANY_TYPE);
    setZone(ANY_ZONE);
    setDeal(ANY_DEAL);
    setRooms(ANY_ROOMS);
    setMinPrice("");
    setMaxPrice("");
    setOnlyWithPhone(false);
    setPortalFilter(ALL_PLATFORMS);
  };

  /** Portalul pe care a fost găsit anunțul. */
  const listingPortal = (l: AdHocListing) => (l.source_platform || l.platform || "").trim();

  /** Filtrele se aplică instant pe rezultate, fără o nouă căutare. */
  const filterListings = (list: AdHocListing[]): AdHocListing[] => {
    const min = minPrice ? Number(minPrice.replace(/[^\d]/g, "")) : null;
    const max = maxPrice ? Number(maxPrice.replace(/[^\d]/g, "")) : null;
    const wantedRooms = rooms === ANY_ROOMS ? null : Number(rooms);
    const typeWord = type === ANY_TYPE ? null : type.toLowerCase();
    const zoneWord = zone === ANY_ZONE ? null : zone.split("/")[0].trim().toLowerCase();
    return list.filter(l => {
      const text = `${l.title || ""} ${l.zone || ""}`.toLowerCase();
      if (onlyWithPhone && !l.phone) return false;
      if (portalFilter !== ALL_PLATFORMS && !norm(listingPortal(l)).includes(norm(portalFilter))) return false;
      if (wantedRooms !== null) {
        const r = typeof l.rooms === "number" ? l.rooms : null;
        const fromTitle = /(\d)\s*camer/.exec(text);
        const value = r ?? (fromTitle ? Number(fromTitle[1]) : null);
        if (value === null) return false;
        if (wantedRooms === 4 ? value < 4 : value !== wantedRooms) return false;
      }
      if (deal === "vanzare" && /(închirier|inchirier|de inchiriat|de închiriat|\/lună|\/luna)/i.test(text)) return false;
      if (deal === "inchiriere" && !/(închirier|inchirier|de inchiriat|de închiriat|\/lună|\/luna)/i.test(text)) return false;
      if (typeWord && !text.includes(typeWord.replace(/ț/g, "t").replace(/ă/g, "a")) && !text.includes(typeWord)) {
        // tipul poate lipsi din titlu — nu excludem dacă nu avem indicii contrare
        const otherTypes = PROPERTY_TYPES.map(t => t.value).filter(v => v !== type);
        if (otherTypes.some(v => text.includes(v))) return false;
      }
      if (zoneWord && l.zone && !l.zone.toLowerCase().includes(zoneWord) && !text.includes(zoneWord)) return false;
      const price = exactPrices[(l.url || "").trim()] ?? priceValue(l.price);
      if ((min !== null || max !== null) && price === null) return false;
      if (min !== null && price !== null && price < min) return false;
      if (max !== null && price !== null && price > max) return false;
      return true;
    });
  };

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
        .select("title,source_url,price,contact_phone,zone,rooms,source_platform,updated_at,last_seen_at")
        .not("source_url", "is", null)
        // fără anunțuri expirate / dezactivate
        .eq("is_active", true)
        .not("lifecycle_status", "in", "(expired,rejected)")
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

    // Eliminăm anunțurile marcate expirate sau nemaivăzute de peste 21 de zile.
    const staleBefore = Date.now() - 21 * 24 * 60 * 60 * 1000;
    return rows
      .filter((r: any) => !/expirat|expired|inactiv|dezactivat/i.test(String(r.title || "")))
      .filter((r: any) => {
        const seen = r.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
        return seen === null || seen >= staleBefore;
      })
      .map((r: any) => ({
        title: r.title,
        url: r.source_url,
        price: r.price,
        phone: r.contact_phone,
        zone: r.zone,
        rooms: r.rooms,
        source_platform: r.source_platform,
      }));

  };


  /**
   * Deschide paginile reale ale anunțurilor și citește prețul exact publicat acolo.
   * Rezultatele înlocuiesc prețul aproximativ din listă.
   */
  const hydrateExactPrices = async (list: AdHocListing[]) => {
    const urls = list.map(l => (l.url || "").trim()).filter(Boolean).slice(0, 12);
    if (!urls.length) return;
    setPricing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-listing-prices", { body: { urls } });
      if (error) throw error;
      const map = (data as any)?.prices as Record<string, { price: number | null; rent: number | null }> | undefined;
      if (!map) return;
      const exact: Record<string, number> = {};
      for (const [u, v] of Object.entries(map)) {
        const value = v?.price ?? v?.rent ?? null;
        if (value != null) exact[u] = value;
      }
      setExactPrices(prev => ({ ...prev, ...exact }));
      // Prețurile citite acum sunt salvate în istoric; verificăm imediat scăderile.
      void checkPriceDrops();
    } catch (e: any) {
      toast({ title: "Nu am putut citi prețurile exacte", description: e.message, variant: "destructive" });
    } finally {
      setPricing(false);
    }
  };

  /** Marchează manual un anunț ca expirat, ca să nu mai apară în căutări și rapoarte. */
  const markExpired = async (l: AdHocListing) => {
    const url = (l.url || "").trim();
    if (!url) {
      setResults(prev => (prev ? prev.filter(x => x !== l) : prev));
      toast({ title: "Ascuns din rezultate", description: "Anunțul nu are link, deci nu era salvat în listă." });
      return;
    }
    const { data, error } = await supabase
      .from("prospect_listings")
      .update({ is_active: false, lifecycle_status: "expired" } as never)
      .eq("source_url", url)
      .select("id");
    if (error) {
      toast({ title: "Nu am putut marca anunțul", description: error.message, variant: "destructive" });
      return;
    }
    setResults(prev => (prev ? prev.filter(x => (x.url || "").trim() !== url) : prev));
    toast({
      title: "Marcat ca expirat",
      description: data?.length ? "Anunțul a fost scos din listă." : "Anunțul nu era salvat, dar a fost ascuns din rezultate.",
    });
    window.dispatchEvent(new Event(PROSPECT_REFRESH_EVENT));
  };

  const run = async (prefill?: string) => {
    const base = (prefill ?? search).trim();
    const typePart = type === ANY_TYPE ? "" : type;
    const zonePart = zone === ANY_ZONE ? "" : `${zone} Timișoara`;
    const roomsPart = rooms === ANY_ROOMS ? "" : `${rooms} camere`;
    const dealPart = deal === "vanzare" ? "de vanzare" : deal === "inchiriere" ? "de inchiriat" : "";
    const term = `${typePart} ${roomsPart} ${base} ${zonePart} ${dealPart}`.replace(/\s+/g, " ").trim();
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
      setExactPrices({});
      void hydrateExactPrices(listings);

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
        <Select value={portalFilter} onValueChange={setPortalFilter}>
          <SelectTrigger className="sm:w-[220px] min-h-[48px] sm:min-h-0" aria-label="Portalul unde apare anunțul">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PLATFORMS}>Toate portalurile (rezultate)</SelectItem>
            {PLATFORM_OPTIONS.map(p => (
              <SelectItem key={p} value={p}>Doar de pe {p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddAgencyPhoneDialog size="default" className="min-h-[48px] sm:min-h-0" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Select value={deal} onValueChange={setDeal}>
          <SelectTrigger className="sm:w-[170px] min-h-[48px] sm:min-h-0" aria-label="Tip tranzacție">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_DEAL}>Vânzare și închiriere</SelectItem>
            <SelectItem value="vanzare">Doar vânzare</SelectItem>
            <SelectItem value="inchiriere">Doar închiriere</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rooms} onValueChange={setRooms}>
          <SelectTrigger className="sm:w-[150px] min-h-[48px] sm:min-h-0" aria-label="Număr de camere">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_ROOMS}>Orice nr. camere</SelectItem>
            <SelectItem value="1">1 cameră</SelectItem>
            <SelectItem value="2">2 camere</SelectItem>
            <SelectItem value="3">3 camere</SelectItem>
            <SelectItem value="4">4+ camere</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          inputMode="numeric"
          placeholder="Preț min."
          aria-label="Preț minim"
          className="sm:w-[120px] min-h-[48px] sm:min-h-0"
        />
        <Input
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          inputMode="numeric"
          placeholder="Preț max."
          aria-label="Preț maxim"
          className="sm:w-[120px] min-h-[48px] sm:min-h-0"
        />
        <Button
          type="button"
          variant={onlyWithPhone ? "default" : "outline"}
          onClick={() => setOnlyWithPhone(v => !v)}
          className="min-h-[48px] sm:min-h-0"
          aria-pressed={onlyWithPhone}
        >
          Doar cu telefon
        </Button>
        <Button type="button" variant="ghost" onClick={resetFilters} className="min-h-[48px] sm:min-h-0">
          Resetează filtrele
        </Button>
      </div>

      <div className="rounded-lg border p-2 space-y-2">
        <div className="text-[11px] text-muted-foreground">
          Zone preferate — filtrele se aplică pe acestea, restul anunțurilor apar în lista de rezervă.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {preferredZones.length === 0 && (
            <span className="text-[11px] text-muted-foreground">Nicio zonă preferată — se afișează toate zonele.</span>
          )}
          {preferredZones.map(z => (
            <span key={z} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px]">
              {z}
              <button
                type="button"
                onClick={() => removePreferredZone(z)}
                aria-label={`Șterge zona ${z}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newZone}
            onChange={e => setNewZone(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void addPreferredZone(); }}
            placeholder="Adaugă o zonă preferată (ex: Dumbrăvița)"
            aria-label="Adaugă o zonă preferată"
            className="min-h-[44px]"
          />
          <Button type="button" variant="outline" onClick={() => void addPreferredZone()} disabled={savingZone} className="min-h-[44px]">
            {savingZone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adaugă zona"}
          </Button>
        </div>
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

      {!searching && results && (() => {
        // Filtrele se aplică strict: afișăm DOAR anunțurile care le respectă, fără listă de rezervă.
        const matched = filterListings(results);
        const main = matched;

        const renderRow = (l: AdHocListing, idx: number) => (
                <div key={`${l.url || idx}`} className="p-2 space-y-1 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] shrink-0">
                      {listingPortal(l) || "platformă necunoscută"}
                    </Badge>
                    {zone !== ANY_ZONE && (
                      <Badge
                        variant={zoneMatches(l, zone) ? "secondary" : "outline"}
                        className="text-[10px] shrink-0"
                      >
                        {zoneMatches(l, zone) ? `zona ${zone} apare` : `zona ${zone} nu apare în anunț`}
                      </Badge>
                    )}
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
                    {exactPrices[(l.url || "").trim()] != null ? (
                      <span className="font-medium text-foreground">
                        {Math.round(exactPrices[(l.url || "").trim()]).toLocaleString("ro-RO")} €
                        <span className="ml-1 text-[10px] text-emerald-600">preț exact</span>
                      </span>
                    ) : l.price ? (
                      <span>{String(l.price)}</span>
                    ) : null}
                    {l.phone && <span className="font-medium text-foreground">{l.phone}</span>}
                    {(l.phone || l.url) && (
                      <MarkAsAgencyButton
                        rawPhone={l.phone || undefined}
                        url={l.url || undefined}
                        contextLabel="căutare anunțuri proprietari"
                        label="Agenție"
                        className="h-8 px-2 text-[11px]"
                        onMarked={() =>
                          setResults(prev =>
                            prev
                              ? prev.filter(x =>
                                  l.phone ? x.phone !== l.phone : x.url !== l.url,
                                )
                              : prev,
                          )
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => markExpired(l)}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Anunț expirat
                    </Button>
                  </div>
                </div>
        );

        return (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {summary || `${results.length} anunțuri`}
            {matched.length !== results.length && <> · {matched.length} respectă filtrele</>}
            {(() => {
              const per = new Map<string, number>();
              for (const l of matched) {
                const p = listingPortal(l) || "necunoscut";
                per.set(p, (per.get(p) || 0) + 1);
              }
              const txt = Array.from(per.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([p, n]) => `${p}: ${n}`)
                .join(" · ");
              return txt ? <> · afișate pe portal — {txt}</> : null;
            })()}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pricing}
              onClick={() => hydrateExactPrices(main)}
              className="h-8 text-xs"
            >
              {pricing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Verifică prețurile exacte
            </Button>
            {pricing && <span className="text-[11px] text-muted-foreground">Citesc prețurile de pe platforme…</span>}
          </div>
          {main.length > 0 ? (
            <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto bg-background/60">
              {main.map(renderRow)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Niciun anunț nu respectă filtrele alese.
            </p>
          )}
        </div>
        );
      })()}
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
