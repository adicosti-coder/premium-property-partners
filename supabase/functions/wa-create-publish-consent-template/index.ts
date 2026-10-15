import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { WA_PUBLISH_CONSENT_TEMPLATE, WA_PUBLISH_CONSENT_LANGUAGE, WA_PUBLISH_CONSENT_BODY, WA_PUBLISH_CONSENT_COMPONENTS } from "../_shared/waPublishConsentTemplate.ts";

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
    const check = await fetch(`${base}?fields=name,status,language,category,components,id&limit=100&name=${WA_PUBLISH_CONSENT_TEMPLATE}`, { headers });
    if (!check.ok) {
      const details = await check.text();
      console.error("Consent template check failed", check.status, details);
      return json({ error: "Meta request failed", status: check.status, details }, check.status);
    }
    const existing = (await check.json()).data?.find((t: { name?: string; language?: string }) =>
      t.name === WA_PUBLISH_CONSENT_TEMPLATE && t.language === WA_PUBLISH_CONSENT_LANGUAGE);
    if (existing) {
      const currentBody = existing.components?.find((c: { type?: string; text?: string }) => c.type === "BODY")?.text ?? "";
      if (currentBody === WA_PUBLISH_CONSENT_BODY) {
        return json({ ok: true, existing: true, template: existing.name, status: existing.status, category: existing.category, components: existing.components });
      }
      // Corpul dorit s-a schimbat (ex: „DA” → „CONFIRM”): trimitem editarea spre
      // aprobare. Versiunea aprobată în prezent rămâne funcțională până atunci.
      if (existing.status !== "APPROVED") {
        return json({ ok: true, existing: true, template: existing.name, status: existing.status, note: "edit_in_review" });
      }
      const edit = await fetch(`${base}/${existing.id}`, {
        method: "POST", headers,
        body: JSON.stringify({ components: WA_PUBLISH_CONSENT_COMPONENTS, category: existing.category || "MARKETING" }),
      });
      if (!edit.ok) {
        const details = await edit.text();
        console.error("Consent template edit failed", edit.status, details);
        return json({ error: "Meta request failed", status: edit.status, details }, edit.status);
      }
      const result = await edit.json();
      return json({ ok: true, edited: true, template: existing.name, status: result.status ?? "PENDING" });
    }
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