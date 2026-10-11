// Trimite la aprobare Meta șablonul de reverificare a disponibilității. Internal/admin only.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NAME = "reverificare_disponibilitate_v1";
const BODY = "Bună ziua! Am observat că anunțul dumneavoastră pentru proprietatea din {{1}} nu mai apare pe portaluri. Mai este valabilă pentru închiriere/vânzare? Vă mulțumesc! - RealTrust";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);
  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
  const r = await fetch(base, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: NAME, category: "UTILITY", language: "ro",
      components: [{ type: "BODY", text: BODY, example: { body_text: [["Iosefin"]] } }],
    }),
  });
  const meta = await r.json().catch(() => ({}));
  return json({ ok: r.ok, status: r.status, meta });
});
