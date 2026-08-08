// wa-andrei-send — trimite mesaje WhatsApp via Meta Cloud API.
// Internal-only: cere header x-internal-secret === WA_ANDREI_INTERNAL_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeEq(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const internalSecret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  const provided = req.headers.get("x-internal-secret") || "";
  if (!internalSecret || !timingSafeEq(internalSecret, provided)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) {
    return new Response(JSON.stringify({ error: "WhatsApp credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: {
    conversation_id?: string;
    text?: string;
    template_name?: string;
    template_params?: string[];
    template_language?: string;
  } = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const conversationId = (body.conversation_id || "").trim();
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: conv, error: convErr } = await supabase
    .from("wa_conversations")
    .select("id, phone_normalized, window_expires_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const now = Date.now();
  const windowOpen = conv.window_expires_at && new Date(conv.window_expires_at).getTime() > now;
  const useTemplate = !!body.template_name;

  if (!useTemplate && !windowOpen) {
    await supabase.from("wa_conversations")
      .update({ status: "awaiting_human", handoff_reason: "outside_24h_window_no_template" })
      .eq("id", conversationId);
    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      role: "system",
      content: "[skipped: outside 24h window, no template]",
      error: "outside_24h_window_no_template",
    });
    return new Response(JSON.stringify({ error: "outside_24h_window_no_template" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Meta phone number format: no leading '+'
  const toNumber = conv.phone_normalized.replace(/^\+/, "");

  let waBody: Record<string, unknown>;
  if (useTemplate) {
    waBody = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "template",
      template: {
        name: body.template_name,
        language: { code: body.template_language || "ro" },
        ...(body.template_params && body.template_params.length > 0
          ? {
              components: [{
                type: "body",
                parameters: body.template_params.map((p) => ({ type: "text", text: p })),
              }],
            }
          : {}),
      },
    };
  } else {
    waBody = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: { preview_url: false, body: body.text || "" },
    };
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  // Retries automatically on Meta rate limits (429) and 5xx, max 3 attempts.
  const waResp = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waBody),
    },
    { label: "meta-wa-send", maxAttempts: 3 },
  );

  let waJson: any = {};
  try { waJson = JSON.parse(waResp.body); } catch { waJson = {}; }

  if (!waResp.ok) {
    const errMsg = (waResp.body || waResp.error || "").slice(0, 500);
    console.error(`WhatsApp send failed [${waResp.status}] after ${waResp.attempts} attempt(s): ${errMsg}`);
    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      role: "system",
      content: body.text || `[template:${body.template_name}]`,
      template_name: body.template_name || null,
      error: `meta_${waResp.status} (${waResp.attempts} attempts): ${errMsg}`,
    });
    return new Response(
      JSON.stringify({ error: "meta_api_error", status: waResp.status, attempts: waResp.attempts, details: waJson }),
      { status: waResp.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const waMsgId = waJson?.messages?.[0]?.id || null;


  await supabase.from("wa_messages").insert({
    conversation_id: conversationId,
    wa_message_id: waMsgId,
    direction: "outbound",
    role: "assistant",
    content: body.text || `[template:${body.template_name}]`,
    template_name: body.template_name || null,
  });

  await supabase.from("wa_conversations")
    .update({ last_outbound_at: new Date().toISOString() })
    .eq("id", conversationId);

  return new Response(JSON.stringify({ ok: true, wa_message_id: waMsgId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
