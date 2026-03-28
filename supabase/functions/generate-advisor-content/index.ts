import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
Pentru investmentMetrics, estimează realist pe baza datelor primite.
IMPORTANT: Răspunde DOAR cu JSON valid, fără markdown, fără backticks, fără explicații.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyName, propertySlug, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenities, listingType, yearBuilt, energyClass, roi, language } = await req.json();

    const lang = language === "en" ? "en" : "ro";
    const cacheSlug = propertySlug || propertyName;

    // --- Supabase client for cache ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    // --- Check cache first ---
    try {
      const { data: cached } = await sb
        .from("advisor_cache")
        .select("content")
        .eq("property_slug", cacheSlug)
        .eq("language", lang)
        .maybeSingle();

      if (cached?.content) {
        console.log("Cache HIT for", cacheSlug, lang);
        return new Response(JSON.stringify(cached.content), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (cacheErr) {
      console.warn("Cache read failed, continuing to AI:", cacheErr);
    }

    console.log("Cache MISS for", cacheSlug, lang);

    // --- Property context map ---
    const propertyContextMap: Record<string, { positioning: string; poiContext: string; buyerProfile: string }> = {
      "apartament-1-5-camere-43-5-m2-4-5-m2-ext-vivalia-v6-full-mobilat-la-comanda": {
        positioning: "Ansamblul Vivalia din zona Take Ionescu, în polul urban dintre Iulius Town, Bastion și axa centrală a orașului.",
        poiContext: "POI relevante: Iulius Town, Bastionul Theresia, Piața Unirii, restaurantele și cafenelele de pe Take Ionescu, UVT Oituz, stațiile de tramvai din Take Ionescu.",
        buyerProfile: "Profil cumpărător: investitor care caută activ premium, ușor de monetizat în regim hotelier, corporate housing sau revânzare către client final exigent.",
      },
      "apartament-2-camere-vivalia-parter-parcare-terasa-mare-iulius-mall": {
        positioning: "Ansamblul Vivalia din zona Take Ionescu, foarte aproape de Iulius Town și de coridorul premium spre centru.",
        poiContext: "POI relevante: Iulius Town, Bastionul Theresia, Piața Unirii, zona comercială din jurul Vivalia, UVT Oituz și transportul public Take Ionescu.",
        buyerProfile: "Profil cumpărător: investitor interesat de cerere constantă, flexibilitate bună la exploatare și poziție premium ușor de explicat în piață.",
      },
      "ideal-investitie-utilat-complet-mobilat": {
        positioning: "Micro-locație Vivalia / Take Ionescu, conectată natural la Iulius Town și la nucleul central al Timișoarei.",
        poiContext: "POI relevante: Iulius Town, Bastion, Piața Unirii, retail de proximitate, cafenele și artera Take Ionescu.",
        buyerProfile: "Profil cumpărător: investitor care vizează produs urban premium, lichid și bine poziționat pentru închiriere și exit.",
      },
    };

    const propertyContext = propertySlug ? propertyContextMap[propertySlug] : undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
Dotări: ${(amenities || []).join(", ") || "standard"}
Context local verificat: ${propertyContext?.positioning || "Folosește exclusiv locația primită și menține reperele locale coerente."}
POI / repere apropiate: ${propertyContext?.poiContext || "Alege doar repere plauzibile pentru poziția exactă a proprietății."}
Context de cumpărător: ${propertyContext?.buyerProfile || "Menține un ton premium și o logică investițională matură."}

Răspunde DOAR cu JSON valid.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: `AI gateway error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract content
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let content;

    if (toolCall?.function?.arguments) {
      content = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const msgContent = data.choices?.[0]?.message?.content || "";
      const cleaned = msgContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract structured content from AI response");
      }
    }

    // --- Save to cache (upsert) ---
    try {
      await sb.from("advisor_cache").upsert(
        {
          property_slug: cacheSlug,
          language: lang,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_slug,language" }
      );
      console.log("Cache SAVED for", cacheSlug, lang);
    } catch (saveErr) {
      console.warn("Cache save failed (non-blocking):", saveErr);
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
