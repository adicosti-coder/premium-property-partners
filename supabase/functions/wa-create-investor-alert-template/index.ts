// Creates (once) the Meta template „alerta_investitor_oportunitate” with the 8 body
// variables used by investor-opportunity-alerts. Admin/internal only. Returns Meta status.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";

const NAME = "alerta_investitor_oportunitate";
const LANG = "ro";
const BODY = [
  "Bună ziua! Am găsit o nouă oportunitate de investiție în Timișoara, conform alertei la care v-ați abonat pe realtrust.ro.",
  "",
  "Zonă: {{1}}",
  "Proprietate: {{2}}",
  "Preț cerut: {{3}}",
  "Preț pe metru pătrat: {{4}}",
  "Scor oportunitate: {{5}} din 100",
  "Sub media zonei cu: {{6}}",
  "Venit estimat în regim hotelier: {{7}}",
  "",
  "Vedeți analiza completă, cu preț țintă și argumente de negociere: {{8}}",
  "",
  "Pentru detalii răspundeți la acest mesaj. Dacă nu mai doriți alerte, răspundeți STOP.",
].join("\n");
const EXAMPLE = ["Iosefin", "Apartament 2 camere", "89.000 €", "1.620 €/m²", "86", "18%", "697 €/lună",
  "https://realtrust.ro/analiza-anunt?url=https%3A%2F%2Fwww.storia.ro%2Fro%2Foferta%2Fexemplu"];

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
  try {
    const check = await fetch(`${base}?fields=name,status,language,category,rejected_reason&name=${NAME}&limit=50`, { headers });
    if (!check.ok) { const d = await check.text(); console.error("check failed", check.status, d); return json({ error: "Meta request failed", status: check.status, details: d }, check.status); }
    const existing = (await check.json()).data?.find((t: any) => t.name === NAME && t.language === LANG);
    if (existing) return json({ ok: true, existing: true, template: NAME, status: existing.status, category: existing.category, rejected_reason: existing.rejected_reason ?? null });
    const r = await fetch(base, { method: "POST", headers, body: JSON.stringify({
      name: NAME, language: LANG, category: "MARKETING",
      components: [{ type: "BODY", text: BODY, example: { body_text: [EXAMPLE] } }],
    }) });
    const text = await r.text();
    if (!r.ok) { console.error("create failed", r.status, text); return json({ error: "Meta request failed", status: r.status, details: text }, r.status); }
    const res = JSON.parse(text);
    return json({ ok: true, created: true, template: NAME, id: res.id, status: res.status ?? "PENDING", category: res.category ?? "MARKETING" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Meta request failed" }, 502);
  }
});
