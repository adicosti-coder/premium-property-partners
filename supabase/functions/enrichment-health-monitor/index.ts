// Backlog health monitor — detects spikes of exhausted (failed 3/3) enrichments
// and notifies the production Make.com webhook. Runs via pg_cron every 15 minutes.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Allow cron-secret OR service-role bearer; this is server-internal only.
  const cronSecret = req.headers.get("x-cron-secret");
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (cronSecret !== SB_KEY && bearer !== SB_KEY) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SB_URL, SB_KEY);

  const { data: settings } = await sb
    .from("voice_agent_settings")
    .select("production_webhook_url, alert_worker_errors_enabled, worker_failed_threshold, worker_alert_last_sent_at, worker_failed_baseline_count, worker_failed_baseline_at")
    .eq("id", 1)
    .maybeSingle();

  if (!settings?.alert_worker_errors_enabled || !settings?.production_webhook_url) {
    return json({ ok: true, skipped: "alerts_disabled_or_no_webhook" });
  }

  const threshold = Number(settings.worker_failed_threshold ?? 5);

  // Count current "exhausted" — failed with attempts >= 3
  const { count: exhaustedNow = 0 } = await sb
    .from("prospect_listings")
    .select("id", { count: "exact", head: true })
    .eq("prospect_type", "proprietar")
    .eq("is_active", true)
    .eq("enrichment_status", "failed")
    .gte("enrichment_attempts", 3);

  const now = Date.now();
  const baselineAt = settings.worker_failed_baseline_at ? new Date(settings.worker_failed_baseline_at).getTime() : 0;
  const baselineCount = Number(settings.worker_failed_baseline_count ?? 0);
  const lastAlertAt = settings.worker_alert_last_sent_at ? new Date(settings.worker_alert_last_sent_at).getTime() : 0;

  const ONE_HOUR = 60 * 60 * 1000;
  const baselineFresh = baselineAt && (now - baselineAt) < ONE_HOUR;
  const delta = baselineFresh ? (exhaustedNow! - baselineCount) : 0;

  let alerted = false;
  const cooldownActive = lastAlertAt && (now - lastAlertAt) < ONE_HOUR;

  if (baselineFresh && delta > threshold && !cooldownActive) {
    // Pull a sample of recent errors to help diagnose (API key expired, etc.)
    const { data: samples = [] } = await sb
      .from("prospect_listings")
      .select("id, enrichment_error, source_platform")
      .eq("enrichment_status", "failed")
      .gte("enrichment_attempts", 3)
      .order("updated_at", { ascending: false })
      .limit(5);

    const payload = {
      event: "enrichment_worker_failures_spike",
      severity: "warning",
      message: `Au eșuat ${delta} anunțuri în ultima oră (prag: ${threshold}). Verifică credit/cheie Dewatermark + Gemini.`,
      exhausted_total_now: exhaustedNow,
      baseline_count: baselineCount,
      delta,
      threshold,
      window_minutes: 60,
      sample_errors: (samples || []).map((s: any) => ({
        id: s.id,
        platform: s.source_platform,
        error: (s.enrichment_error || "").slice(0, 240),
      })),
      admin_url: "https://realtrust.ro/admin?tab=listing-import",
      detected_at: new Date().toISOString(),
    };

    try {
      await fetch(settings.production_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alerted = true;
    } catch (e) {
      console.warn("worker alert webhook failed", (e as Error).message);
    }
  }

  // Refresh baseline if missing/stale, OR after we alerted (so next window measures fresh).
  const updates: Record<string, unknown> = {};
  if (!baselineFresh || alerted) {
    updates.worker_failed_baseline_count = exhaustedNow;
    updates.worker_failed_baseline_at = new Date().toISOString();
  }
  if (alerted) updates.worker_alert_last_sent_at = new Date().toISOString();
  if (Object.keys(updates).length) {
    await sb.from("voice_agent_settings").update(updates).eq("id", 1);
  }

  return json({
    ok: true,
    exhausted_now: exhaustedNow,
    baseline_count: baselineCount,
    baseline_fresh: baselineFresh,
    delta,
    threshold,
    alerted,
    cooldown_active: Boolean(cooldownActive),
  });

  function json(body: unknown) {
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
