import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
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

function isTab(v: string | null | undefined): v is UnifiedTab {
  return !!v && (VALID_TABS as readonly string[]).includes(v);
}

// ────────────────────────────────────────────────────────────────
// Filters context — propagat către sub-panouri care aleg să consume.
// ────────────────────────────────────────────────────────────────
export interface UnifiedFilters {
  q: string;
  portal: string; // "all" | olx | storia | imobiliare | publi24 | booking | airbnb
  zone: string;   // "all" | isho | paltim | cetate | iosefin | fabric | dumbravita | aradului | elisabetin | circumvalatiunii
}

const DEFAULT_FILTERS: UnifiedFilters = { q: "", portal: "all", zone: "all" };

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
    // Fallback inert când componenta e folosită în afara Pipeline Unificat.
    return {
      ...DEFAULT_FILTERS,
      setFilters: () => {},
      reset: () => {},
      hasActive: false,
    };
  }
  return ctx;
}

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
// Live counter — exclude și `contacted` pentru a arăta doar leads noi.
// ────────────────────────────────────────────────────────────────
function useActivePipelineCount() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["unified-pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        // Exclude statusurile care NU necesită atenție primară.
        .not("status", "in", "(rejected,archived,published,duplicate,contacted)");
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
        () => qc.invalidateQueries({ queryKey: ["unified-pipeline-count"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
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

  // Dacă URL-ul nu are `section`, hidratează-l din localStorage la prima încărcare.
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

  // Persistă orice schimbare validă de secțiune.
  useEffect(() => {
    if (isTab(active)) writeStorage(STORAGE_KEY_SECTION, active);
  }, [active]);

  const handleChange = (value: string) => {
    if (!isTab(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set("section", value);
    setSearchParams(next, { replace: true });
  };

  // ── Filters state (persistat)
  const [filters, setFiltersState] = useState<UnifiedFilters>(() =>
    readStorage<UnifiedFilters>(STORAGE_KEY_FILTERS, DEFAULT_FILTERS),
  );
  useEffect(() => {
    writeStorage(STORAGE_KEY_FILTERS, filters);
  }, [filters]);

  const filtersCtx = useMemo<FiltersContextValue>(() => {
    const hasActive =
      filters.q.trim().length > 0 ||
      filters.portal !== "all" ||
      filters.zone !== "all";
    return {
      ...filters,
      setFilters: (patch) => setFiltersState((prev) => ({ ...prev, ...patch })),
      reset: () => setFiltersState(DEFAULT_FILTERS),
      hasActive,
    };
  }, [filters]);

  // ── Count badge
  const { data: count, isLoading: countLoading } = useActivePipelineCount();
  const badgeText = useMemo(() => {
    if (countLoading || count == null) return "…";
    return count.toLocaleString("ro-RO");
  }, [count, countLoading]);

  return (
    <TooltipProvider delayDuration={200}>
      <UnifiedPipelineFiltersContext.Provider value={filtersCtx}>
        <div className="space-y-4">
          {/* Header global cu titlu + badge contor unic */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Pipeline Unificat</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Un singur ecran pentru scraper, prospecți și publicare — elimină confuzia de
                duplicare între vederi. Contorul din dreapta reflectă în timp real doar
                anunțurile care așteaptă prima procesare.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
                  aria-label={`Anunțuri noi în pipeline: ${badgeText}`}
                >
                  {countLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Radar className="h-3.5 w-3.5" />
                  )}
                  <span>{badgeText} în pipeline</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[280px]">
                Anunțuri noi care așteaptă prima procesare sau contactare. Exclud statusurile{" "}
                <code>rejected</code>, <code>archived</code>, <code>published</code>,{" "}
                <code>duplicate</code> și <code>contacted</code>. Actualizat live prin Realtime.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bară globală: căutare + filtre portal/zonă */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-card/30 p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => filtersCtx.setFilters({ q: e.target.value })}
                placeholder="Caută în pipeline: titlu, adresă, telefon, URL…"
                className="pl-8"
                aria-label="Căutare globală pipeline"
              />
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
