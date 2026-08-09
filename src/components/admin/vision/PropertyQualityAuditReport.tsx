import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3 } from "lucide-react";

interface AuditRow {
  total_overrides: number;
  prospects_touched: number;
  avg_ai_score: number | null;
  avg_manual_score: number | null;
  avg_abs_delta: number | null;
  avg_signed_delta: number | null;
  ai_overrated_pct: number | null;
  ai_underrated_pct: number | null;
  within_5_pct: number | null;
}

interface VisionErrorRow {
  id: string;
  prospect_id: string | null;
  stage: string;
  status_code: number | null;
  error: string | null;
  fallback_used: boolean;
  created_at: string;
}

const RANGES = [7, 30, 90] as const;

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-md border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/**
 * "Raport audit override" — compares the AI photo score with the manual admin
 * correction so we can measure how accurate the vision model actually is, plus
 * a live feed of vision failures (text-only fallbacks).
 */
export default function PropertyQualityAuditReport() {
  const [days, setDays] = useState<number>(30);

  const audit = useQuery({
    queryKey: ["quality-override-audit", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quality_override_audit", { _days: days });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as AuditRow | undefined;
      return row ?? null;
    },
  });

  const errors = useQuery({
    queryKey: ["property-vision-errors", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("property_vision_errors")
        .select("id, prospect_id, stage, status_code, error, fallback_used, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as VisionErrorRow[];
    },
  });

  const a = audit.data;
  const num = (v: number | null | undefined, suffix = "") =>
    v == null ? "—" : `${v}${suffix}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Raport audit override (AI vs. agent)
            </CardTitle>
            <CardDescription>
              Cât de aproape este scorul foto generat de AI de corecțiile manuale ale agenților.
            </CardDescription>
          </div>
          <div className="flex gap-1" role="group" aria-label="Interval raport">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={days === r ? "default" : "outline"}
                onClick={() => setDays(r)}
                aria-pressed={days === r}
              >
                {r}z
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {audit.isLoading && <Skeleton className="h-24 w-full" />}
        {audit.error && (
          <p className="text-sm text-destructive">
            Nu am putut încărca raportul: {(audit.error as Error).message}
          </p>
        )}

        {!audit.isLoading && !audit.error && (!a || Number(a.total_overrides) === 0) && (
          <p className="text-sm text-muted-foreground">
            Încă nu există corecții manuale de scor în ultimele {days} zile — nimic de comparat.
          </p>
        )}

        {!audit.isLoading && !audit.error && a && Number(a.total_overrides) > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Corecții manuale"
              value={String(a.total_overrides)}
              hint={`${a.prospects_touched} prospecți`}
            />
            <Stat
              label="Scor mediu AI vs. agent"
              value={`${num(a.avg_ai_score)} → ${num(a.avg_manual_score)}`}
              hint={`abatere medie ${num(a.avg_abs_delta)} pct`}
            />
            <Stat
              label="Acuratețe (±5 pct)"
              value={num(a.within_5_pct, "%")}
              hint={`tendință ${num(a.avg_signed_delta)} pct`}
            />
            <Stat
              label="AI prea generos / prea sever"
              value={`${num(a.ai_overrated_pct, "%")} / ${num(a.ai_underrated_pct, "%")}`}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h4 className="text-sm font-medium">Monitorizare erori analiză foto</h4>
          </div>

          {errors.isLoading && <Skeleton className="h-16 w-full" />}
          {errors.error && (
            <p className="text-sm text-destructive">
              Nu am putut încărca erorile: {(errors.error as Error).message}
            </p>
          )}
          {!errors.isLoading && !errors.error && (errors.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              Nicio eroare în ultimele {days} zile — modelul de imagini funcționează normal.
            </p>
          )}
          {(errors.data ?? []).map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs"
            >
              <Badge variant="outline">{e.stage}</Badge>
              {e.status_code != null && <Badge variant="secondary">HTTP {e.status_code}</Badge>}
              {e.fallback_used && <Badge variant="secondary">fallback text-only</Badge>}
              <span className="text-muted-foreground">
                {new Date(e.created_at).toLocaleString("ro-RO")}
              </span>
              {e.error && (
                <span className="w-full truncate text-muted-foreground" title={e.error}>
                  {e.error}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
