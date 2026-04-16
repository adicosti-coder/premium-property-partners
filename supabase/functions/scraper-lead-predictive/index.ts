import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  mode: "single" | "batch";
  leadId?: string;
  limit?: number;
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

    // Build market context from existing leads (median price per neighborhood + listing_type)
    const { data: marketLeads } = await sb
      .from("scraper_leads")
      .select("neighborhood_slug, listing_type, original_price")
      .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString());

    const marketStats = computeMarketStats(marketLeads || []);

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

      const cacheValid = lead.prediction_generated_at &&
        (Date.now() - new Date(lead.prediction_generated_at).getTime()) < 24 * 60 * 60 * 1000;
      if (cacheValid && !body.forceRefresh) {
        return new Response(JSON.stringify({
          cached: true,
          prediction: {
            conversion_probability: lead.conversion_probability,
            predicted_market_value: lead.predicted_market_value,
            undervaluation_percent: lead.undervaluation_percent,
            prediction_reasoning: lead.prediction_reasoning,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const prediction = await predict(lead, marketStats, LOVABLE_API_KEY);
      await sb.from("scraper_leads").update({
        conversion_probability: prediction.conversion_probability,
        predicted_market_value: prediction.predicted_market_value,
        undervaluation_percent: prediction.undervaluation_percent,
        prediction_reasoning: prediction.prediction_reasoning,
        prediction_generated_at: new Date().toISOString(),
      }).eq("id", body.leadId);

      return new Response(JSON.stringify({ cached: false, prediction }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.mode === "batch") {
      // Process top N active leads without recent prediction
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: leads } = await sb.from("scraper_leads")
        .select("*")
        .neq("status", "archived")
        .neq("status", "rejected")
        .neq("status", "converted")
        .or(`prediction_generated_at.is.null,prediction_generated_at.lt.${cutoff}`)
        .order("lead_score", { ascending: false })
        .limit(body.limit || 10);

      let processed = 0;
      const results: any[] = [];
      for (const lead of leads || []) {
        try {
          const prediction = await predict(lead, marketStats, LOVABLE_API_KEY);
          await sb.from("scraper_leads").update({
            conversion_probability: prediction.conversion_probability,
            predicted_market_value: prediction.predicted_market_value,
            undervaluation_percent: prediction.undervaluation_percent,
            prediction_reasoning: prediction.prediction_reasoning,
            prediction_generated_at: new Date().toISOString(),
          }).eq("id", lead.id);
          processed++;
          results.push({ id: lead.id, ...prediction });
        } catch (e: any) {
          console.error("Predict failed", lead.id, e?.message);
        }
      }

      return new Response(JSON.stringify({ processed, total: leads?.length || 0, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Predictive error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function computeMarketStats(leads: any[]) {
  const buckets: Record<string, number[]> = {};
  for (const l of leads) {
    if (!l.original_price || l.original_price <= 0) continue;
    const key = `${l.neighborhood_slug || "unknown"}__${l.listing_type || "unknown"}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(Number(l.original_price));
  }
  const stats: Record<string, { median: number; count: number }> = {};
  for (const [k, prices] of Object.entries(buckets)) {
    prices.sort((a, b) => a - b);
    stats[k] = { median: prices[Math.floor(prices.length / 2)], count: prices.length };
  }
  return stats;
}

async function predict(lead: any, marketStats: Record<string, { median: number; count: number }>, apiKey: string) {
  const key = `${lead.neighborhood_slug || "unknown"}__${lead.listing_type || "unknown"}`;
  const market = marketStats[key];
  const marketContext = market
    ? `Mediana pieței pentru ${lead.neighborhood_slug || "necunoscut"} (${lead.listing_type}): ${Math.round(market.median)} EUR (din ${market.count} listări).`
    : "Nu există suficiente date de comparație în acest segment.";

  const prompt = `Ești analist senior în evaluare imobiliară Timișoara. Estimează 3 metrici pentru acest lead:

Lead:
- Titlu: ${lead.title}
- Preț cerut: ${lead.original_price} EUR
- Tip: ${lead.listing_type}
- Cartier: ${lead.neighborhood_slug || "necunoscut"}
- Sursă: ${lead.source}
- Scor algoritmic actual: ${lead.lead_score}/100
- Profit estimat 3 ani: ${lead.extra_profit_3y} EUR
- Categorie prospect: ${lead.prospect_category || "necunoscut"}
- Telefon disponibil: ${lead.phone ? "da" : "nu"}
- Status curent: ${lead.status}
- Tag-uri: ${(lead.tags || []).join(", ") || "fără"}

Context piață: ${marketContext}

Returnează STRICT JSON:
{
  "conversion_probability": 0-100 (probabilitatea ca acest lead să devină client în 30 zile - bazat pe scor, telefon, categorie, status, segment),
  "predicted_market_value": numar (valoarea reală estimată în EUR pentru această proprietate, comparativ cu mediana pieței),
  "undervaluation_percent": numar (procent subevaluare: pozitiv = subevaluat = oportunitate, negativ = supraevaluat. Calculat ca (predicted - asking) / predicted * 100),
  "prediction_reasoning": "1-2 fraze explicând rațiunea: ce factori au crescut/scăzut probabilitatea și de ce e/nu e subevaluat"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești evaluator imobiliar. Răspunzi exclusiv JSON valid, fără text suplimentar." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`AI gateway ${response.status}: ${txt}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    conversion_probability: Math.max(0, Math.min(100, Math.round(Number(parsed.conversion_probability) || 0))),
    predicted_market_value: Math.round(Number(parsed.predicted_market_value) || 0),
    undervaluation_percent: Math.round((Number(parsed.undervaluation_percent) || 0) * 10) / 10,
    prediction_reasoning: String(parsed.prediction_reasoning || ""),
  };
}
