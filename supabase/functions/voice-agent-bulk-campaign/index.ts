import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAudit } from "../_shared/auditLog.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

/* ──────────────────────────────────────────────────────────────
   Bulk Campaign — accepts an array of prospect IDs, creates a
   campaign run record, and triggers auto-dial sequentially.
   Between each dial it checks the run's `cancelled` flag so the
   admin can stop the queue mid-flight from the UI.
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

    // Identify caller (admin) from Authorization header — best effort
    let createdBy: string | null = null;
    let actorEmail: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (token && token !== SERVICE_KEY) {
        const { data: userRes } = await supabase.auth.getUser(token);
        createdBy = userRes?.user?.id ?? null;
        actorEmail = userRes?.user?.email ?? null;
      }
    } catch (_) { /* ignore */ }

    // Create campaign run
    const { data: run, error: runErr } = await supabase
      .from("voice_campaign_runs")
      .insert({
        zone,
        total_targets: ids.length,
        status: "running",
        created_by: createdBy,
      })
      .select()
      .single();
    if (runErr || !run) throw new Error(`run insert: ${runErr?.message}`);

    const campaignId: string = run.id;

    // Audit: campaign launched
    await logAudit(supabase, {
      action: "campaign_launch",
      actor_user_id: createdBy,
      actor_label: actorEmail || (createdBy ? null : "system"),
      entity_type: "campaign",
      entity_id: campaignId,
      details: { zone, total_targets: ids.length, prospect_ids: ids.slice(0, 50) },
      severity: "info",
    });

    // Snapshot current statuses so we can revert on cancel
    const { data: existing } = await supabase
      .from("prospect_listings")
      .select("id, lifecycle_status")
      .in("id", ids);

    // Pre-mark targets as 'calling' + attach campaign_run_id + remember pre_campaign_status
    if (existing?.length) {
      const eligible = existing.filter((r: any) =>
        ["new", "callback", "pending_credentials"].includes(r.lifecycle_status)
      );
      // Bulk update per status group to preserve `pre_campaign_status`
      for (const row of eligible) {
        await supabase
          .from("prospect_listings")
          .update({
            lifecycle_status: "calling",
            auto_call_triggered_at: new Date().toISOString(),
            campaign_run_id: campaignId,
            pre_campaign_status: row.lifecycle_status,
            admin_notes: `[BulkCampaign ${campaignId.slice(0, 8)}] zone=${zone || "all"}`,
          })
          .eq("id", row.id);
      }
    }

    const results: any[] = [];
    let dialed = 0;
    let cancelledMid = false;

    for (const id of ids) {
      // Check cancel flag before each dial
      const { data: state } = await supabase
        .from("voice_campaign_runs")
        .select("cancelled")
        .eq("id", campaignId)
        .maybeSingle();
      if (state?.cancelled) {
        cancelledMid = true;
        results.push({ id, ok: false, skipped: "campaign_cancelled" });
        continue;
      }

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
        const ok = r.ok && (data?.success === true);
        if (ok) dialed++;
        results.push({ id, ok, ...data });

        // Periodically persist progress
        if (dialed % 5 === 0) {
          await supabase
            .from("voice_campaign_runs")
            .update({ dialed_count: dialed, updated_at: new Date().toISOString() })
            .eq("id", campaignId);
        }
      } catch (e: any) {
        results.push({ id, ok: false, error: e.message });
      }
      await new Promise((res) => setTimeout(res, 1500));
    }

    // Finalize
    await supabase
      .from("voice_campaign_runs")
      .update({
        dialed_count: dialed,
        status: cancelledMid ? "cancelled" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Audit: campaign finished (only if not stopped via stop endpoint)
    if (!cancelledMid) {
      await logAudit(supabase, {
        action: "campaign_complete",
        actor_user_id: createdBy,
        actor_label: actorEmail || (createdBy ? null : "system"),
        entity_type: "campaign",
        entity_id: campaignId,
        details: { zone, total: ids.length, dialed },
        severity: "info",
      });
    }

    return jsonResp({
      success: true,
      campaign_id: campaignId,
      total: ids.length,
      dialed,
      cancelled: cancelledMid,
      zone,
      results,
    });
  } catch (e: any) {
    console.error("bulk-campaign error:", e);
    return jsonResp({ error: e.message }, 500);
  }
});
