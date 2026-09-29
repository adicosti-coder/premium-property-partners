// wa-update-intro-template — creează varianta actualizată a șablonului de prim
// contact (prospect_intro_premium_v4) pornind de la componentele șablonului
// aprobat prospect_intro_premium_v3, cu textul despre randament înlocuit cu o
// formulare bazată pe estimare personalizată. Internal/admin only.
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

const SOURCE_TEMPLATE = "prospect_intro_premium_v3";
const NEW_TEMPLATE = "prospect_intro_premium_v4";

// Formulări vechi (cu/diacritice) → formularea nouă, fără cifra fixă 9,4%.
const OLD_PHRASES = [
  "cu un randament net de circa 9,4% pe an",
  "cu un randament net de circa 9.4% pe an",
];
const NEW_PHRASE = "cu un randament net optimizat in functie de zona si dotari";

function replaceYieldPhrase(text: string): { text: string; replaced: boolean } {
  for (const old of OLD_PHRASES) {
    if (text.includes(old)) {
      return { text: text.split(old).join(NEW_PHRASE), replaced: true };
    }
  }
  // Fallback generic: orice „randament net de circa X% pe an" → formularea nouă.
  const re = /cu un randament net de circa\s+\d+[.,]?\d*%\s*pe an/i;
  if (re.test(text)) {
    return { text: text.replace(re, NEW_PHRASE), replaced: true };
  }
  return { text, replaced: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);

  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;

  // 1. Citim șablonul sursă cu toate componentele.
  const readResp = await fetch(
    `${base}?fields=name,status,language,category,components&name=${SOURCE_TEMPLATE}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const readBody = await readResp.json().catch(() => ({}));
  if (!readResp.ok) {
    return json({ ok: false, step: "read_source", status: readResp.status, meta_error: readBody?.error ?? readBody });
  }
  const source = (readBody?.data as Array<Record<string, unknown>> | undefined)?.find(
    (t) => t.name === SOURCE_TEMPLATE,
  );
  if (!source) {
    return json({ ok: false, step: "read_source", error: "source_template_not_found", source: SOURCE_TEMPLATE });
  }

  // 2. Verificăm dacă varianta nouă există deja.
  const existResp = await fetch(
    `${base}?fields=name,status,language&name=${NEW_TEMPLATE}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const existBody = await existResp.json().catch(() => ({}));
  const existing = (existBody?.data as Array<{ name?: string; status?: string }> | undefined)?.find(
    (t) => t.name === NEW_TEMPLATE,
  );
  if (existing) {
    return json({ ok: true, already_exists: true, template: NEW_TEMPLATE, status: existing.status ?? "PENDING" });
  }

  // 3. Construim componentele noi cu textul înlocuit.
  const components = (source.components as Array<Record<string, unknown>> | undefined) ?? [];
  let anyReplaced = false;
  const newComponents = components.map((comp) => {
    if (comp.type === "BODY" && typeof comp.text === "string") {
      const { text, replaced } = replaceYieldPhrase(comp.text);
      if (replaced) anyReplaced = true;
      return { ...comp, text };
    }
    return comp;
  });

  if (!anyReplaced) {
    return json({
      ok: false,
      step: "build_components",
      error: "yield_phrase_not_found_in_body",
      source_body: components.find((c) => c.type === "BODY")?.text ?? null,
    });
  }

  // 4. Trimitem noul șablon spre aprobare Meta.
  const payload = {
    name: NEW_TEMPLATE,
    category: source.category ?? "MARKETING",
    language: source.language ?? "ro",
    components: newComponents,
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
    new_body: newComponents.find((c) => c.type === "BODY")?.text ?? null,
  });
});
