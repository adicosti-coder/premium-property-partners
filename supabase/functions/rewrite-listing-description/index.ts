import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- prompt builder extracted for clarity ---
import { buildPrompt, type PropertyData } from "./prompt.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyData, listingType = "vanzare", tone = "premium" } = await req.json();

    if (!propertyData) {
      return new Response(
        JSON.stringify({ success: false, error: "propertyData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- DB cache check ---
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cacheKey = propertyData.title || "untitled";

    try {
      const { data: cached } = await sb
        .from("rewrite_cache")
        .select("rewritten_title, rewritten_short, rewritten_full")
        .eq("property_title", cacheKey)
        .eq("listing_type", listingType)
        .eq("tone", tone)
        .maybeSingle();

      if (cached?.rewritten_full) {
        console.log("Cache HIT for rewrite:", cacheKey);
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            rewritten: {
              title: cached.rewritten_title || "",
              description_short: cached.rewritten_short || "",
              description_full: cached.rewritten_full,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.warn("Cache read failed, proceeding to AI:", e);
    }

    // --- AI generation ---
    const prompt = buildPrompt(propertyData, listingType, tone);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Ești cel mai bun copywriter imobiliar din România, cu experiență de 15 ani în marketing premium. Scrii exclusiv în limba română cu diacritice corecte, folosind limbaj de specialitate economic și imobiliar. Fiecare text pe care îl produci este impecabil gramatical, persuasiv și orientat spre conversie.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limită de cereri depășită. Reîncearcă în câteva secunde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Credit insuficient pentru AI. Adaugă fonduri în workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "Eroare la generarea textului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const fullText = aiData.choices?.[0]?.message?.content || "";

    // Parse structured response
    const titleMatch = fullText.match(/---TITLU---\s*([\s\S]*?)(?=---SCURT---|$)/);
    const shortMatch = fullText.match(/---SCURT---\s*([\s\S]*?)(?=---COMPLET---|$)/);
    const fullMatch = fullText.match(/---COMPLET---\s*([\s\S]*?)$/);

    const rewrittenTitle = titleMatch?.[1]?.trim() || "";
    const rewrittenShort = shortMatch?.[1]?.trim() || "";
    const rewrittenFull = fullMatch?.[1]?.trim() || fullText;

    // Save to cache (fire and forget)
    if (rewrittenFull) {
      sb.from("rewrite_cache")
        .upsert(
          {
            property_title: cacheKey,
            listing_type: listingType,
            tone,
            rewritten_title: rewrittenTitle,
            rewritten_short: rewrittenShort,
            rewritten_full: rewrittenFull,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "property_title,listing_type,tone" }
        )
        .then(({ error }) => { if (error) console.warn("Cache write failed:", error); });
    }

    return new Response(
      JSON.stringify({
        success: true,
        rewritten: {
          title: rewrittenTitle,
          description_short: rewrittenShort,
          description_full: rewrittenFull,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Rewrite error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
