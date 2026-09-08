// wa-config-check — diagnostic intern: verifică dacă tokenul Meta și Phone Number ID
// sunt valide. Internal-only (service role / cron secret). Nu returnează secrete.
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const checkSecret = Deno.env.get("WA_CONFIG_CHECK_SECRET") || "";
  const provided = req.headers.get("x-check-secret") || "";
  const secretOk = !!checkSecret && provided === checkSecret;

  if (!secretOk && !(await isInternalCall(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

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

  return new Response(
    JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      phone: resp.ok ? body : undefined,
      error: resp.ok ? undefined : body?.error?.message ?? "unknown_error",
    }),
    { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
