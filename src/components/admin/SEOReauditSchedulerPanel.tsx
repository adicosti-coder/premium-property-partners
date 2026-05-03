import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Calendar, TrendingDown, TrendingUp, Minus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
  created_at: string;
}

interface Props {
  history: AuditRow[];
}

export const SEOReauditSchedulerPanel = ({ history }: Props) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["seo-audit-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_snapshots")
        .select("url, overall_score, delta_overall, alert_triggered, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Latest unique URL list from audits
  const targets = useMemo(() => {
    const seen = new Map<string, AuditRow>();
    history.forEach((a) => {
      if (!seen.has(a.url)) seen.set(a.url, a);
    });
    return Array.from(seen.values());
  }, [history]);

  // Build snapshot delta map per URL (latest snapshot only)
  const deltaByUrl = useMemo(() => {
    const m = new Map<string, { score: number; delta: number | null; alert: boolean; at: string }>();
    snapshots.forEach((s: any) => {
      if (!m.has(s.url)) m.set(s.url, {
        score: s.overall_score,
        delta: s.delta_overall,
        alert: !!s.alert_triggered,
        at: s.created_at,
      });
    });
    return m;
  }, [snapshots]);

  const regressions = useMemo(
    () => Array.from(deltaByUrl.entries()).filter(([, v]) => (v.delta ?? 0) <= -5),
    [deltaByUrl]
  );

  const runBulk = async () => {
    setRunning(true);
    setProgress({ done: 0, total: targets.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        const { error } = await supabase.functions.invoke("seo-ai-optimizer", {
          body: { url: targets[i].url, language: targets[i].language || "ro", forceRefresh: true },
        });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
      setProgress({ done: i + 1, total: targets.length });
    }
    setRunning(false);
    toast.success(`Re-audit: ${ok} OK, ${fail} eșuate`);
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Bulk Re-Audit Scheduler
          <Badge variant="outline" className="ml-2">{targets.length} URL-uri</Badge>
          {regressions.length > 0 && (
            <Badge variant="destructive" className="ml-1">{regressions.length} regresii</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Rulează re-audit forțat pe toate URL-urile auditate anterior și compară cu snapshot-urile istorice. Alertă automată la scădere ≥5 puncte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runBulk} disabled={running || targets.length === 0} className="gap-2">
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Re-audit {progress.done}/{progress.total}</>
          ) : (
            <><RefreshCcw className="w-4 h-4" /> Re-audit bulk ({targets.length})</>
          )}
        </Button>
        {running && <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />}

        <div>
          <h4 className="text-sm font-medium mb-2">Trend istoric (ultimele snapshot-uri)</h4>
          <ScrollArea className="h-56 rounded-md border">
            <ul className="divide-y text-sm">
              {Array.from(deltaByUrl.entries()).map(([url, v]) => {
                const Icon = (v.delta ?? 0) > 0 ? TrendingUp : (v.delta ?? 0) < 0 ? TrendingDown : Minus;
                const color = (v.delta ?? 0) > 0 ? "text-emerald-600" : (v.delta ?? 0) <= -5 ? "text-red-600" : "text-muted-foreground";
                return (
                  <li key={url} className="px-3 py-2 flex items-center justify-between gap-2">
                    <span className="truncate">{url}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{v.score}</Badge>
                      <span className={`flex items-center gap-1 text-xs ${color}`}>
                        <Icon className="w-3 h-3" />
                        {v.delta != null ? (v.delta > 0 ? `+${v.delta}` : v.delta) : "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
              {deltaByUrl.size === 0 && (
                <li className="px-3 py-4 text-muted-foreground text-center">Niciun snapshot încă. Rulează primul re-audit pentru a porni istoricul.</li>
              )}
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
