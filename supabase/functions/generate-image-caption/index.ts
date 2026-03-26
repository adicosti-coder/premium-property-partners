import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, propertyName, language } = await req.json();
    if (!imageUrl) throw new Error("imageUrl is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Try DB cache first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);
    const lang = language || "ro";

    try {
      const { data: cached } = await sb
        .from("image_caption_cache")
        .select("caption")
        .eq("image_url", imageUrl)
        .eq("language", lang)
        .maybeSingle();

      if (cached?.caption) {
        return new Response(JSON.stringify({ caption: cached.caption, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("Cache read failed, proceeding to AI:", e);
    }

    const langLabel = lang === "en" ? "English" : "Romanian";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a real estate photo descriptor for premium properties. Write a single short caption (max 12 words) in ${langLabel} describing what you see in the image. Focus on the room type, key features, and atmosphere. Be elegant and concise. Examples: "Living spațios cu canapea premium și lumină naturală", "Dormitor matrimonial cu finisaje moderne". Do NOT mention the property name. Return ONLY the caption text, nothing else.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Describe this photo from "${propertyName}":` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || "";

    // Save to DB cache (fire and forget)
    if (caption) {
      sb.from("image_caption_cache")
        .upsert(
          { image_url: imageUrl, property_name: propertyName, language: lang, caption, updated_at: new Date().toISOString() },
          { onConflict: "image_url,language" }
        )
        .then(({ error }) => { if (error) console.warn("Cache write failed:", error); });
    }

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Caption error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
