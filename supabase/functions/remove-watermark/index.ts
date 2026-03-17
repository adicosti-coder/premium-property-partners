import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the image
    const imgResp = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RealTrust/1.0)" },
    });
    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imgResp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const base64 = btoa(binary);
    const dataUri = `data:${contentType};base64,${base64}`;

    // Call AI to remove watermarks
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Remove any watermarks, phone numbers, logos, or overlaid text from this property photo. Keep the underlying image intact and natural-looking. Return only the cleaned image.",
              },
              {
                type: "image_url",
                image_url: { url: dataUri },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI API error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI processing failed", cleaned: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();

    // Try to extract image from various response formats
    let cleanedDataUri: string | null = null;

    // Format 1: images array
    const images = data?.choices?.[0]?.message?.images;
    if (images?.length > 0) {
      const imgUrl = images[0]?.image_url?.url;
      if (imgUrl?.startsWith("data:")) {
        cleanedDataUri = imgUrl;
      }
    }

    // Format 2: content array with image_url
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

    // Format 3: inline_data in parts
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

    if (cleanedDataUri) {
      return new Response(JSON.stringify({ cleaned: true, dataUri: cleanedDataUri }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ cleaned: false, error: "Could not extract cleaned image from AI response" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
