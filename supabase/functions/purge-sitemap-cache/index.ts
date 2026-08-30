// Admin-only manual purge of the sitemap cache.
// Deletes every row from `sitemap_cache` and re-warms the three sitemap
// documents with ?fresh=1 so the next crawler hit is already primed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { logAudit } from "../_shared/auditLog.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { error: delErr } = await admin
      .from("sitemap_cache")
      .delete()
      .neq("cache_key", "__never__");
    if (delErr) throw delErr;

    // Re-warm: bypass both cache levels so a fresh document is stored.
    const warmed: Record<string, number> = {};
    for (const type of ["index", "static", "dynamic"]) {
      try {
        const r = await fetch(
          `${supabaseUrl}/functions/v1/sitemap?type=${type}&fresh=1`,
          { headers: { Authorization: `Bearer ${serviceKey}` } },
        );
        warmed[type] = r.status;
      } catch {
        warmed[type] = 0;
      }
    }

    await logAudit(admin, {
      action: "sitemap_cache_purge",
      actor_user_id: auth.userId ?? null,
      entity_type: "sitemap",
      details: { warmed },
      severity: "info",
    });

    return json({ ok: true, purged: true, warmed });
  } catch (e) {
    console.error("[purge-sitemap-cache]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
