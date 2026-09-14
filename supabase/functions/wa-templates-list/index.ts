// wa-templates-list — listează șabloanele WhatsApp aprobate pe WABA. Internal/admin only.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const token = waToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "missing_credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url =
    `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,language,category&limit=100`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await resp.json().catch(() => ({}));

  return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, body }), {
    status: resp.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
