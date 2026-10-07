import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { WA_PUBLISH_CONSENT_TEMPLATE, WA_PUBLISH_CONSENT_LANGUAGE, WA_PUBLISH_CONSENT_COMPONENTS } from "../_shared/waPublishConsentTemplate.ts";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);
  try {
    const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const check = await fetch(`${base}?fields=name,status,language,category,components&name=${WA_PUBLISH_CONSENT_TEMPLATE}&limit=100`, { headers });
    if (!check.ok) {
      const details = await check.text();
      console.error("Consent template check failed", check.status, details);
      return json({ error: "Meta request failed", status: check.status, details }, check.status);
    }
    const existing = (await check.json()).data?.find((t: { name?: string; language?: string }) =>
      t.name === WA_PUBLISH_CONSENT_TEMPLATE && t.language === WA_PUBLISH_CONSENT_LANGUAGE);
    if (existing) return json({ ok: true, existing: true, template: existing.name, status: existing.status, category: existing.category, components: existing.components });
    const response = await fetch(base, { method: "POST", headers, body: JSON.stringify({
      name: WA_PUBLISH_CONSENT_TEMPLATE, language: WA_PUBLISH_CONSENT_LANGUAGE,
      category: "MARKETING", components: WA_PUBLISH_CONSENT_COMPONENTS,
    }) });
    if (!response.ok) {
      const details = await response.text();
      console.error("Consent template creation failed", response.status, details);
      return json({ error: "Meta request failed", status: response.status, details }, response.status);
    }
    const result = await response.json();
    return json({ ok: true, template: WA_PUBLISH_CONSENT_TEMPLATE, status: result.status ?? "PENDING", category: "MARKETING" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Meta request failed" }, 502);
  }
});