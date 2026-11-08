// Trimite spre aprobare Meta șablonul primului mesaj către proprietari (3 butoane).
// Doar admin / apel intern. Nu modifică șabloanele existente.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { WA_OWNER_OUTREACH_TEMPLATE, WA_OWNER_OUTREACH_LANGUAGE, WA_OWNER_OUTREACH_COMPONENTS } from "../_shared/waOwnerOutreachTemplate.ts";

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
    const check = await fetch(`${base}?fields=name,status,language,category,components,rejected_reason&limit=100&name=${WA_OWNER_OUTREACH_TEMPLATE}`, { headers });
    if (!check.ok) {
      const details = await check.text();
      console.error("Owner outreach template check failed", check.status, details);
      return json({ error: "Meta request failed", status: check.status, details }, check.status);
    }
    const existing = (await check.json()).data?.find((t: { name?: string; language?: string }) =>
      t.name === WA_OWNER_OUTREACH_TEMPLATE && t.language === WA_OWNER_OUTREACH_LANGUAGE);
    if (existing) return json({ ok: true, existing: true, template: existing.name, status: existing.status, rejected_reason: existing.rejected_reason ?? null });
    const response = await fetch(base, { method: "POST", headers, body: JSON.stringify({
      name: WA_OWNER_OUTREACH_TEMPLATE, language: WA_OWNER_OUTREACH_LANGUAGE,
      category: "MARKETING", components: WA_OWNER_OUTREACH_COMPONENTS,
    }) });
    if (!response.ok) {
      const details = await response.text();
      console.error("Owner outreach template creation failed", response.status, details);
      return json({ error: "Meta request failed", status: response.status, details }, response.status);
    }
    const result = await response.json();
    return json({ ok: true, template: WA_OWNER_OUTREACH_TEMPLATE, status: result.status ?? "PENDING", id: result.id ?? null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Meta request failed" }, 502);
  }
});
