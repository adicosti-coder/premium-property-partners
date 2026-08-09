import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { PropertyQualityOverride, PropertyQualityOverrideRow } from "./types";

/**
 * Manual override layer for the AI photo analysis.
 * The AI result (`quality_score` / `quality_analysis`) is NEVER mutated — the
 * admin correction lives in `quality_override` and every change is appended to
 * `property_quality_overrides` for a full audit trail.
 */
export function useQualityOverride(prospectId: string) {
  const qc = useQueryClient();
  const historyKey = ["prospect-quality-overrides", prospectId];

  const history = useQuery({
    queryKey: historyKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_quality_overrides")
        .select("id, prospect_id, admin_id, ai_quality_score, previous_override, override, note, created_at")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as PropertyQualityOverrideRow[];
    },
    enabled: !!prospectId,
  });

  const save = useMutation({
    mutationFn: async (p: {
      override: PropertyQualityOverride;
      previous: PropertyQualityOverride | null;
      aiQualityScore: number | null;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const adminId = auth.user?.id;
      if (!adminId) throw new Error("Sesiune expirată — reautentifică-te.");

      const isCleared = Object.values(p.override).every(
        (v) => v == null || v === "" || (typeof v === "number" && Number.isNaN(v)),
      );
      const nextOverride = isCleared ? null : p.override;

      const { error: histErr } = await supabase.from("property_quality_overrides").insert({
        prospect_id: prospectId,
        admin_id: adminId,
        ai_quality_score: p.aiQualityScore,
        previous_override: p.previous,
        override: nextOverride ?? {},
        note: p.override.note ?? null,
      });
      if (histErr) throw histErr;

      const { error: updErr } = await supabase
        .from("prospect_listings")
        .update({
          quality_override: nextOverride,
          quality_override_at: nextOverride ? new Date().toISOString() : null,
          quality_override_by: nextOverride ? adminId : null,
        })
        .eq("id", prospectId);
      if (updErr) throw updErr;

      return nextOverride;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: historyKey });
      qc.invalidateQueries({ queryKey: ["prospect-triage"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  return {
    history: history.data ?? [],
    isLoadingHistory: history.isLoading,
    historyError: history.error as Error | null,
    saveOverride: save.mutateAsync,
    isSaving: save.isPending,
  };
}
