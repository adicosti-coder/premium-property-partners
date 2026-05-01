// SEO Monthly Snapshot — runs once per month. For every active override
// inserts a snapshot row into seo_override_history even if nothing changed,
// so we keep a continuous audit trail.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { data: overrides, error } = await sb
      .from("seo_overrides")
      .select("*")
      .eq("is_active", true);
    if (error) throw error;

    let count = 0;
    for (const o of overrides || []) {
      const { data: lastVer } = await sb
        .from("seo_override_history")
        .select("version_number")
        .eq("override_id", o.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const next = ((lastVer as any)?.version_number || 0) + 1;
      const { error: insErr } = await sb.from("seo_override_history").insert({
        override_id: o.id,
        url_path: o.url_path,
        version_number: next,
        title: o.title,
        meta_description: o.meta_description,
        json_ld: o.json_ld,
        extra_keywords: o.extra_keywords,
        canonical_url: o.canonical_url,
        ab_variant_b: o.ab_variant_b,
        change_type: "monthly_snapshot",
        validation_status: o.last_validation_status || null,
      });
      if (!insErr) count++;
    }
    return json({ ok: true, snapshots: count, total: overrides?.length || 0 });
  } catch (e) {
    console.error("[monthly-snapshot]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
