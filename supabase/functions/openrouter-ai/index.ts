// Edge Function: openrouter-ai
// Multi-model OpenRouter proxy (z-ai/glm-5.2 default, Gemini alternatives).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-5.2";

const ALLOWED_MODELS = new Set<string>([
  "z-ai/glm-5.2",
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.1-flash-lite-preview",
]);

interface RequestBody {
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
  max_tokens?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return json({ error: "OPENROUTER_API_KEY not configured" }, 500);

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const {
      prompt,
      systemPrompt,
      model: rawModel,
      jsonMode = false,
      temperature = 0.3,
      max_tokens,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return json({ error: "`prompt` (string) is required" }, 400);
    }
    if (prompt.length > 32000) {
      return json({ error: "`prompt` too long (max 32000 chars)" }, 400);
    }

    const model = rawModel && ALLOWED_MODELS.has(rawModel) ? rawModel : DEFAULT_MODEL;

    const finalSystem = jsonMode
      ? `${systemPrompt ? systemPrompt + "\n\n" : ""}Răspunde DOAR cu JSON valid, fără text în afara obiectului JSON și fără code fences.`
      : systemPrompt;

    const messages = [
      ...(finalSystem ? [{ role: "system", content: finalSystem }] : []),
      { role: "user", content: prompt },
    ];

    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.3)),
      ...(max_tokens ? { max_tokens: Number(max_tokens) } : {}),
    };

    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }
    if (model.startsWith("z-ai/")) {
      payload.provider = { require_fp8: true };
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://realtrust.ro",
        "X-Title": "RealTrust AI Engine",
      },
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* keep raw */ }

    if (!upstream.ok) {
      console.error("OpenRouter error", upstream.status, raw);
      const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 502;
      return json({ error: `OpenRouter ${upstream.status}`, details: data ?? raw }, status);
    }

    const text: string = data?.choices?.[0]?.message?.content ?? "";
    let parsedJson: unknown = null;
    if (jsonMode && text) {
      try { parsedJson = JSON.parse(text); } catch { /* leave null */ }
    }

    return json({
      model: data?.model ?? model,
      text,
      json: parsedJson,
      usage: data?.usage ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("openrouter-ai error:", message);
    return json({ error: message }, 500);
  }
});
