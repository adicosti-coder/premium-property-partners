import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   AI Lead Scorer for prospect_listings.
   - Triggered by DB after INSERT (or manually via API).
   - Reads description/title/price/location → asks Gemini for
     a 0-100 lead_score + breakdown + category suggestion.
   - Writes back lead_score, ai_score_breakdown, category, ai_scored_at.
   - If score > 80 and lifecycle_status='new', the existing AFTER
     UPDATE trigger fires the auto-dial automatically.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const prospectId = body.prospect_id || body.id;
    const force = body.force === true;

    if (!prospectId) {
      return new Response(JSON.stringify({ error: "prospect_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prospect, error: fetchErr } = await supabase
      .from("prospect_listings")
      .select("id, title, description, price, currency, location, zone, rooms, size, year_built, prospect_type, contact_name, ai_scored_at, source_platform")
      .eq("id", prospectId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!prospect) {
      return new Response(JSON.stringify({ error: "prospect not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prospect.ai_scored_at && !force) {
      return new Response(JSON.stringify({ skipped: "already scored", id: prospectId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Analizează acest anunț imobiliar din Timișoara (sau zonă) extras de scraper-ul nostru și scorează-l ca lead pentru agenția RealTrust.

DATE ANUNȚ:
- Titlu: ${prospect.title || "?"}
- Tip: ${prospect.prospect_type || "?"}
- Locație: ${prospect.location || "?"} (zonă: ${prospect.zone || "?"})
- Preț: ${prospect.price || "?"} ${prospect.currency || "EUR"}
- Camere: ${prospect.rooms || "?"} | Suprafață: ${prospect.size || "?"} mp | An: ${prospect.year_built || "?"}
- Sursă: ${prospect.source_platform || "?"}
- Contact afișat: ${prospect.contact_name || "necunoscut"}
- Descriere: ${(prospect.description || "").slice(0, 1500)}

Scorează 0-100 în funcție de:
1. Potențial conversie (proprietar direct >> agenție; lipsă agenție = +30)
2. Pretabilitate regim hotelier (centru, 1-3 cam, mobilat = +20)
3. Preț sub-pieței / urgență (cuvinte: "urgent", "negociabil", "preț scăzut" = +15)
4. Calitate descriere (dacă e foarte vagă, poate fi semnal de proprietar netehnic = +5; dacă e copy generic agenție = -20)
5. Date contact directe disponibile (+10)

Returnează prin tool calling.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ești expert în scoring lead-uri imobiliare pentru agenții premium din Timișoara. Răspunzi STRICT prin tool calling, niciodată text liber." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_lead_score",
            description: "Submit lead scoring analysis",
            parameters: {
              type: "object",
              properties: {
                lead_score: { type: "integer", minimum: 0, maximum: 100, description: "Scor 0-100" },
                category: { type: "string", enum: ["vanzare", "inchiriere", "hotelier"], description: "Categoria detectată" },
                is_owner_direct: { type: "boolean", description: "True dacă pare proprietar direct, false dacă e agenție" },
                hotel_potential: { type: "integer", minimum: 0, maximum: 100, description: "Potențial regim hotelier 0-100" },
                urgency_signals: { type: "array", items: { type: "string" }, description: "Cuvinte cheie de urgență detectate" },
                reasoning: { type: "string", description: "Explicație 1-2 propoziții" },
                recommended_pitch: { type: "string", description: "Sugestie de abordare pentru apel (1 propoziție)" },
              },
              required: ["lead_score", "category", "is_owner_direct", "hotel_potential", "reasoning", "recommended_pitch"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_lead_score" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited", retry: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required - add credits to Lovable AI workspace" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Invalid JSON in tool call");
    }

    const leadScore = Math.max(0, Math.min(100, parseInt(parsed.lead_score) || 0));

    const { error: updErr } = await supabase
      .from("prospect_listings")
      .update({
        lead_score: leadScore,
        score: leadScore, // mirror to legacy column
        category: parsed.category,
        ai_score_breakdown: {
          is_owner_direct: parsed.is_owner_direct,
          hotel_potential: parsed.hotel_potential,
          urgency_signals: parsed.urgency_signals || [],
          reasoning: parsed.reasoning,
          recommended_pitch: parsed.recommended_pitch,
          model: "google/gemini-2.5-flash",
        },
        ai_scored_at: new Date().toISOString(),
      })
      .eq("id", prospectId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      success: true,
      prospect_id: prospectId,
      lead_score: leadScore,
      category: parsed.category,
      will_auto_call: leadScore > 80,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("prospect-ai-scorer error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
