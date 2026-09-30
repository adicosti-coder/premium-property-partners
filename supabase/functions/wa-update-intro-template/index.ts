// wa-update-intro-template — creează varianta v6 a șablonului de prim contact,
// cu zonă dinamică și răspunsuri rapide pentru cele trei tipuri de colaborare.
// Internal/admin only.
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

const NEW_TEMPLATE = "prospect_intro_premium_v6";
const TEMPLATE_LANGUAGE = "ro";
const TEMPLATE_BODY =
  "Bună ziua! Am văzut anunțul dumneavoastră pentru apartamentul din {{1}}. Sunt Andrei de la RealTrust Timișoara. Vă propunem o colaborare în vederea vânzării, respectiv a închirierii (în sistem clasic sau în regim hotelier, pentru un randament maxim). Vă pot trimite o evaluare gratuită de preț și chirie pentru apartamentul dumneavoastră?";
const TEMPLATE_COMPONENTS = [
  {
    type: "BODY",
    text: TEMPLATE_BODY,
    example: { body_text: [["Zona centrală"]] },
  },
  {
    type: "BUTTONS",
    buttons: [
      { type: "QUICK_REPLY", text: "Colaborare vânzare" },
      { type: "QUICK_REPLY", text: "Închiriere clasică" },
      { type: "QUICK_REPLY", text: "Regim hotelier" },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);

  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

  // 1. Verificăm dacă varianta nouă există deja. Nu o ștergem: o cerere aflată
  // deja la verificare trebuie lăsată intactă, iar funcția rămâne idempotentă.
  const existResp = await fetch(
    `${base}?fields=name,status,language,category,components&name=${NEW_TEMPLATE}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const existBody = await existResp.json().catch(() => ({}));
  if (!existResp.ok) {
    return json({ ok: false, step: "check_existing", status: existResp.status, meta_error: existBody?.error ?? existBody });
  }
  const existing = (existBody?.data as Array<Record<string, unknown>> | undefined)?.find(
    (t) => t.name === NEW_TEMPLATE,
  );
  if (existing) {
    return json({
      ok: true,
      existing: true,
      template: NEW_TEMPLATE,
      language: existing.language ?? TEMPLATE_LANGUAGE,
      category: existing.category ?? "MARKETING",
      status: existing.status ?? "UNKNOWN",
    });
  }

  // 2. Trimitem noul șablon spre aprobare Meta.
  const payload = {
    name: NEW_TEMPLATE,
    category: "MARKETING",
    language: TEMPLATE_LANGUAGE,
    components: TEMPLATE_COMPONENTS,
  };
  const createResp = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const createBody = await createResp.json().catch(() => ({}));
  if (!createResp.ok) {
    console.error(`[wa-update-intro-template] Meta ${createResp.status}:`, JSON.stringify(createBody));
    return json({ ok: false, step: "create_template", status: createResp.status, meta_error: createBody?.error ?? createBody });
  }

  return json({
    ok: true,
    template: NEW_TEMPLATE,
    language: payload.language,
    category: payload.category,
    status: createBody?.status ?? "PENDING",
    new_body: TEMPLATE_BODY,
  });
});
