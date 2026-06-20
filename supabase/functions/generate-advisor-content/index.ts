import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT_DEFAULT = `Ești un consultant imobiliar premium din Timișoara, cu ton de "High-End Investment Advisor". 
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
Pentru investmentMetrics: dacă primești un câmp "roi" în datele proprietății, folosește EXACT acea valoare pentru "netYield". Nu estima un ROI diferit — folosește valoarea oficială din baza de date.
IMPORTANT: Răspunde DOAR cu JSON valid, fără markdown, fără backticks, fără explicații.`;

const SYSTEM_PROMPT_RENTAL = `Ești un consultant imobiliar premium din Timișoara, specializat în închirieri pe termen lung.
Vei genera conținut profesionist, de încredere.

REGULI STRICTE:
- NU menționa regim hotelier, Booking, Airbnb, dynamic pricing, smart lock, sau venit pasiv.
- NU menționa randament investițional, ROI, sau potențial investițional.
- Focusul este EXCLUSIV pe închiriere pe termen lung: confort, locație, facilități, stil de viață.
- Folosește un ton elegant, de expert, fără exagerări.
- Include NATURAL entități locale din Timișoara relevante pentru viața de zi cu zi.

Vei primi date despre o proprietate și vei genera un JSON cu exact această structură:
{
  "expertInsight": "Text de ~400 cuvinte despre calitatea locuirii, avantajele zonei pentru chiriași, confort și stil de viață.",
  "investmentMetrics": {
    "netYield": "",
    "rentMultiplier": "",
    "zoneSafetyScore": ""
  },
  "faqs": [
    { "question": "Întrebare relevantă pentru chiriași?", "answer": "Răspuns concis." }
  ]
}

Generează exact 5 FAQ-uri relevante pentru un potențial chiriaș (tipuri de chiriași, facilități, zonă, condiții contract, administrare).
investmentMetrics trebuie lăsat gol (string-uri goale) — NU genera metrici de investiție.
IMPORTANT: Răspunde DOAR cu JSON valid, fără markdown, fără backticks, fără explicații.`;

const SYSTEM_PROMPT_DEFAULT_EN = `You are a premium real-estate consultant in Timișoara, Romania, writing as a "High-End Investment Advisor".
You MUST write all output in ENGLISH ONLY. Do NOT use Romanian. Local place names (Iulius Town, Piața Unirii, Bastionul Theresia, Fabric, Iosefin, Calea Aradului, etc.) stay in their original form, but every other word — including the expertInsight body and FAQ questions/answers — must be natural, professional English.

RULES:
- Elegant, expert tone, no hype.
- Naturally weave in local Timișoara landmarks: Parcul Rozelor, Iulius Town, ISHO, Piața Unirii, Piața Victoriei, Parcul Botanic, West University, Polytechnic University, Old Town, Bastionul Theresia, Fabric, Iosefin, Dâmbovița, Giroc, Student Complex, Calea Aradului, Shopping City, Bega, Amazonia Aquapark.
- Do NOT invent specific statistics — use phrasing like "strong potential", "upward trend", "premium area".

Return a JSON object with EXACTLY this structure (no markdown, valid JSON only):
{
  "expertInsight": "~500 words analyzing lifestyle, build quality, and the area's growth potential.",
  "investmentMetrics": { "netYield": "X.X%", "rentMultiplier": "XXx", "zoneSafetyScore": "X/10" },
  "faqs": [ { "question": "Premium buyer question?", "answer": "Concise, clear answer." } ]
}

Generate exactly 5 FAQs relevant to a premium buyer.
For investmentMetrics: if a "roi" field is provided, use EXACTLY that value for "netYield" — do not estimate a different ROI.
IMPORTANT: Respond with VALID JSON ONLY, no markdown, no backticks, no commentary. ENGLISH ONLY.`;

const SYSTEM_PROMPT_RENTAL_EN = `You are a premium real-estate consultant in Timișoara, Romania, specialized in long-term rentals.
You MUST write all output in ENGLISH ONLY. Do NOT use Romanian. Local place names stay in original form; everything else must be natural professional English.

STRICT RULES:
- Do NOT mention hotel regime, Booking, Airbnb, dynamic pricing, smart lock, or passive income.
- Do NOT mention investment yield, ROI, or investment potential.
- Focus EXCLUSIVELY on long-term rental: comfort, location, amenities, lifestyle.
- Elegant, expert tone, no hype.

Return JSON with EXACTLY this structure:
{
  "expertInsight": "~400 words about living quality, neighborhood advantages for tenants, comfort and lifestyle.",
  "investmentMetrics": { "netYield": "", "rentMultiplier": "", "zoneSafetyScore": "" },
  "faqs": [ { "question": "Relevant tenant question?", "answer": "Concise answer." } ]
}

Generate exactly 5 FAQs relevant to a prospective tenant.
investmentMetrics must be left empty (empty strings).
IMPORTANT: Respond with VALID JSON ONLY, no markdown, no backticks, no commentary. ENGLISH ONLY.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow either an admin JWT or an internal service-role bearer (used by bulk-generate-ai-cache)
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const SERVICE_KEY_ENV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const isInternal = bearer.length > 0 && SERVICE_KEY_ENV.length > 0 && bearer === SERVICE_KEY_ENV;
  if (!isInternal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
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

    const userPrompt = lang === "en"
      ? `Generate "The Advisor" content for this property. RESPOND IN ENGLISH ONLY.

Property: ${propertyName}
Location: ${location}, Timișoara, Romania
Size: ${size || "N/A"} sqm
Bedrooms: ${bedrooms || "N/A"} | Bathrooms: ${bathrooms || "N/A"} | Capacity: ${capacity || "N/A"} guests
Floor: ${floor || "N/A"}
Year built: ${yearBuilt || "N/A"}
Energy class: ${energyClass || "N/A"}
Price/night: ${pricePerNight || "N/A"} EUR
Estimated ROI: ${roi || "N/A"}
Listing type: ${listingType || "cazare"}
Amenities: ${(amenities || []).join(", ") || "standard"}
Verified local context: ${propertyContext?.positioning || "Use only the provided location and keep local references coherent."}
Nearby POI / landmarks: ${propertyContext?.poiContext || "Pick only landmarks plausible for the exact position of the property."}
Buyer context: ${propertyContext?.buyerProfile || "Maintain a premium tone and mature investment logic."}

Respond with VALID JSON ONLY. ENGLISH ONLY.`
      : `Generează conținut "The Advisor" pentru această proprietate:

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: lang === "en"
              ? (listingType === "inchiriere" ? SYSTEM_PROMPT_RENTAL_EN : SYSTEM_PROMPT_DEFAULT_EN)
              : (listingType === "inchiriere" ? SYSTEM_PROMPT_RENTAL : SYSTEM_PROMPT_DEFAULT) },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
      const rawMessageContent = data.choices?.[0]?.message?.content;
      const msgContent = Array.isArray(rawMessageContent)
        ? rawMessageContent.map((part: any) => typeof part?.text === "string" ? part.text : "").join("\n")
        : typeof rawMessageContent === "string"
          ? rawMessageContent
          : "";
      const cleaned = msgContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Unexpected AI response:", JSON.stringify(data));
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
