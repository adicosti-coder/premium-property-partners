import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Radar, CheckSquare, Info, Loader2 } from "lucide-react";
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

function isTab(v: string | null): v is UnifiedTab {
  return !!v && (VALID_TABS as readonly string[]).includes(v);
}

/** Live counter for active listings inside the pipeline (prospect_listings). */
function useActivePipelineCount() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["unified-pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("prospect_listings")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(rejected,archived,published,duplicate)");
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

export default function UnifiedPipelinePanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Outer key is `section` (subtab rămâne pentru sub-panourile interne — ex. ProspectPipelinePanel).
  const raw = searchParams.get("section");
  const active: UnifiedTab = isTab(raw) ? raw : DEFAULT_TAB;
  const [notifiedInvalid, setNotifiedInvalid] = useState(false);

  useEffect(() => {
    if (raw && !isTab(raw) && !notifiedInvalid) {
      const next = new URLSearchParams(searchParams);
      next.set("section", DEFAULT_TAB);
      setSearchParams(next, { replace: true });
      setNotifiedInvalid(true);
    }
  }, [raw, searchParams, setSearchParams, notifiedInvalid]);

  const handleChange = (value: string) => {
    if (!isTab(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set("section", value);
    setSearchParams(next, { replace: true });
  };

  const { data: count, isLoading: countLoading } = useActivePipelineCount();

  const badgeText = useMemo(() => {
    if (countLoading || count == null) return "…";
    return count.toLocaleString("ro-RO");
  }, [count, countLoading]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header global cu badge contor unic */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Pipeline Unificat</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Un singur ecran pentru scraper, prospecți și publicare — elimină confuzia de duplicare
              între vederi. Contorul din dreapta reflectă în timp real anunțurile active din pipeline.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
                aria-label={`Anunțuri active în pipeline: ${badgeText}`}
              >
                {countLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Radar className="h-3.5 w-3.5" />
                )}
                <span>{badgeText} în pipeline</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[260px]">
              Anunțuri unice din <code>prospect_listings</code> care nu sunt respinse, arhivate,
              publicate sau duplicate. Actualizat live prin Realtime.
            </TooltipContent>
          </Tooltip>
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
    </TooltipProvider>
  );
}
