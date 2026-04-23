import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAudit } from "../_shared/auditLog.ts";

/* ──────────────────────────────────────────────────────────────
   Stop Campaign — marks a campaign run as cancelled and reverts
   any prospects that were locked but not yet actually dialed
   (no voice_call_session_id) back to their pre_campaign_status.
   In-progress calls are NOT interrupted; only queued ones.

   Body: { campaign_id?: string }  // if omitted, cancels the
                                   // most recent 'running' campaign
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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResp({ error: "unauthorized" }, 401);

    let userId: string | null = null;
    let actorEmail: string | null = null;
    try {
      const { data: userRes } = await supabase.auth.getUser(token);
      userId = userRes?.user?.id ?? null;
      actorEmail = userRes?.user?.email ?? null;
    } catch (_) { /* ignore */ }
    if (!userId) return jsonResp({ error: "unauthorized" }, 401);

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return jsonResp({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    let campaignId: string | undefined = body.campaign_id;

    if (!campaignId) {
      const { data: latest } = await supabase
        .from("voice_campaign_runs")
        .select("id")
        .eq("status", "running")
        .eq("cancelled", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      campaignId = latest?.id;
    }

    if (!campaignId) {
      return jsonResp({ skipped: "no_active_campaign" });
    }

    // Mark cancelled
    await supabase
      .from("voice_campaign_runs")
      .update({
        cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Find prospects locked by this campaign that haven't dialed yet
    const { data: queued } = await supabase
      .from("prospect_listings")
      .select("id, pre_campaign_status, voice_call_session_id, lifecycle_status")
      .eq("campaign_run_id", campaignId)
      .eq("lifecycle_status", "calling")
      .is("voice_call_session_id", null);

    const reverted: string[] = [];
    for (const row of queued || []) {
      const restore = (row as any).pre_campaign_status || "new";
      const { error } = await supabase
        .from("prospect_listings")
        .update({
          lifecycle_status: restore,
          auto_call_triggered_at: null,
          campaign_run_id: null,
          pre_campaign_status: null,
          admin_notes: `[Campaign cancelled ${new Date().toISOString()}]`,
        })
        .eq("id", (row as any).id);
      if (!error) reverted.push((row as any).id);
    }

    // Audit: forced campaign stop
    await logAudit(supabase, {
      action: "campaign_stop",
      actor_user_id: userId,
      actor_label: actorEmail,
      entity_type: "campaign",
      entity_id: campaignId,
      details: { reverted_count: reverted.length, reverted_ids: reverted.slice(0, 50) },
      severity: "warning",
    });

    return jsonResp({
      success: true,
      campaign_id: campaignId,
      reverted_count: reverted.length,
      reverted_ids: reverted,
    });
  } catch (e: any) {
    console.error("stop-campaign error:", e);
    return jsonResp({ error: e.message }, 500);
  }
});
