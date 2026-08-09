import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Camera, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

export interface PropertyQualityAnalysis {
  quality_score?: number;
  condition?: string;
  finishes?: string;
  furnishing?: string;
  hotel_readiness?: number;
  renovation_needed?: boolean;
  estimated_refresh_cost_eur?: number | null;
  highlights?: string[];
  red_flags?: string[];
  reasoning?: string;
  images_analyzed?: number;
  model?: string;
}

interface Props {
  prospectId: string;
  imagesCount: number;
  qualityScore?: number | null;
  qualityAnalysis?: PropertyQualityAnalysis | null;
  qualityAnalyzedAt?: string | null;
  onUpdated?: (patch: Record<string, unknown>) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  nou: "Nou",
  renovat_recent: "Renovat recent",
  bun: "Stare bună",
  invechit: "Învechit",
  necesita_renovare: "Necesită renovare",
};

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-destructive";
}

export default function PropertyQualityScoreCard({
  prospectId,
  imagesCount,
  qualityScore,
  qualityAnalysis,
  qualityAnalyzedAt,
  onUpdated,
}: Props) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<{
    score: number | null;
    analysis: PropertyQualityAnalysis | null;
    at: string | null;
  }>({
    score: qualityScore ?? null,
    analysis: qualityAnalysis ?? null,
    at: qualityAnalyzedAt ?? null,
  });

  const analyze = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("property-vision-score", {
        body: { prospect_id: prospectId, force: true },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as {
        quality_score: number;
        lead_score: number;
        analysis: PropertyQualityAnalysis;
      };
    },
    onSuccess: (data) => {
      setLocal({
        score: data.quality_score,
        analysis: data.analysis,
        at: new Date().toISOString(),
      });
      onUpdated?.({
        quality_score: data.quality_score,
        quality_analysis: data.analysis,
        lead_score: data.lead_score,
      });
      toast({
        title: `📸 Property Quality Score: ${data.quality_score}/100`,
        description: `Scorul de lead a fost actualizat la ${data.lead_score}.`,
      });
      qc.invalidateQueries({ queryKey: ["prospect-triage"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
    },
    onError: (e: Error) => {
      const msg =
        e.message === "no_usable_images"
          ? "Anunțul nu are poze accesibile pentru analiză."
          : e.message === "credits_exhausted"
            ? "Credite AI epuizate — adaugă credite în workspace."
            : e.message === "rate_limited"
              ? "Limită AI atinsă temporar. Reîncearcă în câteva minute."
              : e.message;
      toast({ title: "Analiză foto eșuată", description: msg, variant: "destructive" });
    },
  });

  const score = local.score;
  const a = local.analysis;
  const hasResult = score != null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
          Property Quality Score
        </CardTitle>
        <Button
          size="sm"
          variant={hasResult ? "outline" : "default"}
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending || imagesCount === 0}
          aria-label={hasResult ? "Reanalizează pozele anunțului" : "Analizează pozele anunțului"}
        >
          {analyze.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : hasResult ? (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {hasResult ? "Reanalizează" : "Analizează foto"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {imagesCount === 0 && (
          <p className="text-muted-foreground">
            Anunțul nu are poze salvate — analiza vizuală nu este disponibilă.
          </p>
        )}

        {!hasResult && imagesCount > 0 && !analyze.isPending && (
          <p className="text-muted-foreground">
            Neanalizat. Rulează analiza pentru stare, finisaje și pretabilitate regim hotelier.
          </p>
        )}

        {analyze.isPending && (
          <p className="text-muted-foreground">Se analizează pozele (până la 5 imagini)…</p>
        )}

        {hasResult && (
          <>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-semibold ${scoreTone(score!)}`}>{score}/100</span>
                {a?.hotel_readiness != null && (
                  <span className="text-xs text-muted-foreground">
                    Regim hotelier: {a.hotel_readiness}/100
                  </span>
                )}
              </div>
              <Progress value={score!} aria-label="Property Quality Score" />
            </div>

            <div className="flex flex-wrap gap-2">
              {a?.condition && (
                <Badge variant="secondary">{CONDITION_LABELS[a.condition] || a.condition}</Badge>
              )}
              {a?.finishes && <Badge variant="outline">Finisaje: {a.finishes}</Badge>}
              {a?.furnishing && <Badge variant="outline">{a.furnishing.replace(/_/g, " ")}</Badge>}
              {a?.renovation_needed && (
                <Badge variant="destructive">
                  Renovare necesară
                  {a.estimated_refresh_cost_eur ? ` ~${a.estimated_refresh_cost_eur} €` : ""}
                </Badge>
              )}
            </div>

            {a?.reasoning && <p className="text-muted-foreground">{a.reasoning}</p>}

            {!!a?.highlights?.length && (
              <ul className="space-y-1">
                {a.highlights.map((h, i) => (
                  <li key={`h-${i}`} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {!!a?.red_flags?.length && (
              <ul className="space-y-1">
                {a.red_flags.map((f, i) => (
                  <li key={`f-${i}`} className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              {a?.images_analyzed ?? 0} poze analizate
              {local.at ? ` • ${new Date(local.at).toLocaleString("ro-RO")}` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
