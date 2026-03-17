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

function extractCleanedImage(data: any): string | null {
  const images = data?.choices?.[0]?.message?.images;
  if (images?.length > 0) {
    const imgUrl = images[0]?.image_url?.url;
    if (imgUrl?.startsWith("data:")) return imgUrl;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === "image_url" && item?.image_url?.url?.startsWith("data:")) {
        return item.image_url.url;
      }
    }
  } else if (typeof content === "string") {
    const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (match) return match[0];
  }

  const parts = data?.choices?.[0]?.message?.parts || [];
  for (const part of parts) {
    if (part?.inline_data?.data) {
      const mime = part.inline_data.mime_type || "image/png";
      return `data:${mime};base64,${part.inline_data.data}`;
    }
  }

  return null;
}

async function tryModel(lovableApiKey: string, model: string, dataUri: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Remove all visible watermarks, agency logos, brand marks, phone numbers, labels, and overlaid text from this real-estate photo. Reconstruct the hidden pixels naturally, preserve perspective and room details, do not crop, do not alter composition, and return only the cleaned image.",
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

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, status: response.status, errorText: errText, cleanedDataUri: null };
  }

  const data = await response.json();
  return { ok: true, status: 200, errorText: null, cleanedDataUri: extractCleanedImage(data) };
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

    const models = ["google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview"];
    let lastError = "AI did not return a cleaned image";

    for (const model of models) {
      const result = await tryModel(lovableApiKey, model, dataUri!);
      if (result.ok && result.cleanedDataUri) {
        return new Response(JSON.stringify({ cleaned: true, dataUri: result.cleanedDataUri, model }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!result.ok) {
        lastError = result.errorText || `AI processing failed for ${model}`;
        console.error(`AI API error (${model}):`, result.status, result.errorText);
        if (result.status === 402 || result.status === 429) {
          return new Response(JSON.stringify({ cleaned: false, error: lastError }), {
            status: result.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ cleaned: false, error: lastError }), {
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