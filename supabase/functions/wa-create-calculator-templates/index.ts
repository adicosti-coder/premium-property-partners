// Creează (o singură dată) șabloanele Meta pentru cererile calculatorului și
// raportează statusul lor. Doar admin / intern.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { CALC_ALERT_TEMPLATE, CALC_LANG, CALC_VISITOR_TEMPLATE } from "../_shared/calculatorLeadTemplates.ts";

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);
  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const results: unknown[] = [];
  for (const t of [CALC_ALERT_TEMPLATE, CALC_VISITOR_TEMPLATE]) {
    const check = await fetch(`${base}?fields=name,status,language,category,rejected_reason&name=${t.name}&limit=50`, { headers });
    if (!check.ok) { const d = await check.text(); return json({ error: "Meta request failed", status: check.status, details: d }, check.status); }
    const existing = (await check.json()).data?.find((x: any) => x.name === t.name && x.language === CALC_LANG);
    if (existing) { results.push({ template: t.name, existing: true, status: existing.status, category: existing.category, rejected_reason: existing.rejected_reason ?? null }); continue; }
    const r = await fetch(base, { method: "POST", headers, body: JSON.stringify({
      name: t.name, language: CALC_LANG, category: "UTILITY",
      components: [{ type: "BODY", text: t.body, example: { body_text: [t.example] } }],
    }) });
    const text = await r.text();
    if (!r.ok) { results.push({ template: t.name, error: "Meta request failed", status: r.status, details: text }); continue; }
    const res = JSON.parse(text);
    results.push({ template: t.name, created: true, id: res.id, status: res.status ?? "PENDING", category: res.category ?? "UTILITY" });
  }
  return json({ ok: true, results });
});
