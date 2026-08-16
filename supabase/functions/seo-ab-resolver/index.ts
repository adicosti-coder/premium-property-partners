// SEO A/B Winner Auto-Resolver
// Runs weekly. For each ab_enabled override, compares CTR per variant from
// seo_ab_metrics over the last 14 days. If a variant has > 5% CTR lift AND
// at least MIN_IMPRESSIONS samples per arm, promotes it as the winner and
// (optionally) merges variant B into the main override.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MIN_IMPRESSIONS = 200;
const MIN_LIFT = 0.05; // 5%
const WINDOW_DAYS = 14;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth gate: weekly cron (service-role / cron secret) or an authenticated admin.
  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: overrides } = await sb
      .from("seo_overrides")
      .select("id, url_path, ab_enabled, ab_variant_b, title, meta_description, ab_winner")
      .eq("ab_enabled", true)
      .eq("is_active", true);

    if (!overrides || overrides.length === 0) {
      return json({ ok: true, evaluated: 0, promoted: 0, message: "No A/B tests active" });
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 86400 * 1000).toISOString().slice(0, 10);
    const results: any[] = [];
    let promoted = 0;

    for (const o of overrides) {
      const { data: metrics } = await sb
        .from("seo_ab_metrics")
        .select("variant, impressions, clicks")
        .eq("url_path", o.url_path)
        .gte("day", since);

      const agg: Record<string, { impressions: number; clicks: number }> = {
        A: { impressions: 0, clicks: 0 },
        B: { impressions: 0, clicks: 0 },
      };
      for (const m of metrics || []) {
        const v = (m as any).variant as "A" | "B";
        if (!agg[v]) continue;
        agg[v].impressions += (m as any).impressions || 0;
        agg[v].clicks += (m as any).clicks || 0;
      }

      const ctrA = agg.A.impressions > 0 ? agg.A.clicks / agg.A.impressions : 0;
      const ctrB = agg.B.impressions > 0 ? agg.B.clicks / agg.B.impressions : 0;
      const enoughSamples = agg.A.impressions >= MIN_IMPRESSIONS && agg.B.impressions >= MIN_IMPRESSIONS;

      let winner: "A" | "B" | null = null;
      if (enoughSamples) {
        if (ctrB > ctrA * (1 + MIN_LIFT)) winner = "B";
        else if (ctrA > ctrB * (1 + MIN_LIFT)) winner = "A";
      }

      const entry: any = {
        url_path: o.url_path,
        impressions: agg,
        ctr: { A: +ctrA.toFixed(4), B: +ctrB.toFixed(4) },
        enough_samples: enoughSamples,
        winner,
      };

      if (winner === "B") {
        const variantB = (o.ab_variant_b as any) || {};
        const update: any = {
          ab_winner: "B",
          ab_enabled: false,
          ab_winner_resolved_at: new Date().toISOString(),
          ab_resolved_by: "auto_resolver",
        };
        if (variantB.title) update.title = variantB.title;
        if (variantB.meta_description) update.meta_description = variantB.meta_description;
        if (variantB.json_ld) update.json_ld = variantB.json_ld;
        if (variantB.canonical_url) update.canonical_url = variantB.canonical_url;
        if (variantB.extra_keywords) update.extra_keywords = variantB.extra_keywords;
        await sb.from("seo_overrides").update(update).eq("id", o.id);
        promoted++;
        entry.promoted = true;
      } else if (winner === "A") {
        await sb
          .from("seo_overrides")
          .update({
            ab_winner: "A",
            ab_enabled: false,
            ab_winner_resolved_at: new Date().toISOString(),
            ab_resolved_by: "auto_resolver",
          })
          .eq("id", o.id);
        promoted++;
        entry.promoted = true;
      }

      results.push(entry);
    }

    return json({ ok: true, evaluated: overrides.length, promoted, results });
  } catch (e) {
    console.error("[ab-resolver]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
