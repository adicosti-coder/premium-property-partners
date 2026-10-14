import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isUrlAllowed, fetchWithSizeCap } from "../_shared/urlGuard.ts";

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

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  try {
    const { imageUrl, mode = "enhance", style = "modern" } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guard = isUrlAllowed(imageUrl);
    if (!guard.ok) {
      return new Response(JSON.stringify({ error: `Forbidden URL: ${guard.reason}` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Fetch source image with size cap
    const fetched = await fetchWithSizeCap(imageUrl);
    if (!fetched.ok || !fetched.bytes) {
      return new Response(JSON.stringify({ error: fetched.error || "fetch failed" }), {
        status: fetched.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const imgBuf = fetched.bytes;
    let binary = "";
    for (let i = 0; i < imgBuf.length; i++) binary += String.fromCharCode(imgBuf[i]);
    const base64 = btoa(binary);
    const mime = fetched.contentType || "image/jpeg";
    // gemini-3.1-flash-lite-image is served only on /v1/images/generations (generate-content format)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite-image",
        contents: [
          { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: base64 } }] },
        ],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
...
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    const generated = b64 ? `data:image/png;base64,${b64}` : (data.data?.[0]?.url ?? null);
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
