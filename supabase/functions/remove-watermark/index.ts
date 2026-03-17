import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEWATERMARK_URL = "https://platform.dewatermark.ai/api/object_removal/v2/erase_watermark";

function extensionFromContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  return "jpg";
}

async function fetchImageAsBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RealTrust/1.0)" },
  });
  if (!resp.ok) throw new Error("Failed to fetch source image");
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await resp.arrayBuffer());
  return { bytes, contentType };
}

function parseDataUri(dataUri: string): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, contentType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

async function uploadToStorage(base64Image: string, contentType: string): Promise<{ imageUrl: string; size: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Storage backend not configured");

  const binary = atob(base64Image);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const ext = extensionFromContentType(contentType);
  const filePath = `watermark-cleaned/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(filePath, bytes, { contentType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("property-images").getPublicUrl(filePath);
  return { imageUrl: data.publicUrl, size: bytes.byteLength };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("DEWATERMARK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Dewatermark API key not configured" }), {
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

    // Get image bytes
    let imageBytes: Uint8Array;
    let contentType = "image/jpeg";

    if (imageDataUrl) {
      const parsed = parseDataUri(imageDataUrl);
      if (!parsed) throw new Error("Invalid image data URI");
      imageBytes = parsed.bytes;
      contentType = parsed.contentType;
    } else {
      const fetched = await fetchImageAsBytes(imageUrl);
      imageBytes = fetched.bytes;
      contentType = fetched.contentType;
    }

    // Build multipart form for Dewatermark API
    const formData = new FormData();
    const blob = new Blob([imageBytes], { type: "image/jpeg" });
    formData.append("original_preview_image", blob, "image.jpeg");
    formData.append("remove_text", "true");
    formData.append("predict_mode", "3.0");

    console.log(`Calling Dewatermark API for image (${imageBytes.byteLength} bytes)...`);

    const dwResponse = await fetch(DEWATERMARK_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body: formData,
    });

    if (!dwResponse.ok) {
      const errText = await dwResponse.text();
      console.error("Dewatermark API error:", dwResponse.status, errText);

      const isRateLimited = dwResponse.status === 429;
      const isOutOfCredits = dwResponse.status === 402 || dwResponse.status === 403;

      return new Response(JSON.stringify({
        cleaned: false,
        error: isRateLimited
          ? "Serviciul Dewatermark este temporar ocupat. Reîncearcă peste câteva secunde."
          : isOutOfCredits
            ? "Creditele Dewatermark sunt epuizate. Verifică contul pe dewatermark.ai."
            : `Dewatermark API error (${dwResponse.status})`,
        status: dwResponse.status,
        retryable: isRateLimited,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dwData = await dwResponse.json();
    const cleanedBase64 = dwData?.edited_image?.image;

    if (!cleanedBase64) {
      console.error("Dewatermark returned no image:", JSON.stringify(dwData).slice(0, 500));
      return new Response(JSON.stringify({
        cleaned: false,
        error: "Dewatermark nu a returnat o imagine procesată",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload cleaned image to storage
    try {
      const uploaded = await uploadToStorage(cleanedBase64, "image/jpeg");
      return new Response(JSON.stringify({
        cleaned: true,
        imageUrl: uploaded.imageUrl,
        cleanedSize: uploaded.size,
        model: "dewatermark-v3",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      // Fallback: return as data URI
      return new Response(JSON.stringify({
        cleaned: true,
        dataUri: `data:image/jpeg;base64,${cleanedBase64}`,
        model: "dewatermark-v3",
        uploadFallback: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
