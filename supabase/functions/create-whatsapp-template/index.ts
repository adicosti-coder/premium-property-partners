// create-whatsapp-template — trimite spre aprobare un șablon de mesaje WhatsApp
// pe WABA-ul ApArt Hotel by RealTrust. Internal/admin only.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TEMPLATE_NAME = "intake_prospect_apartments";
const TEMPLATE_LANGUAGE = "ro";
const TEMPLATE_BODY =
  "Buna ziua! Va contactam din partea ApArt Hotel / RealTrust Timisoara referitor la solicitarea dvs. imobiliara. Cum va putem ajuta?";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);

  let body: { category?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const category = body.category === "MARKETING" ? "MARKETING" : "UTILITY";

  const url =
    `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

  const payload = {
    name: TEMPLATE_NAME,
    category,
    language: TEMPLATE_LANGUAGE,
    components: [{ type: "BODY", text: TEMPLATE_BODY }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const metaBody = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error(`[create-whatsapp-template] Meta ${resp.status}:`, JSON.stringify(metaBody));
    return json(
      {
        ok: false,
        step: "create_template",
        status: resp.status,
        template: TEMPLATE_NAME,
        category,
        meta_error: metaBody?.error ?? metaBody,
      },
      200,
    );
  }

  // Verificăm statusul real al șablonului (PENDING / APPROVED / REJECTED).
  let status: string | null = metaBody?.status ?? null;
  try {
    const checkUrl =
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,language,category&name=${TEMPLATE_NAME}&limit=10`;
    const checkResp = await fetch(checkUrl, { headers: { Authorization: `Bearer ${token}` } });
    const checkBody = await checkResp.json().catch(() => ({}));
    const match = (checkBody?.data as Array<{ name?: string; status?: string }> | undefined)?.find(
      (t) => t.name === TEMPLATE_NAME,
    );
    if (match?.status) status = match.status;
  } catch {
    /* statusul din răspunsul de creare rămâne valabil */
  }

  return json({
    ok: true,
    template: TEMPLATE_NAME,
    language: TEMPLATE_LANGUAGE,
    category,
    status: status ?? "PENDING",
    meta: metaBody,
  });
});
