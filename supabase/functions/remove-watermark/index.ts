import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) binary += String.fromCharCode(chunk[j]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, imageDataUrl } = await req.json();
    if (!imageUrl && !imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageUrl or imageDataUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dataUri = imageDataUrl as string | undefined;

    if (!dataUri && imageUrl) {
      const imgResp = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RealTrust/1.0)" },
      });
      if (!imgResp.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch image source" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentType = imgResp.headers.get("content-type") || "image/jpeg";
      const bytes = new Uint8Array(await imgResp.arrayBuffer());
      dataUri = `data:${contentType};base64,${bytesToBase64(bytes)}`;
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Remove all visible watermarks, agency logos, brand marks, phone numbers, labels, and overlaid text from this real-estate photo. Reconstruct the hidden pixels naturally, preserve perspective and room details, do not crop, do not change furniture placement, and return only the cleaned image.",
              },
              {
                type: "image_url",
                image_url: { url: dataUri },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        temperature: 0.05,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI API error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed", cleaned: false }), {
        status: aiResp.status === 402 || aiResp.status === 429 ? aiResp.status : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    let cleanedDataUri: string | null = null;

    const images = data?.choices?.[0]?.message?.images;
    if (images?.length > 0) {
      const imgUrl = images[0]?.image_url?.url;
      if (imgUrl?.startsWith("data:")) cleanedDataUri = imgUrl;
    }

    if (!cleanedDataUri) {
      const content = data?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item?.type === "image_url" && item?.image_url?.url?.startsWith("data:")) {
            cleanedDataUri = item.image_url.url;
            break;
          }
        }
      } else if (typeof content === "string") {
        const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (match) cleanedDataUri = match[0];
      }
    }

    if (!cleanedDataUri) {
      const parts = data?.choices?.[0]?.message?.parts || [];
      for (const part of parts) {
        if (part?.inline_data?.data) {
          const mime = part.inline_data.mime_type || "image/png";
          cleanedDataUri = `data:${mime};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    return new Response(JSON.stringify({
      cleaned: Boolean(cleanedDataUri),
      dataUri: cleanedDataUri,
      error: cleanedDataUri ? null : "AI did not return a cleaned image",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});