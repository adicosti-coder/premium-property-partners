// Backlog worker — procesează prospecții 'pending' și retry pe 'failed' cu backoff exponențial.
// Invocă enrich-prospect-listing cu webhook secret (service-role) pentru fiecare candidat.
// Cron: */5 minute. Manual: buton din AutoPublishListingsPanel.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const MAX_ATTEMPTS = 3;
const BACKOFF_MIN = [15, 60, 240]; // 15min, 1h, 4h

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SB_URL, SB_KEY);

  let batch = 5;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.batch_size === "number") batch = Math.min(15, Math.max(1, body.batch_size));
  } catch (_) { /* ignore */ }

  const nowIso = new Date().toISOString();

  // 1) pending (status NULL sau 'pending')
  const { data: pending = [] } = await sb
    .from("prospect_listings")
    .select("id, enrichment_attempts")
    .eq("prospect_type", "proprietar")
    .eq("is_active", true)
    .not("source_url", "is", null)
    .or("enrichment_status.is.null,enrichment_status.eq.pending")
    .order("created_at", { ascending: false })
    .limit(batch);

  // 2) failed scadent + sub MAX_ATTEMPTS
  const remaining = Math.max(0, batch - (pending?.length || 0));
  let failed: any[] = [];
  if (remaining > 0) {
    const r = await sb
      .from("prospect_listings")
      .select("id, enrichment_attempts")
      .eq("prospect_type", "proprietar")
      .eq("is_active", true)
      .not("source_url", "is", null)
      .eq("enrichment_status", "failed")
      .lt("enrichment_attempts", MAX_ATTEMPTS)
      .or(`enrichment_next_retry_at.is.null,enrichment_next_retry_at.lte.${nowIso}`)
      .order("enrichment_next_retry_at", { ascending: true, nullsFirst: true })
      .limit(remaining);
    failed = r.data || [];
  }

  const candidates = [...(pending || []), ...failed];
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const cand of candidates) {
    const nextAttempt = (cand.enrichment_attempts ?? 0) + 1;
    // mark processing + increment attempts upfront (so concurrent runs don't double-pick)
    await sb.from("prospect_listings")
      .update({
        enrichment_status: "processing",
        enrichment_attempts: nextAttempt,
        enrichment_error: null,
      })
      .eq("id", cand.id);

    try {
      const resp = await fetch(`${SB_URL}/functions/v1/enrich-prospect-listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": SB_KEY,
          "apikey": SB_KEY,
        },
        body: JSON.stringify({ prospect_id: cand.id }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`enrich HTTP ${resp.status}: ${txt.slice(0, 200)}`);
      }
      results.push({ id: cand.id, ok: true });
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 400) || "unknown";
      const backoffIdx = Math.min(nextAttempt - 1, BACKOFF_MIN.length - 1);
      const nextRetry = nextAttempt >= MAX_ATTEMPTS
        ? null
        : new Date(Date.now() + BACKOFF_MIN[backoffIdx] * 60_000).toISOString();
      await sb.from("prospect_listings").update({
        enrichment_status: "failed",
        enrichment_error: msg,
        enrichment_next_retry_at: nextRetry,
      }).eq("id", cand.id);
      results.push({ id: cand.id, ok: false, error: msg });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  return new Response(JSON.stringify({
    ok: true,
    picked: candidates.length,
    succeeded: ok,
    failed: results.length - ok,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
