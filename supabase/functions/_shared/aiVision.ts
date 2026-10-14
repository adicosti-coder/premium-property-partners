// ai-vision handlers shared by `ai-vision` and the legacy function URLs.
import { callAI, MODELS, AIError, aiKey } from "./aiClient.ts";
import { isUrlAllowed, fetchWithSizeCap } from "./urlGuard.ts";

export const VISION_SCHEMA = {
  name: "listing_vision",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "rooms_detected", "features_detected", "condition", "style", "score", "improvements", "alt_texts"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      rooms_detected: { type: "array", items: { type: "string" } },
      features_detected: { type: "array", items: { type: "string" } },
      condition: { type: "string", enum: ["new", "renovated", "good", "needs_work"] },
      style: { type: "string", enum: ["modern", "classic", "minimalist", "luxury", "industrial"] },
      score: { type: "integer", minimum: 0, maximum: 100 },
      improvements: { type: "array", items: { type: "string" } },
      alt_texts: { type: "array", items: { type: "string" } },
    },
  },
};

export async function analyzeImages(imageUrls: unknown, language?: string) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) throw new AIError(400, "imageUrls array is required");
  const safe = imageUrls.filter((u) => typeof u === "string" && isUrlAllowed(u).ok).slice(0, 5) as string[];
  if (!safe.length) throw new AIError(403, "No allowlisted image URLs");
  const langLabel = language === "en" ? "English" : "Romanian";
  const { content } = await callAI({
    model: MODELS.vision,
    label: "ai-vision.analyze",
    schema: VISION_SCHEMA,
    messages: [
      { role: "system", content: `You are a real estate listing expert. Analyze the property photos in ONE pass and answer in ${langLabel}: title (max 10 words), description (150-250 words, only what is visible, no invented facts), rooms_detected, features_detected, condition, style, score 0-100 for overall appeal, 3-5 actionable improvements (missing rooms, lighting, angles, staging), and alt_texts: one concise SEO alt text (max 125 chars) per photo, in the same order as the photos.` },
      { role: "user", content: [{ type: "text", text: "Analyze these property photos:" }, ...safe.map((url) => ({ type: "image_url", image_url: { url } }))] },
    ],
  });
  return content;
}

const PROMPTS: Record<string, (style: string) => string> = {
  enhance: () => "Enhance this real estate photo: increase brightness, balance white temperature, boost natural colors, sharpen details. Keep it 100% realistic — no surreal effects, no added objects. Professional listing-quality photo.",
  stage: (s) => `Virtual staging for this empty room. Add tasteful ${s} furniture appropriate for the room type. Keep the architecture, walls, floor, windows, and lighting EXACTLY the same. Photorealistic, listing-ready.`,
  declutter: () => "Remove distracting personal items, clutter, cables, and small objects from this real estate photo. Keep all furniture, architecture, and lighting unchanged. Result must look natural and professional.",
  twilight: () => "Convert this daytime exterior real estate photo to a beautiful twilight shot. Warm window lights on, soft sky, accent landscape lighting. Architecture must remain identical. Premium listing photography quality.",
};

export async function enhanceImage(imageUrl: unknown, mode = "enhance", style = "modern") {
  if (typeof imageUrl !== "string" || !imageUrl) throw new AIError(400, "imageUrl required");
  const g = isUrlAllowed(imageUrl);
  if (!g.ok) throw new AIError(403, `Forbidden URL: ${g.reason}`);
  const f = await fetchWithSizeCap(imageUrl);
  if (!f.ok || !f.bytes) throw new AIError(f.status || 502, f.error || "fetch failed");
  let bin = "";
  for (let i = 0; i < f.bytes.length; i++) bin += String.fromCharCode(f.bytes[i]);
  const prompt = (PROMPTS[mode] ?? PROMPTS.enhance)(String(style).slice(0, 40));
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${aiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELS.image,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: f.contentType || "image/jpeg", data: btoa(bin) } }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!res.ok) {
    console.error("[ai-vision.enhance]", res.status, (await res.text().catch(() => "")).slice(0, 300));
    if (res.status === 429) throw new AIError(429, "Rate limited");
    if (res.status === 402) throw new AIError(402, "Credits exhausted");
    if (res.status === 403) throw new AIError(403, "AI access denied");
    throw new AIError(502, `AI gateway ${res.status}`);
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  const out = b64 ? `data:${b64.startsWith("/9j/") ? "image/jpeg" : "image/png"};base64,${b64}` : (data.data?.[0]?.url ?? null);
  if (!out) throw new AIError(502, "AI did not return an image");
  return { enhancedImage: out, mode };
}
