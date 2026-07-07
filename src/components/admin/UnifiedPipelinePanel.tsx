import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CheckSquare,
  Info,
  Loader2,
  Radar,
  Search,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lazy-load sub-panels — evită bundle-ul monolitic în ecranul unificat.
const ScraperMonitorPanel = lazy(() => import("./ScraperMonitorPanel"));
const ProspectPipelinePanel = lazy(() => import("./ProspectPipelinePanel"));
const PipelineReconciliationPanel = lazy(() => import("./PipelineReconciliationPanel"));
const AutoPublishListingsPanel = lazy(() =>
  import("./AutoPublishListingsPanel").then((m) => ({ default: m.AutoPublishListingsPanel })),
);

const VALID_TABS = ["observability", "prospects", "approval"] as const;
type UnifiedTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: UnifiedTab = "observability";

const STORAGE_KEY_SECTION = "unified-pipeline:section";
const STORAGE_KEY_FILTERS = "unified-pipeline:filters";
const DEBOUNCE_MS = 300;

function isTab(v: string | null | undefined): v is UnifiedTab {
  return !!v && (VALID_TABS as readonly string[]).includes(v);
}

// ────────────────────────────────────────────────────────────────
// Filters — helpers extrași într-un modul dedicat (testabil).
// ────────────────────────────────────────────────────────────────
import {
  DEFAULT_FILTERS,
  ZONE_SYNONYMS,
  buildZoneOr,
  matchesUnifiedFilters,
  normalize,
  sanitizeIlikeTerm,
  zoneCandidates,
  type UnifiedFilters,
} from "./unifiedPipelineFilters";

// Re-export pentru compatibilitate cu importurile existente în sub-panouri.
export { matchesUnifiedFilters };
export type { UnifiedFilters };

interface FiltersContextValue extends UnifiedFilters {
  setFilters: (patch: Partial<UnifiedFilters>) => void;
  reset: () => void;
  hasActive: boolean;
}

const UnifiedPipelineFiltersContext = createContext<FiltersContextValue | null>(null);

/** Hook exportat pentru sub-panouri: le permite să filtreze după q/portal/zone. */
export function useUnifiedPipelineFilters(): FiltersContextValue {
  const ctx = useContext(UnifiedPipelineFiltersContext);
  if (!ctx) {
    return {
      ...DEFAULT_FILTERS,
      setFilters: () => {},
      reset: () => {},
      hasActive: false,
    };
  }
  return ctx;
}

// Silence unused-import warnings for helpers used doar în interogări de mai jos.
void ZONE_SYNONYMS;
void normalize;
void zoneCandidates;

const PORTAL_OPTIONS = [
  { value: "all", label: "Toate portalurile" },
  { value: "olx", label: "OLX" },
  { value: "storia", label: "Storia" },
  { value: "imobiliare", label: "Imobiliare.ro" },
  { value: "publi24", label: "Publi24" },
  { value: "booking", label: "Booking" },
  { value: "airbnb", label: "Airbnb" },
];

const ZONE_OPTIONS = [
  { value: "all", label: "Toate zonele" },
  { value: "isho", label: "ISHO" },
  { value: "paltim", label: "Paltim" },
  { value: "cetate", label: "Cetate / Centru" },
  { value: "iosefin", label: "Iosefin" },
  { value: "fabric", label: "Fabric" },
  { value: "dumbravita", label: "Dumbrăvița" },
  { value: "aradului", label: "Calea Aradului" },
  { value: "elisabetin", label: "Elisabetin" },
  { value: "circumvalatiunii", label: "Circumvalațiunii" },
];

// ────────────────────────────────────────────────────────────────
// Query helpers — filtre aplicate inline, typed via Supabase schema.
// ────────────────────────────────────────────────────────────────

/**
 * Escape valoare `zone` folosită în interogare `.or(...)`: virgulele
 * și parantezele sparg parserul PostgREST.
 */
function escapeIlikeForOr(s: string): string {
  return s.replace(/[,()]/g, " ").trim();
}

/** Construiește o clauză `.or()` care unește toate sinonimele unei zone. */
function buildZoneOr(zoneValue: string, column: "zone" | "location" | "title"): string | null {
  const cands = ZONE_SYNONYMS[normalize(zoneValue)] ?? [zoneValue];
  const parts = cands
    .map((c) => escapeIlikeForOr(c))
    .filter((c) => c.length > 0)
    .map((c) => `${column}.ilike.%${c}%`);
  return parts.length ? parts.join(",") : null;
}

/** Header badge count — anunțuri noi (exclud contacted + statusuri finale). */
function useActivePipelineCount(filters: UnifiedFilters) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["unified-pipeline-count", filters],
    queryFn: async () => {
      let q = supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(rejected,archived,published,duplicate,contacted)");
      if (filters.portal !== "all") q = q.ilike("source_platform", `%${filters.portal}%`);
      if (filters.zone !== "all") {
        const or = buildZoneOr(filters.zone, "zone");
        if (or) q = q.or(or);
      }
      const term = sanitizeIlikeTerm(filters.q);
      if (term.length > 0) {
        q = q.or(`title.ilike.%${term}%,source_url.ilike.%${term}%,zone.ilike.%${term}%`);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("unified-pipeline-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prospect_listings" },
        () => {
          qc.invalidateQueries({ queryKey: ["unified-pipeline-count"] });
          qc.invalidateQueries({ queryKey: ["unified-pipeline-tab-counts"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/**
 * Filtered counters per tab — 3 lightweight COUNT queries în paralel.
 */
function useFilteredTabCounts(filters: UnifiedFilters) {
  return useQuery({
    queryKey: ["unified-pipeline-tab-counts", filters],
    queryFn: async () => {
      const term = sanitizeIlikeTerm(filters.q);

      // Observability: scan jobs în ultimele 24h.
      // NB: prospect_scan_jobs foloseste `current_platform`, nu `target_platform`.
      let obsQ = supabase
        .from("prospect_scan_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
      if (filters.portal !== "all") {
        obsQ = obsQ.ilike("current_platform", `%${filters.portal}%`);
      }

      // Prospects: leads active de contactat.
      let prospQ = supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("prospect_type", "proprietar")
        .not("status", "in", "(rejected,archived,published,duplicate,contacted)");
      if (filters.portal !== "all") prospQ = prospQ.ilike("source_platform", `%${filters.portal}%`);
      if (filters.zone !== "all") {
        const or = buildZoneOr(filters.zone, "zone");
        if (or) prospQ = prospQ.or(or);
      }
      if (term.length > 0) {
        prospQ = prospQ.or(`title.ilike.%${term}%,source_url.ilike.%${term}%,zone.ilike.%${term}%`);
      }

      // Approval: candidați pentru auto-publish.
      let appQ = supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        .gte("lead_score", 55)
        .eq("is_active", true)
        .not("source_url", "is", null);
      if (filters.portal !== "all") appQ = appQ.ilike("source_platform", `%${filters.portal}%`);
      if (filters.zone !== "all") {
        const or = buildZoneOr(filters.zone, "zone");
        if (or) appQ = appQ.or(or);
      }
      if (term.length > 0) {
        appQ = appQ.or(`title.ilike.%${term}%,source_url.ilike.%${term}%,zone.ilike.%${term}%`);
      }

      const [obs, prosp, app] = await Promise.all([obsQ, prospQ, appQ]);

      return {
        observability: obs.error ? null : obs.count ?? 0,
        prospects: prosp.error ? null : prosp.count ?? 0,
        approval: app.error ? null : app.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

const TAB_META: Record<
  UnifiedTab,
  { label: string; icon: typeof Activity; tooltip: string }
> = {
  observability: {
    label: "Observabilitate Tehnică",
    icon: Activity,
    tooltip:
      "Aici vezi dacă motorul de scraping rulează corect: joburi, keywords, erori și audit trail admin.",
  },
  prospects: {
    label: "Pipeline Prospecți",
    icon: Radar,
    tooltip:
      "Aici lucrezi comercial pe lead-uri: scoring AI, apeluri, mesaje WhatsApp la proprietari.",
  },
  approval: {
    label: "Aprobare & Publicare",
    icon: CheckSquare,
    tooltip:
      "Aici aprobi și publici anunțurile validate pe realtrust.ro; reconciliezi anunțurile orfane.",
  },
};

const PanelFallback = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

// ────────────────────────────────────────────────────────────────
// LocalStorage helpers (safe pe SSR / privacy mode)
// ────────────────────────────────────────────────────────────────
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export default function UnifiedPipelinePanel() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Section: URL > localStorage > default. Persistă în localStorage la schimbare.
  const rawSection = searchParams.get("section");
  const initialActive: UnifiedTab = isTab(rawSection)
    ? rawSection
    : (() => {
        const stored = readStorage<string>(STORAGE_KEY_SECTION, DEFAULT_TAB);
        return isTab(stored) ? stored : DEFAULT_TAB;
      })();

  const active: UnifiedTab = isTab(rawSection) ? rawSection : initialActive;

  useEffect(() => {
    if (!rawSection) {
      const next = new URLSearchParams(searchParams);
      next.set("section", initialActive);
      setSearchParams(next, { replace: true });
      return;
    }
    if (!isTab(rawSection)) {
      const next = new URLSearchParams(searchParams);
      next.set("section", DEFAULT_TAB);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSection]);

  useEffect(() => {
    if (isTab(active)) writeStorage(STORAGE_KEY_SECTION, active);
  }, [active]);

  const handleChange = (value: string) => {
    if (!isTab(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set("section", value);
    setSearchParams(next, { replace: true });
  };

  // ── Filters state (persistat).
  const [filters, setFiltersState] = useState<UnifiedFilters>(() =>
    readStorage<UnifiedFilters>(STORAGE_KEY_FILTERS, DEFAULT_FILTERS),
  );
  useEffect(() => {
    writeStorage(STORAGE_KEY_FILTERS, filters);
  }, [filters]);

  // ── Debounced search input — `qInput` local, `filters.q` propagate după 300ms.
  const [qInput, setQInput] = useState<string>(filters.q);
  const debounceTimer = useRef<number | null>(null);
  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    if (qInput === filters.q) return;
    debounceTimer.current = window.setTimeout(() => {
      setFiltersState((prev) => ({ ...prev, q: qInput }));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const filtersCtx = useMemo<FiltersContextValue>(() => {
    const hasActive =
      filters.q.trim().length > 0 ||
      filters.portal !== "all" ||
      filters.zone !== "all";
    return {
      ...filters,
      setFilters: (patch) => setFiltersState((prev) => ({ ...prev, ...patch })),
      reset: () => {
        setFiltersState(DEFAULT_FILTERS);
        setQInput("");
      },
      hasActive,
    };
  }, [filters]);

  // ── Counters
  const {
    data: count,
    isLoading: countLoading,
    isFetching: countFetching,
  } = useActivePipelineCount(filters);
  const isSearchDebouncing = qInput !== filters.q;
  const badgeText = useMemo(() => {
    if (countLoading || count == null) return "…";
    return count.toLocaleString("ro-RO");
  }, [count, countLoading]);
  const badgeBusy = countFetching || isSearchDebouncing;

  const { data: tabCounts, isFetching: tabCountsFetching } = useFilteredTabCounts(filters);
  const tabCountsBusy = tabCountsFetching || isSearchDebouncing;

  const renderTabCount = (v: UnifiedTab) => {
    const n = tabCounts?.[v];
    if (n == null) {
      // Prima încărcare: skeleton discret în loc de salt vizual.
      return (
        <Skeleton
          className="ml-1 h-4 w-6 rounded-full"
          aria-label="Se încarcă numărul de rezultate"
        />
      );
    }
    return (
      <Badge
        variant={filtersCtx.hasActive ? "default" : "outline"}
        className={`ml-1 h-4 min-w-4 px-1 text-[10px] tabular-nums transition-opacity ${
          tabCountsBusy ? "opacity-50 animate-pulse" : "opacity-100"
        }`}
        aria-label={`${n} rezultate în această secțiune${tabCountsBusy ? " (se actualizează)" : ""}`}
        aria-busy={tabCountsBusy}
      >
        {n.toLocaleString("ro-RO")}
      </Badge>
    );
  };


  return (
    <TooltipProvider delayDuration={200}>
      <UnifiedPipelineFiltersContext.Provider value={filtersCtx}>
        <div className="space-y-4">
          {/* Header global */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Pipeline Unificat</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Un singur ecran pentru scraper, prospecți și publicare. Contorul din dreapta
                reflectă în timp real doar anunțurile noi care așteaptă atenție.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={`gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-opacity ${
                    badgeBusy ? "opacity-70" : "opacity-100"
                  }`}
                  aria-label={`Anunțuri noi în pipeline: ${badgeText}`}
                  aria-busy={badgeBusy}
                >
                  {badgeBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Radar className="h-3.5 w-3.5" />
                  )}
                  <span className="tabular-nums">{badgeText} în pipeline</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[280px]">
                Anunțuri noi care așteaptă prima procesare sau contactare. Exclud statusurile{" "}
                <code>rejected</code>, <code>archived</code>, <code>published</code>,{" "}
                <code>duplicate</code> și <code>contacted</code>. Filtre globale aplicate.
                Realtime.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bară globală de filtre */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-card/30 p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Caută în pipeline: titlu, adresă, zonă, URL…"
                className="pl-8 pr-8"
                aria-label="Căutare globală pipeline (debounce 300ms)"
              />
              {isSearchDebouncing && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <Select
              value={filters.portal}
              onValueChange={(v) => filtersCtx.setFilters({ portal: v })}
            >
              <SelectTrigger className="w-[180px]" aria-label="Filtrează după portal imobiliar">
                <SelectValue placeholder="Portal" />
              </SelectTrigger>
              <SelectContent>
                {PORTAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.zone}
              onValueChange={(v) => filtersCtx.setFilters({ zone: v })}
            >
              <SelectTrigger className="w-[190px]" aria-label="Filtrează după micro-zonă Timișoara">
                <SelectValue placeholder="Zonă / micro-zonă" />
              </SelectTrigger>
              <SelectContent>
                {ZONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersCtx.hasActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={filtersCtx.reset}
                className="gap-1.5 text-muted-foreground"
                aria-label="Resetează filtrele"
              >
                <X className="h-3.5 w-3.5" />
                Resetează
              </Button>
            )}
          </div>

          <Tabs value={active} onValueChange={handleChange} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto justify-start gap-1">
              {VALID_TABS.map((v) => {
                const meta = TAB_META[v];
                const Icon = meta.icon;
                return (
                  <Tooltip key={v}>
                    <TooltipTrigger asChild>
                      <TabsTrigger value={v} className="gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{meta.label}</span>
                        {renderTabCount(v)}
                        <Info
                          className="h-3 w-3 text-muted-foreground/70"
                          aria-hidden="true"
                        />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                      {meta.tooltip}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TabsList>

            <TabsContent value="observability" className="mt-0">
              <div className="rounded-lg border border-border/40 bg-card/30 p-4 md:p-6">
                <Suspense fallback={<PanelFallback />}>
                  <ScraperMonitorPanel />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="prospects" className="mt-0">
              <div className="rounded-lg border border-border/40 bg-card/30 p-4 md:p-6">
                <Suspense fallback={<PanelFallback />}>
                  <ProspectPipelinePanel />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="approval" className="mt-0 space-y-4">
              <div className="rounded-lg border border-border/40 bg-card/30 p-4 md:p-6 space-y-4">
                <Suspense fallback={<PanelFallback />}>
                  <PipelineReconciliationPanel />
                  <AutoPublishListingsPanel />
                </Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </UnifiedPipelineFiltersContext.Provider>
    </TooltipProvider>
  );
}
