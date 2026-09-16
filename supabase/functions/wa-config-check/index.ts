// wa-config-check — diagnostic intern: verifică dacă tokenul Meta și Phone Number ID
// sunt valide. Internal-only (service role / cron secret). Nu returnează secrete.
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_PHONE_NUMBER_ID, WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION } from "../_shared/waConfig.ts";
import { makeWebhookUrl, relayToMake } from "../_shared/makeRelay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret, x-check-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

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

  // ?subscribe=1 → (re)abonează aplicația la contul WhatsApp Business, ca să
  // primim mesajele clienților ȘI confirmările de livrare/citire.
  if (reqUrl.searchParams.get("subscribe") === "1" && token) {
    const subResp = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    );
    const subBody = await subResp.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ ok: subResp.ok, status: subResp.status, result: subBody }),
      { status: subResp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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

  // Aplicația Meta căreia îi aparține tokenul — ca să știm exact în care
  // aplicație trebuie bifate câmpurile webhook.
  let app: { id?: string; name?: string } | undefined;
  try {
    const appResp = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/app?fields=id,name&access_token=${encodeURIComponent(token)}`,
    );
    const appBody = await appResp.json().catch(() => ({}));
    if (appResp.ok) app = { id: appBody?.id, name: appBody?.name };
  } catch { /* diagnostic opțional */ }

  console.log(
    `[wa-config-check] ok=${resp.ok} quality=${body?.quality_rating ?? "?"} subscribed_fields=${
      JSON.stringify(subscribedFields ?? null)
    } app=${app?.id ?? "?"} subs_error=${subsError ?? "-"}`,
  );

  return new Response(
    JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      phone: resp.ok ? body : undefined,
      subscribed_fields: subscribedFields,
      subscribed_fields_error: subsError,
      meta_app: app,
      error: resp.ok ? undefined : body?.error?.message ?? "unknown_error",
    }),
    { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
