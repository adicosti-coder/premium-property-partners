import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ────────────────────────────────────────────────────────────
   Photo Enhancement & Virtual Staging via Gemini Image
   Modes:
     - enhance  → improve light, sharpness, color (kept realistic)
     - stage    → add tasteful furniture for empty rooms
     - declutter → remove distracting objects
     - twilight → convert daytime exterior to dusk shot
──────────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, mode = "enhance", style = "modern" } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompts: Record<string, string> = {
      enhance: "Enhance this real estate photo: increase brightness, balance white temperature, boost natural colors, sharpen details. Keep it 100% realistic — no surreal effects, no added objects. Professional listing-quality photo.",
      stage: `Virtual staging for this empty room. Add tasteful ${style} furniture appropriate for the room type (sofa, coffee table, rug for living room; bed, nightstand for bedroom; dining table for kitchen). Keep the architecture, walls, floor, windows, and lighting EXACTLY the same. Photorealistic, listing-ready.`,
      declutter: "Remove distracting personal items, clutter, cables, and small objects from this real estate photo. Keep all furniture, architecture, and lighting unchanged. Result must look natural and professional.",
      twilight: "Convert this daytime exterior real estate photo to a beautiful twilight shot. Warm window lights on, soft purple/orange sky, accent landscape lighting. Architecture must remain identical. Premium listing photography quality.",
    };

    const prompt = prompts[mode] || prompts.enhance;

    // Fetch source image and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Cannot fetch source image: ${imgRes.status}`);
    const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < imgBuf.length; i++) binary += String.fromCharCode(imgBuf[i]);
    const base64 = btoa(binary);
    const mime = imgRes.headers.get("content-type") || "image/jpeg";
    const dataUri = `data:${mime};base64,${base64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text().catch(() => "");
      console.error("AI gateway error:", status, errText);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `AI gateway ${status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    // Gemini image returns base64 in message.images[0].image_url.url
    const generated = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generated) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return an image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ enhancedImage: generated, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enhance-property-photo error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
