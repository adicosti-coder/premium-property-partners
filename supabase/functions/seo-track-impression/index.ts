// Public endpoint — increments impressions/clicks for an A/B variant on a path.
// Called from SEOHead component each time a page renders an override variant.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { url_path, variant, type } = await req.json();
    if (!url_path || !variant || !["A","B"].includes(variant)) return json({ ok: false }, 400);
    const today = new Date().toISOString().slice(0, 10);

    const { data: row } = await sb
      .from("seo_ab_metrics")
      .select("id, impressions, clicks")
      .eq("url_path", url_path)
      .eq("variant", variant)
      .eq("day", today)
      .eq("source", "internal_views")
      .maybeSingle();

    if (row) {
      const update: any = { updated_at: new Date().toISOString() };
      if (type === "click") update.clicks = ((row as any).clicks || 0) + 1;
      else update.impressions = ((row as any).impressions || 0) + 1;
      const imp = update.impressions ?? (row as any).impressions;
      const clk = update.clicks ?? (row as any).clicks;
      if (imp > 0) update.ctr = +(clk / imp).toFixed(4);
      await sb.from("seo_ab_metrics").update(update).eq("id", (row as any).id);
    } else {
      const impressions = type === "click" ? 0 : 1;
      const clicks = type === "click" ? 1 : 0;
      await sb.from("seo_ab_metrics").insert({
        url_path, variant, day: today, impressions, clicks,
        ctr: impressions > 0 ? +(clicks / impressions).toFixed(4) : null,
      });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
