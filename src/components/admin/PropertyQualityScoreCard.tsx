import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Camera,
  ChevronDown,
  DatabaseZap,
  History,
  Loader2,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { BADGE_TONE_CLASS, buildQualityBadges } from "./vision/qualityBadges";
import { useQualityOverride } from "./vision/useQualityOverride";
import {
  CONDITION_OPTIONS,
  FINISH_OPTIONS,
  type PropertyQualityAnalysis,
  type PropertyQualityOverride,
} from "./vision/types";

export type { PropertyQualityAnalysis, PropertyQualityOverride } from "./vision/types";

interface Props {
  prospectId: string;
  imagesCount: number;
  qualityScore?: number | null;
  qualityAnalysis?: PropertyQualityAnalysis | null;
  qualityAnalyzedAt?: string | null;
  qualityOverride?: PropertyQualityOverride | null;
  onUpdated?: (patch: Record<string, unknown>) => void;
}

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map((o) => [o.value, o.label]),
);

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-destructive";
}

const EMPTY_OVERRIDE: PropertyQualityOverride = {
  quality_score: null,
  hotel_readiness: null,
  condition: null,
  finishes: null,
  note: null,
};

export default function PropertyQualityScoreCard({
  prospectId,
  imagesCount,
  qualityScore,
  qualityAnalysis,
  qualityAnalyzedAt,
  qualityOverride,
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
  const [override, setOverride] = useState<PropertyQualityOverride | null>(qualityOverride ?? null);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState<PropertyQualityOverride>({
    ...EMPTY_OVERRIDE,
    ...(qualityOverride ?? {}),
  });

  const { history, isLoadingHistory, saveOverride, isSaving } = useQualityOverride(prospectId);

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
        cached?: boolean;
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
        description: data.cached
          ? "Rezultat reutilizat din cache (fără cost AI)."
          : `Scorul de lead a fost actualizat la ${data.lead_score}.`,
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

  const aiScore = local.score;
  const a = local.analysis;
  const hasResult = aiScore != null;

  /** Effective values = AI result with the admin override applied on top. */
  const effective = useMemo(() => {
    const merged: PropertyQualityAnalysis = { ...(a ?? {}) };
    if (override?.condition) merged.condition = override.condition;
    if (override?.finishes) merged.finishes = override.finishes;
    if (override?.hotel_readiness != null) merged.hotel_readiness = override.hotel_readiness;
    return {
      score: override?.quality_score ?? aiScore,
      analysis: merged,
    };
  }, [a, override, aiScore]);

  const badges = useMemo(() => buildQualityBadges(effective.analysis), [effective.analysis]);
  const isOverridden = !!override && Object.values(override).some((v) => v != null && v !== "");

  const numOrNull = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  };

  const commit = async (next: PropertyQualityOverride) => {
    try {
      const saved = await saveOverride({
        override: next,
        previous: override,
        aiQualityScore: aiScore,
      });
      setOverride(saved);
      setDraft({ ...EMPTY_OVERRIDE, ...(saved ?? {}) });
      setEditing(false);
      onUpdated?.({ quality_override: saved });
      toast({
        title: saved ? "Ajustare manuală salvată" : "Ajustare manuală ștearsă",
        description: saved
          ? "Scorul AI original a fost păstrat intact în istoric."
          : "S-a revenit la rezultatul generat de AI.",
      });
    } catch (e) {
      toast({
        title: "Salvare eșuată",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
          Property Quality Score
          {a?.from_cache && (
            <Badge variant="outline" className="gap-1 text-[10px] font-normal">
              <DatabaseZap className="h-3 w-3" aria-hidden="true" />
              cache
            </Badge>
          )}
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
          <p className="text-muted-foreground">Se analizează pozele…</p>
        )}

        {hasResult && (
          <>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-2xl font-semibold ${scoreTone(effective.score ?? 0)}`}>
                  {effective.score}/100
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isOverridden && override?.quality_score != null && (
                    <span>AI: {aiScore}/100</span>
                  )}
                  {effective.analysis.hotel_readiness != null && (
                    <span>Regim hotelier: {effective.analysis.hotel_readiness}/100</span>
                  )}
                </div>
              </div>
              <Progress value={effective.score ?? 0} aria-label="Property Quality Score" />
              {isOverridden && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <PencilLine className="h-3 w-3" aria-hidden="true" />
                  Ajustat manual
                </Badge>
              )}
            </div>

            {/* Synthetic summary badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE_TONE_CLASS[b.tone]}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {effective.analysis.condition && (
                <Badge variant="secondary">
                  {CONDITION_LABELS[effective.analysis.condition] || effective.analysis.condition}
                </Badge>
              )}
              {effective.analysis.finishes && (
                <Badge variant="outline">Finisaje: {effective.analysis.finishes}</Badge>
              )}
              {effective.analysis.furnishing && (
                <Badge variant="outline">{effective.analysis.furnishing.replace(/_/g, " ")}</Badge>
              )}
              {effective.analysis.renovation_needed && (
                <Badge variant="destructive">
                  Renovare necesară
                  {effective.analysis.estimated_refresh_cost_eur
                    ? ` ~${effective.analysis.estimated_refresh_cost_eur} €`
                    : ""}
                </Badge>
              )}
            </div>

            {effective.analysis.reasoning && (
              <p className="text-muted-foreground">{effective.analysis.reasoning}</p>
            )}

            {!!effective.analysis.highlights?.length && (
              <ul className="space-y-1">
                {effective.analysis.highlights.map((h, i) => (
                  <li key={`h-${i}`} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {!!effective.analysis.red_flags?.length && (
              <ul className="space-y-1">
                {effective.analysis.red_flags.map((f, i) => (
                  <li key={`f-${i}`} className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            {override?.note && (
              <p className="rounded-md border border-dashed bg-muted/40 p-2 text-xs">
                <span className="font-medium">Observație admin: </span>
                {override.note}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {a?.images_analyzed ?? 0} poze analizate
              {local.at ? ` • ${new Date(local.at).toLocaleString("ro-RO")}` : ""}
            </p>

            <Separator />

            {/* ── Manual override ───────────────────────────── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Ajustare manuală
                </span>
                <div className="flex items-center gap-2">
                  {isOverridden && !editing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => commit({ ...EMPTY_OVERRIDE })}
                      disabled={isSaving}
                      aria-label="Revino la scorul generat de AI"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Resetează la AI
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing((v) => !v)}
                    aria-label={editing ? "Închide ajustarea manuală" : "Deschide ajustarea manuală"}
                  >
                    {editing ? "Anulează" : isOverridden ? "Editează" : "Ajustează"}
                  </Button>
                </div>
              </div>

              {editing && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`ov-score-${prospectId}`} className="text-xs">
                        Scor calitate (0-100)
                      </Label>
                      <Input
                        id={`ov-score-${prospectId}`}
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        placeholder={`AI: ${aiScore ?? "—"}`}
                        value={draft.quality_score ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, quality_score: numOrNull(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ov-hotel-${prospectId}`} className="text-xs">
                        Pretabilitate regim hotelier
                      </Label>
                      <Input
                        id={`ov-hotel-${prospectId}`}
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        placeholder={`AI: ${a?.hotel_readiness ?? "—"}`}
                        value={draft.hotel_readiness ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, hotel_readiness: numOrNull(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Finisaje</Label>
                      <Select
                        value={draft.finishes ?? ""}
                        onValueChange={(v) => setDraft((d) => ({ ...d, finishes: v || null }))}
                      >
                        <SelectTrigger aria-label="Suprascrie finisajele">
                          <SelectValue placeholder={`AI: ${a?.finishes ?? "—"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {FINISH_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stare</Label>
                      <Select
                        value={draft.condition ?? ""}
                        onValueChange={(v) => setDraft((d) => ({ ...d, condition: v || null }))}
                      >
                        <SelectTrigger aria-label="Suprascrie starea">
                          <SelectValue placeholder={`AI: ${a?.condition ?? "—"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`ov-note-${prospectId}`} className="text-xs">
                      Observații personalizate
                    </Label>
                    <Textarea
                      id={`ov-note-${prospectId}`}
                      rows={2}
                      maxLength={600}
                      placeholder="Ex: baia e refăcută recent, pozele nu o arată."
                      value={draft.note ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value || null }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => commit(draft)} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Salvează ajustarea
                    </Button>
                  </div>
                </div>
              )}

              {/* Override history — kept separate from the AI result */}
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-expanded={showHistory}
                  aria-label="Comută istoricul ajustărilor manuale"
                >
                  <History className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Istoric ajustări {history.length > 0 ? `(${history.length})` : ""}
                  <ChevronDown
                    className={`ml-1 h-3.5 w-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </Button>

                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {isLoadingHistory && (
                      <p className="text-xs text-muted-foreground">Se încarcă istoricul…</p>
                    )}
                    {!isLoadingHistory && history.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nicio ajustare manuală — scorul afișat este 100% generat de AI.
                      </p>
                    )}
                    {history.map((h) => {
                      const o = h.override || {};
                      const changes = [
                        o.quality_score != null ? `scor ${o.quality_score}` : null,
                        o.hotel_readiness != null ? `regim hotelier ${o.hotel_readiness}` : null,
                        o.finishes ? `finisaje ${o.finishes}` : null,
                        o.condition ? `stare ${o.condition}` : null,
                      ].filter(Boolean);
                      return (
                        <div key={h.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              {changes.length ? changes.join(" • ") : "Resetat la scorul AI"}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(h.created_at).toLocaleString("ro-RO")}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            Scor AI la momentul respectiv: {h.ai_quality_score ?? "—"}
                          </p>
                          {h.note && <p className="mt-1">„{h.note}”</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
