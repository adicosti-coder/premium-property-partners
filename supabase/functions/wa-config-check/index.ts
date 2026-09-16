// wa-config-check — diagnostic intern: verifică dacă tokenul Meta și Phone Number ID
// sunt valide. Internal-only (service role / cron secret). Nu returnează secrete.
import { isInternalCall } from "../_shared/cronAuth.ts";
import { WA_PHONE_NUMBER_ID, WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION } from "../_shared/waConfig.ts";
import { makeWebhookUrl, relayToMake } from "../_shared/makeRelay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret, x-check-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isInternalCall(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Test opțional al webhook-ului Make.com: ?test_make=1
  const reqUrl = new URL(req.url);
  if (reqUrl.searchParams.get("test_make") === "1") {
    const relay = await relayToMake("wa_relay_test", { note: "test din Admin" });
    return new Response(
      JSON.stringify({ make_configured: !!makeWebhookUrl(), relay }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const token = Deno.env.get("META_PERMANENT_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  const phoneId = WA_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return new Response(
      JSON.stringify({
        ok: false,
        has_token: !!token,
        has_phone_number_id: !!phoneId,
        reason: "missing_credentials",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url =
    `https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,platform_type`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await resp.json().catch(() => ({}));

  // Câmpurile la care aplicația e abonată pe contul WhatsApp Business.
  // Fără „messages” nu primim nici mesajele clienților, nici confirmările
  // de livrare/citire — de aceea le raportăm explicit aici.
  let subscribedFields: string[] | undefined;
  let subsError: string | undefined;
  try {
    const subsResp = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const subsBody = await subsResp.json().catch(() => ({}));
    if (subsResp.ok) {
      subscribedFields = (subsBody?.data ?? []).flatMap(
        (a: { whatsapp_business_api_data?: { subscribed_fields?: string[] } }) =>
          a?.whatsapp_business_api_data?.subscribed_fields ?? [],
      );
    } else {
      subsError = subsBody?.error?.message ?? `http_${subsResp.status}`;
    }
  } catch (e) {
    subsError = e instanceof Error ? e.message : String(e);
  }

  return new Response(
    JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      phone: resp.ok ? body : undefined,
      subscribed_fields: subscribedFields,
      subscribed_fields_error: subsError,
      error: resp.ok ? undefined : body?.error?.message ?? "unknown_error",
    }),
    { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
