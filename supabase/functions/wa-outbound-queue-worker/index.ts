// wa-outbound-queue-worker — golește coada de mesaje inițiale (marketing template)
// către proprietarii extrași de scraper. Rulează pe cron sau manual din Admin.
// Internal-only (cron secret / service role) sau admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  let body: { batch_size?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const batchSize = Math.min(50, Math.max(1, Number(body.batch_size) || 10));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: queue, error } = await supabase
    .from("wa_outbound_queue")
    .select(
      "id, phone_normalized, prospect_listing_id, template_name, template_language, template_params, attempts, conversation_id",
    )
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  if (error) return json({ error: error.message }, 500);
  if (!queue?.length) return json({ ok: true, processed: 0 });

  const results: Record<string, unknown>[] = [];

  for (const item of queue) {
    // Claim optimist: doar dacă e încă 'pending'
    const { data: claimed } = await supabase
      .from("wa_outbound_queue")
      .update({ status: "sending", attempts: (item.attempts ?? 0) + 1 })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      // Conversație (creează sau refolosește)
      let conversationId = item.conversation_id as string | null;
      if (!conversationId) {
        const { data: conv, error: convErr } = await supabase
          .from("wa_conversations")
          .upsert(
            {
              phone_normalized: item.phone_normalized,
              prospect_id: item.prospect_listing_id,
              status: "active",
              assigned_channel: "whatsapp",
              opened_by_template: item.template_name,
            },
            { onConflict: "phone_normalized" },
          )
          .select("id")
          .single();
        if (convErr) throw convErr;
        conversationId = conv.id;
      }

      const send = await fetchWithRetry(
        `${supabaseUrl}/functions/v1/wa-andrei-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            template_name: item.template_name,
            template_language: item.template_language || "ro",
            template_params: Array.isArray(item.template_params) ? item.template_params : [],
          }),
        },
        { label: "wa-outbound-worker", maxAttempts: 3, timeoutMs: 20_000 },
      );

      const attempts = (item.attempts ?? 0) + 1;

      if (send.ok) {
        await supabase
          .from("wa_outbound_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            conversation_id: conversationId,
            last_error: null,
          })
          .eq("id", item.id);

        await supabase.from("communication_logs").insert({
          channel: "whatsapp",
          direction: "outbound",
          source: "wa-outbound-queue",
          to_number: item.phone_normalized,
          prospect_listing_id: item.prospect_listing_id,
          status: "sent",
          outcome: "template_sent",
          metadata: { template: item.template_name, attempts },
        });

        results.push({ id: item.id, status: "sent" });
      } else {
        const err = (send.error ?? `http_${send.status}`).slice(0, 500);
        const exhausted = attempts >= MAX_ATTEMPTS;
        // Backoff la nivel de coadă: 5min, 25min
        const delayMin = attempts === 1 ? 5 : 25;
        await supabase
          .from("wa_outbound_queue")
          .update({
            status: exhausted ? "failed" : "pending",
            last_error: err,
            conversation_id: conversationId,
            scheduled_at: exhausted
              ? new Date().toISOString()
              : new Date(Date.now() + delayMin * 60_000).toISOString(),
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: exhausted ? "failed" : "retry", error: err });
      }
    } catch (e) {
      const attempts = (item.attempts ?? 0) + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      console.error(`wa-outbound-queue item ${item.id} failed:`, e);
      await supabase
        .from("wa_outbound_queue")
        .update({
          status: exhausted ? "failed" : "pending",
          last_error: String(e).slice(0, 500),
          scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        })
        .eq("id", item.id);
      results.push({ id: item.id, status: exhausted ? "failed" : "retry", error: String(e) });
    }
  }

  return json({ ok: true, processed: results.length, results });
});
