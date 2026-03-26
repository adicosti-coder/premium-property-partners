import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Simple hash for cache key
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const src = sourceLang || "Romanian";
    const tgt = targetLang || "English";
    const textHash = simpleHash(text);

    // --- DB cache check ---
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    try {
      const { data: cached } = await sb
        .from("translation_cache")
        .select("translated")
        .eq("source_text_hash", textHash)
        .eq("source_lang", src)
        .eq("target_lang", tgt)
        .maybeSingle();

      if (cached?.translated) {
        console.log("Translation cache HIT for hash:", textHash);
        return new Response(
          JSON.stringify({ translated: cached.translated, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.warn("Cache read failed, proceeding to AI:", e);
    }

    // --- AI translation ---
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional real estate translator. Translate ${src} property descriptions to ${tgt}. Keep the same tone and structure. Return ONLY the translated text, no explanations.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Translate] AI error:", errText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }),
        { status: response.status === 429 ? 429 : response.status === 402 ? 402 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const translated = data?.choices?.[0]?.message?.content?.trim();

    // Save to cache (fire and forget)
    if (translated) {
      sb.from("translation_cache")
        .upsert(
          {
            source_text_hash: textHash,
            source_lang: src,
            target_lang: tgt,
            translated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "source_text_hash,source_lang,target_lang" }
        )
        .then(({ error }) => { if (error) console.warn("Translation cache write failed:", error); });
    }

    return new Response(
      JSON.stringify({ translated: translated || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Translate] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
