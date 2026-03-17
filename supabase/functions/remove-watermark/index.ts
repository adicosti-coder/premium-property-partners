import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (typeof imgUrl === "string" && (imgUrl.startsWith("data:") || imgUrl.startsWith("http"))) {
      return imgUrl;
    }
  }

  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      const imgUrl = item?.image_url?.url;
      if (item?.type === "image_url" && typeof imgUrl === "string" && (imgUrl.startsWith("data:") || imgUrl.startsWith("http"))) {
        return imgUrl;
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

function extractFailureReason(data: any): string | null {
  const message = data?.choices?.[0]?.message;
  const content = message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const textParts = content
      .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
      .map((item: any) => item.text.trim())
      .filter(Boolean);

    if (textParts.length > 0) return textParts.join(" ");
  }

  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isPolicyBlockedMessage(message: string | null | undefined): boolean {
  if (!message) return false;

  return /cannot fulfill this request|respecting intellectual property|copyright|watermark|branding|logo|phone numbers|illegal|unethical/i.test(message);
}

function canPassRemoteUrlToAi(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.endsWith(".apollo.olxcdn.com") || hostname === "apollo.olxcdn.com";
  } catch {
    return false;
  }
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

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function uploadCleanedImage(cleanedImage: string) {
  if (!cleanedImage.startsWith("data:")) {
    return { imageUrl: cleanedImage, size: null };
  }

  const parsed = parseDataUri(cleanedImage);
  if (!parsed) throw new Error("Invalid cleaned image payload");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Storage backend not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const extension = extensionFromContentType(parsed.contentType);
  const filePath = `watermark-cleaned/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(filePath, parsed.bytes, { contentType: parsed.contentType, upsert: false });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from("property-images").getPublicUrl(filePath);
  return { imageUrl: data.publicUrl, size: parsed.bytes.byteLength };
}

async function tryModel(lovableApiKey: string, model: string, prompt: string, imageInput: string) {
  const retryDelays = [0, 2000, 5000];

  for (let attemptIndex = 0; attemptIndex < retryDelays.length; attemptIndex++) {
    const retryDelay = retryDelays[attemptIndex];
    if (retryDelay > 0) await sleep(retryDelay);

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
                text: prompt,
              },
              {
                type: "image_url",
                image_url: { url: imageInput },
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
      const canRetry = response.status === 429 && attemptIndex < retryDelays.length - 1;
      if (canRetry) continue;
      return { ok: false, status: response.status, errorText: errText, cleanedDataUri: null };
    }

    const data = await response.json();
    return {
      ok: true,
      status: 200,
      errorText: extractFailureReason(data),
      cleanedDataUri: extractCleanedImage(data),
    };
  }

  return { ok: false, status: 429, errorText: "AI rate limit hit after retries", cleanedDataUri: null };
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

    let imageInput = imageDataUrl as string | undefined;

    if (!imageInput && imageUrl) {
      if (canPassRemoteUrlToAi(imageUrl)) {
        imageInput = imageUrl;
      } else {
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
        imageInput = `data:${contentType};base64,${bytesToBase64(bytes)}`;
      }
    }

    const attempt = {
      model: "google/gemini-2.5-flash-image",
      prompt:
        "Restore this interior listing photo by removing overlaid branding, room labels, logos, and phone numbers; reconstruct hidden background naturally; preserve room geometry and lighting; return only the edited image.",
    };
    let lastError = "AI did not return a cleaned image";

    const result = await tryModel(lovableApiKey, attempt.model, attempt.prompt, imageInput!);
    if (result.ok && result.cleanedDataUri) {
      try {
        const uploaded = await uploadCleanedImage(result.cleanedDataUri);
        return new Response(JSON.stringify({
          cleaned: true,
          imageUrl: uploaded.imageUrl,
          cleanedSize: uploaded.size,
          model: attempt.model,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (uploadError) {
        console.error("Storage upload error:", uploadError);
        return new Response(JSON.stringify({
          cleaned: true,
          dataUri: result.cleanedDataUri,
          model: attempt.model,
          uploadFallback: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!result.ok) {
      lastError = result.errorText || `AI processing failed for ${attempt.model}`;
      console.error(`AI API error (${attempt.model}):`, result.status, result.errorText);
      return new Response(JSON.stringify({
        cleaned: false,
        error: lastError,
        status: result.status,
        retryable: result.status === 429,
        code: isPolicyBlockedMessage(lastError) ? "policy_blocked" : undefined,
        blocked: isPolicyBlockedMessage(lastError),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.errorText) {
      lastError = result.errorText;
      console.warn(`AI image extraction missing (${attempt.model}):`, result.errorText);
    }

    const blockedByPolicy = isPolicyBlockedMessage(lastError);

    return new Response(JSON.stringify({
      cleaned: false,
      error: blockedByPolicy
        ? "Providerul AI integrat a refuzat editarea acestei imagini deoarece detectează eliminare de watermark/branding."
        : lastError,
      rawError: lastError,
      code: blockedByPolicy ? "policy_blocked" : undefined,
      blocked: blockedByPolicy,
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