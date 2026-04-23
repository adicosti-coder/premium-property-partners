import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Bulk Campaign — accepts an array of prospect IDs and triggers
   the auto-dial flow for each, sequentially with a small delay.
   Marks each lead as 'calling' (queue) immediately to prevent
   double-dialing. Returns per-id status.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.prospect_ids) ? body.prospect_ids : [];
    const zone: string | null = body.zone || null;

    if (!ids.length) return jsonResp({ error: "prospect_ids required" }, 400);
    if (ids.length > 50) return jsonResp({ error: "max 50 per campaign" }, 400);

    // Pre-mark all as 'calling' to lock them from concurrent runs
    const { error: lockErr } = await supabase
      .from("prospect_listings")
      .update({
        lifecycle_status: "calling",
        auto_call_triggered_at: new Date().toISOString(),
        admin_notes: `[BulkCampaign] zone=${zone || "all"} ${new Date().toISOString()}`,
      })
      .in("id", ids)
      .in("lifecycle_status", ["new", "callback", "pending_credentials"]);
    if (lockErr) console.warn("lock error (continuing):", lockErr.message);

    const results: any[] = [];
    for (const id of ids) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-auto-dial`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ prospect_id: id, manual: true }),
        });
        const data = await r.json().catch(() => ({}));
        results.push({ id, ok: r.ok, ...data });
      } catch (e: any) {
        results.push({ id, ok: false, error: e.message });
      }
      // small delay between dials
      await new Promise((res) => setTimeout(res, 1500));
    }

    const ok = results.filter((r) => r.success || r.ok).length;
    return jsonResp({
      success: true,
      total: ids.length,
      dialed: ok,
      zone,
      results,
    });
  } catch (e: any) {
    console.error("bulk-campaign error:", e);
    return jsonResp({ error: e.message }, 500);
  }
});
