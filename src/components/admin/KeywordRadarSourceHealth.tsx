import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlatformResult {
  ok?: boolean;
  inserted?: number;
  timeout_ms?: number;
  error?: string;
}

interface RunRow {
  id: string;
  started_at: string;
  stats: {
    details?: { platforms?: Record<string, PlatformResult> }[];
  } | null;
}

interface Health {
  platform: string;
  calls: number;
  ok: number;
  timeouts: number;
  errors: number;
  inserted: number;
}

export default function KeywordRadarSourceHealth() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("keyword_radar_runs")
        .select("id,started_at,stats")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setRuns((data || []) as unknown as RunRow[]);
    } catch (e: unknown) {
      toast({
        title: "Eroare sănătate surse",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const health = useMemo(() => {
    const map = new Map<string, Health>();
    for (const run of runs) {
      for (const detail of run.stats?.details || []) {
        for (const [platform, res] of Object.entries(detail.platforms || {})) {
          const h = map.get(platform) || { platform, calls: 0, ok: 0, timeouts: 0, errors: 0, inserted: 0 };
          h.calls += 1;
          if (res?.ok) {
            h.ok += 1;
            h.inserted += Number(res.inserted || 0);
          } else if (res?.timeout_ms) {
            h.timeouts += 1;
          } else {
            h.errors += 1;
          }
          map.set(platform, h);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.timeouts + b.errors - (a.timeouts + a.errors) || b.calls - a.calls);
  }, [runs]);

  const excludePlatform = async (platform: string) => {
    try {
      const { error } = await supabase
        .from("scraper_search_keywords")
        .update({ is_active: false })
        .eq("platform", platform)
        .eq("is_active", true);
      if (error) throw error;
      toast({
        title: `${platform} exclusă din scanări`,
        description: "Cuvintele cheie pentru această sursă au fost dezactivate.",
      });
    } catch (e: unknown) {
      toast({
        title: "Eroare excludere",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-orange-500/30 bg-background/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-orange-600" />
          Surse lente sau fără răspuns
          <Badge variant="secondary" className="text-[10px]">ultimele {runs.length} scanări</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          aria-label="Reîmprospătează starea surselor"
          className="min-h-[44px] sm:min-h-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {health.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {loading ? "Se încarcă…" : "Încă nu există scanări înregistrate."}
        </p>
      ) : (
        <div className="border rounded-lg divide-y">
          {health.map(h => {
            const failed = h.timeouts + h.errors;
            const rate = h.calls ? Math.round((failed / h.calls) * 100) : 0;
            const label =
              rate >= 50 ? "fără răspuns" : rate > 0 ? "răspunde lent" : "răspunde bine";
            const tone =
              rate >= 50
                ? "destructive"
                : rate > 0
                  ? "secondary"
                  : "outline";
            return (
              <div key={h.platform} className="p-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium min-w-[110px]">{h.platform}</span>
                <Badge variant={tone as "destructive" | "secondary" | "outline"} className="text-[10px]">
                  {label}
                </Badge>
                <span className="text-muted-foreground">
                  {h.calls} verificări · {h.timeouts} depășiri de timp · {h.errors} erori · {h.inserted} anunțuri
                </span>
                {rate > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto min-h-[36px]"
                    onClick={() => excludePlatform(h.platform)}
                  >
                    Exclude sursa
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
