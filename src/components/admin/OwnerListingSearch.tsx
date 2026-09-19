import { useEffect, useRef, useState } from "react";
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
import { PORTAL_ZONE_LABELS, zoneMatchesText, zoneSearchTerm } from "@/lib/timisoaraPortalZones";
import {
  SORT_OPTIONS,
  YEAR_OPTIONS,
  matchesYear,
  pricePerSqm,
  type SortValue,
} from "@/lib/portalSearch";

export interface AdHocListing {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  price?: number | string | null;
  phone?: string | null;
  zone?: string | null;
  rooms?: number | null;
  source_platform?: string | null;
  platform?: string | null;
}

const ALL_PLATFORMS = "__all__";
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
 * (imobiliare.ro, olx.ro, publi24.ro) — vezi src/lib/timisoaraPortalZones.ts.
 */
const ZONE_OPTIONS = PORTAL_ZONE_LABELS;

const PROPERTY_TYPES = [
  { value: "apartament", label: "Apartament" },
  { value: "garsonieră", label: "Garsonieră" },
  { value: "casă", label: "Casă / vilă" },
  { value: "teren", label: "Teren" },
  { value: "spațiu comercial", label: "Spațiu comercial" },
];

/** Compartimentarea apartamentului, cum apare scrisă pe portaluri. */
const PARTITION_OPTIONS = [
  { value: "decomandat", label: "Decomandat", words: ["decomandat"] },
  { value: "semidecomandat", label: "Semidecomandat", words: ["semidecomandat", "semi decomandat"] },
  { value: "nedecomandat", label: "Nedecomandat", words: ["nedecomandat"] },
  { value: "circular", label: "Circular", words: ["circular"] },
  { value: "vagon", label: "Vagon", words: ["vagon"] },
  { value: "open space", label: "Open space", words: ["open space", "openspace"] },
];

const ANY_YEAR = "__anyyear__";
const FLOOR_OPTIONS = [
  { value: "parter", label: "Parter" },
  { value: "not-ground", label: "Fără parter" },
  { value: "1-3", label: "Etaj 1–3" },
  { value: "4-7", label: "Etaj 4–7" },
  { value: "8plus", label: "Etaj 8 sau mai sus" },
  { value: "last", label: "Ultimul etaj" },
  { value: "not-last", label: "Fără ultimul etaj" },
  { value: "mansarda", label: "Mansardă / demisol" },
];

/** Dotări căutate în titlu și descriere. */
const EXTRA_OPTIONS = [
  { value: "balcon", label: "Balcon", words: ["balcon", "terasa", "terasă"] },
  { value: "parcare", label: "Parcare / garaj", words: ["parcare", "garaj", "loc de parcare"] },
  { value: "lift", label: "Lift", words: ["lift", "ascensor"] },
  { value: "bloc nou", label: "Bloc nou", words: ["bloc nou", "construcție nouă", "constructie noua", "202", "imobil nou"] },
  { value: "mobilat", label: "Mobilat", words: ["mobilat", "mobilată", "complet mobilat"] },
  { value: "centrala", label: "Centrală proprie", words: ["centrala proprie", "centrală proprie", "centrala termica", "centrală termică"] },
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
  /** Se pot alege mai multe tipuri de imobil simultan. */
  const [types, setTypes] = useState<string[]>([]);
  /** Compartimentare: decomandat, semidecomandat, nedecomandat etc. */
  const [partitions, setPartitions] = useState<string[]>([]);
  /** Dotări cerute (balcon, parcare, lift...). */
  const [extras, setExtras] = useState<string[]>([]);
  /** Etaje: se pot bifa mai multe simultan (se aplică „sau”). */
  const [floors, setFloors] = useState<string[]>([]);
  const [minSurface, setMinSurface] = useState("");
  const [maxSurface, setMaxSurface] = useState("");
  const [zone, setZone] = useState<string>(ANY_ZONE);
  const [deal, setDeal] = useState<string>(ANY_DEAL);
  /** Camere — selecție multiplă („4” = 4 sau mai multe). */
  const [rooms, setRooms] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  /** Filtru pe portalul unde a fost găsit anunțul (se aplică pe rezultate). */
  const [portalFilter, setPortalFilter] = useState<string>(ALL_PLATFORMS);
  /** Când filtrele nu lasă nimic, putem afișa toate anunțurile găsite. */
  const [ignoreFilters, setIgnoreFilters] = useState(false);
  const [results, setResults] = useState<AdHocListing[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [exactPrices, setExactPrices] = useState<Record<string, number>>({});
  const [preferredZones, setPreferredZones] = useState<string[]>([]);
  const [newZone, setNewZone] = useState("");
  /** Când e activ, rezultatele se limitează la zonele preferate (dacă nu e aleasă o zonă anume). */
  // „Toate zonele” trebuie să însemne implicit întreaga Timișoară; zonele
  // preferate rămân un filtru opțional, activat explicit de administrator.
  const [limitToPreferred, setLimitToPreferred] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  /** Sortarea rezultatelor, ca pe portaluri. */
  const [sort, setSort] = useState<SortValue>("relevance");
  /** An construcție (interval), ca pe portaluri. */
  const [yearFilter, setYearFilter] = useState<string>(ANY_YEAR);
  /** Scanare automată: caută periodic și adaugă anunțurile noi fără click. */
  const [autoLive, setAutoLive] = useState<boolean>(() => {
    try { return window.localStorage.getItem("rt_owner_search_auto") !== "0"; } catch { return true; }
  });
  const [lastAutoAt, setLastAutoAt] = useState<Date | null>(null);
  /** Ultimul termen căutat, ca rescanarea automată să folosească același text. */
  const lastTermRef = useRef<string>("");
  const runningRef = useRef(false);

  /** Text fără diacritice și majuscule, pentru potriviri de zonă. */
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /** Anunțul aparține zonei date — acceptă toate denumirile de pe portaluri. */
  const zoneMatches = (l: AdHocListing, z: string) =>
    zoneMatchesText(`${l.zone || ""} ${l.title || ""}`, z);

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
    setTypes([]);
    setPartitions([]);
    setExtras([]);
    setFloors([]);
    setMinSurface("");
    setMaxSurface("");
    setZone(ANY_ZONE);
    setDeal(ANY_DEAL);
    setRooms(ANY_ROOMS);
    setMinPrice("");
    setMaxPrice("");
    setOnlyWithPhone(false);
    setPortalFilter(ALL_PLATFORMS);
    setIgnoreFilters(false);
    setSort("relevance");
    setYearFilter(ANY_YEAR);
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  /** Etajul dedus din textul anunțului: „etaj 3”, „3/4”, „parter”, „ultimul etaj”. */
  const floorInfo = (text: string) => {
    const t = norm(text);
    const isGround = /\bparter\b/.test(t);
    const isAttic = /\b(mansarda|demisol|subsol)\b/.test(t);
    let value: number | null = null;
    let total: number | null = null;
    const m = /\betaj(?:ul)?\s*(\d{1,2})\b/.exec(t) || /\bet\s*\.?\s*(\d{1,2})\b/.exec(t);
    if (m) value = Number(m[1]);
    const frac = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/.exec(t);
    if (frac && Number(frac[2]) <= 30) {
      if (value === null) value = Number(frac[1]);
      total = Number(frac[2]);
    }
    const isLast = /\bultimul etaj\b/.test(t) || (value !== null && total !== null && value === total);
    return { value, isGround, isAttic, isLast, known: value !== null || isGround || isAttic || isLast };
  };

  /** Suprafața utilă în mp, dedusă din text. */
  const surfaceOf = (text: string): number | null => {
    const t = norm(text);
    const m = /\b(\d{2,4})(?:[.,]\d{1,2})?\s*(?:mp|m2|metri patrati)\b/.exec(t);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 10 && n <= 2000 ? n : null;
  };

  /** Portalul pe care a fost găsit anunțul. */
  const listingPortal = (l: AdHocListing) => (l.source_platform || l.platform || "").trim();

  /**
   * Motivul exact pentru care un anunț nu respectă filtrele, sau `null` dacă
   * le respectă. Informația lipsă din anunț NU exclude anunțul — arătăm mai
   * degrabă oferta, decât să o pierdem din cauza unui titlu sărac.
   */
  const excludeReason = (l: AdHocListing): string | null => {
    const min = minPrice ? Number(minPrice.replace(/[^\d]/g, "")) : null;
    const max = maxPrice ? Number(maxPrice.replace(/[^\d]/g, "")) : null;
    const wantedRooms = rooms === ANY_ROOMS ? null : Number(rooms);
    const wantedTypes = types.map(t => norm(t));
    const minMp = minSurface ? Number(minSurface.replace(/[^\d]/g, "")) : null;
    const maxMp = maxSurface ? Number(maxSurface.replace(/[^\d]/g, "")) : null;
    const wantedZone = zone === ANY_ZONE ? null : zone;
    const searchTokens = norm(search).split(" ").filter(token => token.length >= 2 || /^\d+$/.test(token));

    const rawText = `${l.title || ""} ${l.description || ""} ${l.zone || ""} ${l.url || ""}`;
    const normalizedText = ` ${norm(rawText)} `;
    const text = rawText.toLowerCase();
    /** Anunț cu metadate sărace: nu putem verifica detaliile fine. */
    const thinText = norm(`${l.title || ""} ${l.description || ""}`).length < 45;

    // Cuvintele scrise în căutare sunt obligatorii doar dacă anunțul are text
    // suficient; potrivirea pe cuvinte întregi evită „semidecomandat”.
    if (!thinText && searchTokens.some(token => !normalizedText.includes(` ${token} `))) {
      return "cuvintele căutate nu apar în anunț";
    }
    if (onlyWithPhone && !l.phone) return "fără telefon";
    if (portalFilter !== ALL_PLATFORMS && !norm(listingPortal(l)).includes(norm(portalFilter))) {
      return "alt portal";
    }
    if (wantedRooms !== null) {
      const r = typeof l.rooms === "number" ? l.rooms : null;
      const fromTitle = /(\d+)\s*[- ]?\s*(?:camere?|cam\.?\b)/i.exec(text);
      const value = r ?? (fromTitle ? Number(fromTitle[1]) : null);
      if (value !== null && (wantedRooms === 4 ? value < 4 : value !== wantedRooms)) {
        return `are ${value} camere`;
      }
    }
    const isRentText = /(închirier|inchirier|de inchiriat|de închiriat|\/lună|\/luna)/i.test(text);
    if (deal === "vanzare" && isRentText) return "este închiriere";
    if (deal === "inchiriere" && !isRentText && !thinText) return "nu pare închiriere";
    if (wantedTypes.length > 0) {
      const hasWanted = wantedTypes.some(t => normalizedText.includes(t));
      if (!hasWanted) {
        const otherTypes = PROPERTY_TYPES.map(t => norm(t.value)).filter(v => !wantedTypes.includes(v));
        if (otherTypes.some(v => normalizedText.includes(v))) return "alt tip de imobil";
      }
    }
    // Compartimentare — doar dacă anunțul spune ceva despre compartimentare.
    if (partitions.length > 0) {
      const anyPartitionMentioned = PARTITION_OPTIONS.some(o =>
        (o.words ?? [o.value]).some(w => normalizedText.includes(norm(w))),
      );
      if (anyPartitionMentioned) {
        const ok = partitions.some(p => {
          const opt = PARTITION_OPTIONS.find(o => o.value === p);
          return (opt?.words ?? [p]).some(w => {
            const nw = norm(w);
            if (nw === "decomandat") return /(^| )decomandat( |$)/.test(normalizedText);
            return normalizedText.includes(nw);
          });
        });
        if (!ok) return "altă compartimentare";
      }
    }
    // Dotări cerute — verificate doar când anunțul are descriere utilizabilă.
    if (extras.length > 0 && !thinText) {
      const missing = extras.filter(x => {
        const opt = EXTRA_OPTIONS.find(o => o.value === x);
        return !(opt?.words ?? [x]).some(w => normalizedText.includes(norm(w)));
      });
      if (missing.length > 0) return `nu menționează: ${missing.join(", ")}`;
    }
    // Etaj — anunțurile fără informații despre etaj nu se exclud.
    if (floors.length > 0) {
      const f = floorInfo(rawText);
      if (f.known) {
        const v = f.value;
        const ok = floors.some(sel =>
          sel === "parter" ? f.isGround :
          sel === "not-ground" ? !f.isGround :
          sel === "1-3" ? v !== null && v >= 1 && v <= 3 :
          sel === "4-7" ? v !== null && v >= 4 && v <= 7 :
          sel === "8plus" ? v !== null && v >= 8 :
          sel === "last" ? f.isLast :
          sel === "not-last" ? !f.isLast :
          sel === "mansarda" ? f.isAttic :
          true);
        if (!ok) return "alt etaj";
      }
    }
    const mp = surfaceOf(rawText);
    if (mp !== null) {
      if (minMp !== null && mp < minMp) return `${mp} mp, sub minim`;
      if (maxMp !== null && mp > maxMp) return `${mp} mp, peste maxim`;
    }
    if (yearFilter !== ANY_YEAR && !matchesYear(yearFilter, null, rawText)) return "alt an de construcție";
    const zoneText = `${l.zone || ""} ${l.title || ""} ${l.description || ""}`;
    if (wantedZone && !zoneMatchesText(zoneText, wantedZone)) return `zona nu apare (${wantedZone})`;
    if (!wantedZone && limitToPreferred && preferredZones.length > 0) {
      if (!preferredZones.some(z => zoneMatchesText(zoneText, z))) return "în afara zonelor preferate";
    }
    const price = exactPrices[(l.url || "").trim()] ?? priceValue(l.price);
    if (min !== null && price !== null && price < min) return "preț sub minim";
    if (max !== null && price !== null && price > max) return "preț peste maxim";
    return null;
  };

  /** Filtrele se aplică instant pe rezultate, fără o nouă căutare. */
  const filterListings = (list: AdHocListing[]): AdHocListing[] =>
    list.filter(l => excludeReason(l) === null);

  const searchOnePlatform = async (term: string, p: string) => {
    const { data, error } = await supabase.functions.invoke("scrape-prospects", {
      body: {
        custom_query: term,
        custom_platform: p,
        max_results: 25,
        preserve_agency_filter: true,
        hydrate_phones: false,
        discovery_mode: true,
      },
    });
    if (error) throw error;
    const rawListings = Array.isArray((data as any)?.listings) ? ((data as any).listings as Array<AdHocListing & { source_url?: string | null; contact_phone?: string | null }>) : [];
    const listings = rawListings.map(l => ({
      ...l,
      url: l.url || l.source_url || null,
      phone: l.phone || l.contact_phone || null,
    }));
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
        .select("title,description,source_url,price,contact_phone,zone,rooms,source_platform,updated_at,last_seen_at")
        .not("source_url", "is", null)
        // „De verificat” poate avea date incomplete, dar este un rezultat real.
        // Excludem doar agențiile și anunțurile confirmate ca expirate/respinse.
        .or("prospect_type.is.null,prospect_type.neq.agentie")
        .not("lifecycle_status", "in", "(expired,rejected)")
        .order("updated_at", { ascending: false })
        .limit(25);

      if (w) {
        const safe = w.replace(/[,%()]/g, " ").trim();
        if (safe) q = q.or(`title.ilike.%${safe}%,zone.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
      if (platform !== ALL_PLATFORMS) q = q.in("source_platform", platforms);
      const { data, error } = await q;
      if (error) return [];
      return data ?? [];
    };

    // Caută strict după cuvintele cerute; nu afișăm anunțuri fără legătură.
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
        description: r.description,
        url: r.source_url,
        price: r.price,
        phone: r.contact_phone,
        zone: r.zone,
        rooms: r.rooms,
        source_platform: r.source_platform,
      }));

  };


  /**
   * Verifică scăderile de preț apărute la anunțurile găsite acum și le trimite
   * în „Scăderi de preț" (prag 3–5%, setat de administrator în acel tab).
   */
  const checkPriceDrops = async () => {
    const saved = Number(window.localStorage.getItem("rt_price_drop_threshold"));
    const minPct = Number.isFinite(saved) && saved >= 3 && saved <= 5 ? saved : 3;
    try {
      const { data, error } = await supabase.functions.invoke("prospect-price-drop-alert", {
        body: { min_pct: minPct, min_abs: 0, hours: 2 },
      });
      if (error) return;
      const drops = Number((data as any)?.drops || 0);
      if (drops > 0) {
        toast({
          title: `${drops} scădere(i) de preț de cel puțin ${minPct}%`,
          description: "Vezi detaliile în Admin → Scăderi de preț.",
        });
        window.dispatchEvent(new Event(PROSPECT_REFRESH_EVENT));
      }
    } catch {
      /* alerta nu trebuie să blocheze căutarea */
    }
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

  /**
   * `quiet` = rescanare automată: păstrează lista afișată, adaugă doar
   * anunțurile noi și nu deranjează cu mesaje de eroare.
   */
  const run = async (prefill?: string, opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet === true;
    const base = (prefill ?? search).trim();
    // În interogare intră un singur tip/compartimentare (portalurile nu acceptă liste),
    // restul bifelor se aplică la filtrarea rezultatelor.
    const typePart = types[0] ?? "";
    const partitionPart = partitions.length === 1 ? partitions[0] : "";
    const onlyFloor = floors.length === 1 ? floors[0] : "";
    const floorPart = onlyFloor === "parter" ? "parter" : onlyFloor === "last" ? "ultimul etaj" : onlyFloor === "mansarda" ? "mansarda" : "";
    const zonePart = zone === ANY_ZONE ? "" : `${zoneSearchTerm(zone)} Timișoara`;
    const roomsPart = rooms === ANY_ROOMS ? "" : `${rooms} camere`;
    const dealPart = deal === "vanzare" ? "de vanzare" : deal === "inchiriere" ? "de inchiriat" : "";
    // Orașul este obligatoriu și când filtrul de zonă este „Toate zonele”.
    const cityPart = zone === ANY_ZONE && !/\btimi[șs]oara\b/i.test(base) ? "Timișoara" : "";
    // Compartimentarea și etajul NU intră în interogare (restrâng prea mult
    // rezultatele pe portaluri) — se aplică la filtrarea rezultatelor.
    void partitionPart; void floorPart;
    const term = `${typePart} ${roomsPart} ${base} ${zonePart} ${cityPart} ${dealPart}`
      .replace(/\s+/g, " ")
      .trim();
    if (term.length < 3) {
      if (!quiet) toast({ title: "Scrie cel puțin 3 litere", description: "Ex: apartament 2 camere NordOne" });
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;
    lastTermRef.current = base;
    if (!quiet) {
      setSearching(true);
      setResults(null);
      setIgnoreFilters(false);
      setSummary(null);
    }
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

      // Completăm cu anunțuri reale deja văzute care respectă termenii ceruți.
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
      let addedNow = listings.length;
      if (quiet) {
        // Rescanare automată: păstrăm lista și adăugăm în față doar ce e nou.
        setResults(prev => {
          if (!prev) return listings;
          const have = new Set(prev.map(x => (x.url || "").trim() || `${x.title || ""}|${x.price || ""}`));
          const fresh = listings.filter(x => !have.has((x.url || "").trim() || `${x.title || ""}|${x.price || ""}`));
          addedNow = fresh.length;
          return fresh.length ? [...fresh, ...prev] : prev;
        });
        setLastAutoAt(new Date());
        if (addedNow > 0) void hydrateExactPrices(listings);
      } else {
        setResults(listings);
        setExactPrices({});
        void hydrateExactPrices(listings);
      }

      const agency = ok.reduce((s, r) => s + r.agency, 0);
      const duplicate = ok.reduce((s, r) => s + r.duplicate, 0);
      const perPlatform = ok.filter(r => r.listings.length > 0).map(r => `${r.platform}: ${r.listings.length}`).join(" · ");
      setSummary(
        (quiet && addedNow > 0 ? `+${addedNow} anunțuri adăugate automat · ` : "") +
        `${newCount} anunțuri noi pe ${ok.length} ${ok.length === 1 ? "platformă" : "platforme"}` +
          (perPlatform ? ` (${perPlatform})` : "") +
          (existingShown ? ` · ${existingShown} anunțuri deja salvate afișate cu link` : "") +
          (agency ? ` · ${agency} agenții excluse` : "") +
          (duplicate ? ` · ${duplicate} deja în listă` : "") +
          (generic ? ` · ${generic} pagini de căutare eliminate` : "") +
          (failedCount ? ` · ${failedCount} platforme fără răspuns` : ""),
      );
      window.dispatchEvent(new Event(PROSPECT_REFRESH_EVENT));
      if (!quiet && listings.length === 0) {
        toast({
          title: "Niciun anunț găsit",
          description: "Toate rezultatele erau de la agenții. Încearcă altă formulare sau altă platformă.",
        });
      }
    } catch (e: any) {
      if (!quiet) toast({ title: "Eroare căutare anunțuri", description: e.message, variant: "destructive" });
    } finally {
      runningRef.current = false;
      if (!quiet) setSearching(false);
    }
  };

  // Referință la ultima versiune a căutării, pentru rescanarea automată.
  const runRef = useRef(run);
  runRef.current = run;

  /** Scanare automată la fiecare 2 minute, cât timp pagina este deschisă. */
  useEffect(() => {
    try { window.localStorage.setItem("rt_owner_search_auto", autoLive ? "1" : "0"); } catch { /* ignorăm */ }
    if (!autoLive) return;
    const tick = () => {
      if (document.hidden) return;
      const base = (lastTermRef.current || search).trim();
      if (base.length < 3) return;
      void runRef.current(base, { quiet: true });
    };
    const id = window.setInterval(tick, 120_000);
    return () => window.clearInterval(id);
  }, [autoLive, search]);

  /** Anunțurile salvate de scraper apar imediat în listă, fără reîncărcare. */
  useEffect(() => {
    if (!autoLive) return;
    const ch = supabase
      .channel("owner-search-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prospect_listings" },
        payload => {
          const r = payload.new as Record<string, any>;
          if (r?.prospect_type === "agentie") return;
          if (r?.lifecycle_status === "expired" || r?.lifecycle_status === "rejected") return;
          const l: AdHocListing = {
            title: r.title,
            description: r.description,
            url: r.source_url,
            price: r.price,
            phone: r.contact_phone,
            zone: r.zone,
            rooms: r.rooms,
            source_platform: r.source_platform,
          };
          if (!isIndividualAd(l)) return;
          setResults(prev => {
            if (!prev) return prev; // nicio căutare activă
            const key = (l.url || "").trim();
            if (prev.some(x => (x.url || "").trim() === key)) return prev;
            return [l, ...prev];
          });
          setLastAutoAt(new Date());
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [autoLive]);

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

      {/* Scanare automată */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={autoLive ? "default" : "outline"}
          aria-pressed={autoLive}
          className="h-9 text-xs"
          onClick={() => setAutoLive(v => !v)}
        >
          {autoLive ? "Scanare automată: pornită" : "Scanare automată: oprită"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {autoLive
            ? "Caută singură la fiecare 2 minute și adaugă anunțurile noi în listă."
            : "Rezultatele se actualizează doar când apeși „Caută anunțuri”."}
          {lastAutoAt && ` Ultima actualizare: ${lastAutoAt.toLocaleTimeString("ro-RO")}.`}
        </span>
      </div>

      {/* Tipuri de imobil — se pot alege mai multe */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Tip de imobil (poți alege mai multe)</div>
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPES.map(t => {
            const on = types.includes(t.value);
            return (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                className="h-9 text-xs"
                onClick={() => { setTypes(v => toggleIn(v, t.value)); setIgnoreFilters(false); }}
              >
                {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Compartimentare */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Compartimentare (poți alege mai multe)</div>
        <div className="flex flex-wrap gap-1.5">
          {PARTITION_OPTIONS.map(p => {
            const on = partitions.includes(p.value);
            return (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                className="h-9 text-xs"
                onClick={() => { setPartitions(v => toggleIn(v, p.value)); setIgnoreFilters(false); }}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Dotări */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Dotări cerute (toate bifele trebuie să apară în anunț)</div>
        <div className="flex flex-wrap gap-1.5">
          {EXTRA_OPTIONS.map(x => {
            const on = extras.includes(x.value);
            return (
              <Button
                key={x.value}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                className="h-9 text-xs"
                onClick={() => { setExtras(v => toggleIn(v, x.value)); setIgnoreFilters(false); }}
              >
                {x.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Etaj — selecție multiplă */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground">Etaj (poți alege mai multe)</div>
        <div className="flex flex-wrap gap-1.5">
          {FLOOR_OPTIONS.map(f => {
            const on = floors.includes(f.value);
            return (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                className="h-9 text-xs"
                onClick={() => { setFloors(v => toggleIn(v, f.value)); setIgnoreFilters(false); }}
              >
                {f.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="sm:w-[190px] min-h-[48px] sm:min-h-0" aria-label="An construcție">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_YEAR}>Orice an construcție</SelectItem>
            {YEAR_OPTIONS.map(y => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as SortValue)}>
          <SelectTrigger className="sm:w-[180px] min-h-[48px] sm:min-h-0" aria-label="Sortare rezultate">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={minSurface}
          onChange={e => setMinSurface(e.target.value)}
          inputMode="numeric"
          placeholder="Suprafață min. (mp)"
          aria-label="Suprafață minimă în metri pătrați"
          className="sm:w-[170px] min-h-[48px] sm:min-h-0"
        />
        <Input
          value={maxSurface}
          onChange={e => setMaxSurface(e.target.value)}
          inputMode="numeric"
          placeholder="Suprafață max. (mp)"
          aria-label="Suprafață maximă în metri pătrați"
          className="sm:w-[170px] min-h-[48px] sm:min-h-0"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground max-w-[26rem]">
            Zone preferate — când nu alegi o zonă anume în filtre, rezultatele se pot limita la aceste zone.
          </div>
          <Button
            type="button"
            size="sm"
            variant={limitToPreferred && preferredZones.length > 0 ? "default" : "outline"}
            disabled={preferredZones.length === 0}
            aria-pressed={limitToPreferred}
            onClick={() => { setLimitToPreferred(v => !v); setIgnoreFilters(false); }}
            className="h-9 text-xs"
          >
            {limitToPreferred ? "Doar zonele preferate" : "Toate zonele"}
          </Button>
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
        const sortResults = (list: AdHocListing[]): AdHocListing[] => {
          if (sort === "relevance") return list;
          const price = (l: AdHocListing) => exactPrices[(l.url || "").trim()] ?? priceValue(l.price);
          const mp = (l: AdHocListing) => surfaceOf(`${l.title || ""} ${l.description || ""}`);
          const arr = [...list];
          if (sort === "price-asc") return arr.sort((a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity));
          if (sort === "price-desc") return arr.sort((a, b) => (price(b) ?? -Infinity) - (price(a) ?? -Infinity));
          if (sort === "surface-desc") return arr.sort((a, b) => (mp(b) ?? 0) - (mp(a) ?? 0));
          if (sort === "eur-mp-asc")
            return arr.sort(
              (a, b) =>
                (pricePerSqm(price(a), mp(a)) ?? Infinity) - (pricePerSqm(price(b), mp(b)) ?? Infinity),
            );
          return arr;
        };
        const matched = sortResults(filterListings(results));
        const main = ignoreFilters ? sortResults(results) : matched;
        const rest = ignoreFilters ? [] : results.filter(r => !matched.includes(r));

        const renderRow = (l: AdHocListing, idx: number) => (
                <div key={`${l.url || idx}`} className="p-2 space-y-1 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] shrink-0">
                      {listingPortal(l) || "platformă necunoscută"}
                    </Badge>
                    {(() => {
                      const why = excludeReason(l);
                      return why ? (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-destructive/40 text-destructive">
                          {why}
                        </Badge>
                      ) : null;
                    })()}
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
                    {(() => {
                      const pv = exactPrices[(l.url || "").trim()] ?? priceValue(l.price);
                      const mp = surfaceOf(`${l.title || ""} ${l.description || ""}`);
                      const per = pricePerSqm(pv, mp);
                      return per ? <span>{per.toLocaleString("ro-RO")} €/mp</span> : null;
                    })()}
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
                        onClick={() => {
                          const url = l.url;
                          if (!url) return;
                          navigator.clipboard?.writeText(url);
                          toast({ title: "Link copiat" });
                        }}
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
            {results.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant={ignoreFilters ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setIgnoreFilters(v => !v)}
              >
                {ignoreFilters
                  ? `Doar cele care respectă filtrele (${matched.length})`
                  : `Arată toate anunțurile găsite (${results.length})`}
              </Button>
            )}
          </div>
          {main.length > 0 ? (
            <>
              <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto bg-background/60">
                {main.map(renderRow)}
              </div>
              {rest.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Alte {rest.length} anunțuri găsite, care nu respectă toate filtrele — cu link direct:
                  </p>
                  <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto bg-background/40 opacity-90">
                    {rest.map(renderRow)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {results.length > 0
                  ? `Am găsit ${results.length} anunțuri, dar niciunul nu respectă filtrele alese.`
                  : "Niciun anunț găsit pentru aceste cuvinte. Încearcă o formulare mai simplă (ex: „decomandat Timișoara”)."}
              </p>
              {results.length > 0 && (() => {
                const per = new Map<string, number>();
                for (const l of results) {
                  const why = excludeReason(l);
                  if (why) per.set(why, (per.get(why) || 0) + 1);
                }
                const top = Array.from(per.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
                return top.length ? (
                  <ul className="text-xs text-muted-foreground list-disc pl-5">
                    {top.map(([why, n]) => (
                      <li key={why}>{n} {n === 1 ? "anunț" : "anunțuri"} — {why}</li>
                    ))}
                  </ul>
                ) : null;
              })()}
              {results.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIgnoreFilters(true)}>
                    Arată toate cele {results.length} anunțuri găsite
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={resetFilters}>
                    Șterge filtrele
                  </Button>
                </div>
              )}
            </div>
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
