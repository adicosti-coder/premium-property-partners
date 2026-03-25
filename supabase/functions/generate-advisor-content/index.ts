import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Ești un consultant imobiliar premium din Timișoara, cu ton de "High-End Investment Advisor". 
Vei genera conținut în limba română, profesionist, de încredere, cu date concrete.

REGULI:
- Folosește un ton elegant, de expert, fără exagerări.
- Include NATURAL entități locale din Timișoara: Parcul Rozelor, Iulius Town, ISHO, Piața Unirii, Piața Victoriei, Parcul Botanic, Universitatea de Vest, Universitatea Politehnica, Centrul Vechi, Bastionul Theresia, Fabric, Iosefin, Dâmbovița, Giroc, Complexul Studențesc, Calea Aradului, Shopping City, Bega, Amazonia Aquapark.
- Nu inventa statistici specifice — folosește formulări precum "potențial ridicat", "tendință ascendentă", "zonă premium".

Vei primi date despre o proprietate și vei genera un JSON cu exact această structură (fără markdown, doar JSON valid):
{
  "expertInsight": "Text de ~500 cuvinte cu analiza stilului de viață, calitatea construcției, potențialul de creștere al zonei.",
  "investmentMetrics": {
    "netYield": "X.X%",
    "rentMultiplier": "XXx",
    "zoneSafetyScore": "X/10"
  },
  "faqs": [
    { "question": "Întrebare premium?", "answer": "Răspuns concis și clar." }
  ]
}

Generează exact 5 FAQ-uri relevante pentru un cumpărător premium.
Pentru investmentMetrics, estimează realist pe baza datelor primite.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyName, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenities, listingType, yearBuilt, energyClass, roi, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "en" ? "en" : "ro";
    const userPrompt = `Generează conținut "The Advisor" pentru această proprietate${lang === "en" ? " (răspunde în engleză)" : ""}:

Proprietate: ${propertyName}
Locație: ${location}, Timișoara
Suprafață: ${size || "N/A"} mp
Dormitoare: ${bedrooms || "N/A"} | Băi: ${bathrooms || "N/A"} | Capacitate: ${capacity || "N/A"} oaspeți
Etaj: ${floor || "N/A"}
Anul construcției: ${yearBuilt || "N/A"}
Clasa energetică: ${energyClass || "N/A"}
Preț/noapte: ${pricePerNight || "N/A"} EUR
ROI estimat: ${roi || "N/A"}
Tip listing: ${listingType || "cazare"}
Dotări: ${(amenities || []).join(", ") || "standard"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_advisor_content",
              description: "Generate The Advisor content for a property listing",
              parameters: {
                type: "object",
                properties: {
                  expertInsight: { type: "string", description: "500-word expert analysis text" },
                  investmentMetrics: {
                    type: "object",
                    properties: {
                      netYield: { type: "string", description: "Net yield percentage e.g. 8.5%" },
                      rentMultiplier: { type: "string", description: "Rent multiplier e.g. 14x" },
                      zoneSafetyScore: { type: "string", description: "Zone safety score e.g. 8.5/10" },
                    },
                    required: ["netYield", "rentMultiplier", "zoneSafetyScore"],
                  },
                  faqs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                    },
                    description: "5 premium buyer FAQs",
                  },
                },
                required: ["expertInsight", "investmentMetrics", "faqs"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_advisor_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let content;
    
    if (toolCall?.function?.arguments) {
      content = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback: try to parse message content as JSON
      const msgContent = data.choices?.[0]?.message?.content || "";
      const jsonMatch = msgContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract structured content from AI response");
      }
    }

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-advisor-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
