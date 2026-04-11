import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrls, language } = await req.json();
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error("imageUrls array is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lang = language || "ro";
    const langLabel = lang === "en" ? "English" : "Romanian";

    // Build image content parts (max 5 images to avoid token limits)
    const imageParts = imageUrls.slice(0, 5).map((url: string) => ({
      type: "image_url",
      image_url: { url },
    }));

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
            content: `You are a real estate listing expert. Analyze the property photos and generate a compelling listing in ${langLabel}. Return ONLY valid JSON with this exact structure:
{
  "title": "Short, attractive property title (max 10 words)",
  "description": "Detailed property description (150-250 words). Include room types visible, finishes, atmosphere, natural light, key features, and selling points. Be professional and enticing.",
  "rooms_detected": ["list of room types detected in images"],
  "features_detected": ["list of notable features like balcony, modern kitchen, hardwood floors, etc."],
  "condition": "new/renovated/good/needs_work",
  "style": "modern/classic/minimalist/luxury/industrial",
  "score": 85,
  "improvements": ["specific actionable suggestions to improve the listing score, e.g. 'Add a photo of the bathroom', 'The living room photo has poor lighting - retake with natural light', 'Add an exterior/building photo', 'Kitchen photo is too dark, open blinds and retake']
}
The score (0-100) reflects overall property appeal based on the photos. Be accurate and professional.
IMPORTANT: The "improvements" array should contain 3-5 specific, actionable suggestions in ${langLabel}. Focus on: missing room photos (bathroom, kitchen, bedroom, exterior), lighting issues, photo quality, angles, staging suggestions. Always provide improvements, but be especially detailed when score is below 70.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze these property photos and generate a listing:" },
              ...imageParts,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { title: "", description: rawContent, rooms_detected: [], features_detected: [], condition: "good", style: "modern", score: 70, improvements: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
