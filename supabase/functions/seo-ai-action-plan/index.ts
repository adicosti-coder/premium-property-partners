// AI action plan per opportunity: Gemini generates suggested title, meta, and 3 concrete actions.
// Cached on the opportunity row (ai_generated_at) to avoid recomputing within 7 days.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 503);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "Invalid token" }, 401);
    const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const opportunityId: string = body?.opportunity_id;
    const force: boolean = body?.force === true;
    if (!opportunityId) return json({ error: "opportunity_id required" }, 400);

    const { data: opp, error: oppErr } = await sb.from("seo_opportunities").select("*").eq("id", opportunityId).maybeSingle();
    if (oppErr || !opp) return json({ error: "Opportunity not found" }, 404);

    // Cache: skip if ai_generated_at within 7 days
    if (!force && opp.ai_generated_at) {
      const ageMs = Date.now() - new Date(opp.ai_generated_at).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000 && opp.ai_actions) {
        return json({ success: true, cached: true, opportunity: opp });
      }
    }

    // Pull current page audit (for context)
    let audit: any = null;
    if (opp.page) {
      const { data: a } = await sb.from("seo_page_audits").select("*").eq("page", opp.page).maybeSingle();
      audit = a;
    }

    const prompt = `Ești expert SEO pentru piața imobiliară din Timișoara, România. Generează un plan de acțiune SEO concret în limba română pentru această oportunitate.

Tip oportunitate: ${opp.type}
${opp.query ? `Query: "${opp.query}"` : ""}
${opp.page ? `Pagina: ${opp.page}` : ""}
${opp.current_position ? `Poziție actuală: ${opp.current_position}` : ""}
${opp.current_clicks != null ? `Clickuri actuale: ${opp.current_clicks}` : ""}
${opp.current_impressions != null ? `Impresii: ${opp.current_impressions}` : ""}
${opp.current_ctr != null ? `CTR actual: ${(Number(opp.current_ctr) * 100).toFixed(2)}%` : ""}
${opp.potential_clicks ? `Potențial câștig: ${opp.potential_clicks} clickuri/lună` : ""}
${opp.details ? `Context: ${JSON.stringify(opp.details)}` : ""}
${audit ? `\nAudit pagină actuală:\nTitle: ${audit.title}\nMeta: ${audit.meta_description}\nH1: ${audit.h1}\nWord count: ${audit.word_count}\nSchema: ${(audit.schema_types || []).join(", ") || "fără"}\nIssues: ${(audit.issues || []).map((i: any) => i.message).join("; ")}` : ""}

Reguli copywriting:
- Title 50-60 caractere, include keyword principal + brand "RealTrust" sau locație "Timișoara"
- Meta description 140-160 caractere, include CTA și USP (regim hotelier, ROI 9.4%, etc)
- 3 acțiuni concrete și executabile (ex: "Adaugă secțiune FAQ despre X", "Internal link de pe /pagina-y către /pagina-z")

Output STRICT JSON:
{
  "title": "...",
  "meta": "...",
  "actions": [
    {"priority": "high|medium|low", "category": "content|technical|internal_link|schema|cta", "action": "...", "expected_impact": "..."},
    ...
  ],
  "reasoning": "1-2 propoziții despre de ce vor funcționa"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Răspunzi DOAR cu JSON valid în limba română. Niciun text în afara JSON-ului." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: `AI error ${aiRes.status}`, details: txt }, 502);
    }
    const aiData = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiData.choices[0].message.content); } catch (_) {}

    const update = {
      ai_title: parsed.title || null,
      ai_meta: parsed.meta || null,
      ai_actions: parsed.actions || parsed,
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: updated } = await sb.from("seo_opportunities").update(update).eq("id", opportunityId).select().maybeSingle();

    return json({ success: true, cached: false, opportunity: updated, reasoning: parsed.reasoning });
  } catch (e) {
    console.error("seo-ai-action-plan", e);
    return json({ error: (e as Error).message }, 500);
  }
});
