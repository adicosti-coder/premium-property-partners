import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  mode: "single" | "briefing";
  leadId?: string;
  forceRefresh?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.mode === "single") {
      if (!body.leadId) {
        return new Response(JSON.stringify({ error: "leadId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: lead } = await sb.from("scraper_leads").select("*").eq("id", body.leadId).maybeSingle();
      if (!lead) {
        return new Response(JSON.stringify({ error: "Lead not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cache: re-use insight if generated in last 24h, unless forceRefresh
      const cacheValid = lead.ai_insight && lead.ai_insight_generated_at &&
        (Date.now() - new Date(lead.ai_insight_generated_at).getTime()) < 24 * 60 * 60 * 1000;
      if (cacheValid && !body.forceRefresh) {
        return new Response(JSON.stringify({ insight: lead.ai_insight, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insight = await generateInsight(lead, LOVABLE_API_KEY);
      await sb.from("scraper_leads").update({
        ai_insight: insight,
        ai_insight_generated_at: new Date().toISOString(),
      }).eq("id", body.leadId);

      return new Response(JSON.stringify({ insight, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.mode === "briefing") {
      const { data: leads } = await sb.from("scraper_leads")
        .select("*")
        .neq("status", "archived")
        .neq("status", "rejected")
        .neq("status", "converted")
        .order("lead_score", { ascending: false })
        .limit(5);

      const briefing = await generateBriefing(leads || [], LOVABLE_API_KEY);
      return new Response(JSON.stringify({ briefing, leads: leads || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("AI insight error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateInsight(lead: any, apiKey: string) {
  const prompt = `Analizează acest lead imobiliar din Timișoara și returnează o evaluare strategică în JSON.

Date lead:
- Titlu: ${lead.title}
- Preț: ${lead.original_price} EUR
- Tip: ${lead.listing_type}
- Scor algoritmic: ${lead.lead_score}/100
- Profit estimat 3 ani: ${lead.extra_profit_3y} EUR
- Profit lunar extra: ${lead.monthly_extra} EUR
- Sursă: ${lead.source}
- Categorie prospect: ${lead.prospect_category || "necunoscut"}
- Telefon: ${lead.phone || "nu"}
- Note admin: ${lead.admin_notes || "nu"}

Răspunde EXCLUSIV cu obiect JSON cu această structură:
{
  "priority": "hot" | "warm" | "cold",
  "priorityReason": "motivul prioritizării (max 1 frază)",
  "strengths": ["3 puncte forte concise"],
  "concerns": ["1-2 riscuri sau întrebări de clarificat"],
  "approach": "abordarea recomandată (max 2 fraze, ton consultativ)",
  "personalizedMessage": "mesaj WhatsApp personalizat în română, ton premium concierge, max 4 paragrafe scurte cu emoji-uri relevante, focus pe valoare pentru proprietar",
  "nextAction": "următoarea acțiune concretă (max 1 frază)"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești un expert în vânzări imobiliare premium pentru RealTrust ApartHotel din Timișoara. Răspunzi exclusiv cu JSON valid, fără text suplimentar." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`AI gateway ${response.status}: ${txt}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

async function generateBriefing(leads: any[], apiKey: string) {
  if (leads.length === 0) {
    return { summary: "Nu există lead-uri active de analizat astăzi.", topPicks: [], dailyFocus: "Lansează un scan nou pentru a aduce oportunități proaspete." };
  }

  const summary = leads.map((l, i) => `${i + 1}. "${l.title}" — ${l.original_price}€ — scor ${l.lead_score} — ${l.listing_type} — ${l.source}`).join("\n");
  const prompt = `Sunt manager RealTrust ApartHotel Timișoara. Iată top 5 lead-uri active:

${summary}

Returnează un briefing zilnic în JSON cu această structură:
{
  "summary": "rezumat strategic (2-3 fraze) despre starea pipeline-ului azi",
  "topPicks": [{"index": 1, "reason": "de ce e prioritar (max 1 frază)"}],
  "dailyFocus": "obiectivul zilei (max 1 frază)",
  "warnings": ["1-2 alerte sau riscuri observate, dacă există"]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești un strateg de vânzări imobiliare. Răspunzi exclusiv JSON valid." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { summary: content };
  }
}
