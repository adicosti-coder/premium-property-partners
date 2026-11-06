import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { calculatorEmailReceipt, verifyCalculatorEmailWebhook } from "../_shared/calculatorEmailDelivery.ts";

const EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.suppressed",
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function resendRequest(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}: ${body.slice(0, 250)}`);
  return JSON.parse(body || "{}");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  if (raw.length > 1_000_000) return json({ error: "Payload too large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (payload.action === "setup") {
    const denied = await requireInternalOrAdmin(req, corsHeaders);
    if (denied) return denied;
    try {
      const endpoint = `${supabaseUrl}/functions/v1/calculator-email-webhook`;
      const listed = await resendRequest("/webhooks");
      const existing = (listed.data ?? []).find((item: { endpoint?: string }) => item.endpoint === endpoint);
      let webhookId = existing?.id as string | undefined;
      if (webhookId) {
        await resendRequest(`/webhooks/${webhookId}`, {
          method: "PATCH",
          body: JSON.stringify({ endpoint, events: EVENTS, status: "enabled" }),
        });
      } else {
        const created = await resendRequest("/webhooks", {
          method: "POST",
          body: JSON.stringify({ endpoint, events: EVENTS }),
        });
        webhookId = created.id;
      }
      if (!webhookId) return json({ error: "Webhook setup incomplete" }, 502);
      const details = await resendRequest(`/webhooks/${webhookId}`);
      if (typeof details.signing_secret !== "string" || !details.signing_secret.startsWith("whsec_")) {
        return json({ error: "Webhook signing secret unavailable" }, 502);
      }
      const { error } = await admin.rpc("store_calculator_email_webhook_secret", { p_secret: details.signing_secret });
      if (error) return json({ error: "Webhook secret could not be stored" }, 500);
      return json({ ok: true, configured: true });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message.slice(0, 400) : "Webhook setup failed" }, 502);
    }
  }

  const { data: secret, error: secretError } = await admin.rpc("get_calculator_email_webhook_secret");
  if (secretError || !secret) return json({ error: "Webhook not configured" }, 503);
  const valid = await verifyCalculatorEmailWebhook(raw, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  }, secret);
  if (!valid) return json({ error: "Invalid signature" }, 401);

  const receipt = calculatorEmailReceipt(
    typeof payload.type === "string" ? payload.type : "",
    payload.data as Record<string, unknown> | undefined,
  );
  if (!receipt) return json({ ok: true, ignored: true });
  const { error } = await admin.rpc("record_calculator_email_receipt", {
    p_message_id: receipt.messageId,
    p_status: receipt.status,
    p_error: receipt.error,
  });
  if (error) return json({ error: "Receipt could not be saved" }, 500);
  return json({ ok: true });
});
