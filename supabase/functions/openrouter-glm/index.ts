// Edge Function: openrouter-glm
// Calls OpenRouter chat completions using the z-ai/glm-5.2 model.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "z-ai/glm-5.2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require authenticated user (JWT). Prevents anonymous cost exhaustion.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      context,
      system,
      temperature = 0.3,
      max_tokens,
      messages: overrideMessages,
    } = body ?? {};

    if (!overrideMessages && (!prompt || typeof prompt !== "string")) {
      return new Response(
        JSON.stringify({ error: "`prompt` (string) or `messages` array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages =
      Array.isArray(overrideMessages) && overrideMessages.length > 0
        ? overrideMessages
        : [
            ...(system ? [{ role: "system", content: String(system) }] : []),
            ...(context
              ? [{ role: "system", content: `Context:\n${typeof context === "string" ? context : JSON.stringify(context)}` }]
              : []),
            { role: "user", content: prompt },
          ];

    const payload = {
      model: MODEL,
      messages,
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.3)),
      max_tokens: Math.min(Number(max_tokens) || 4096, 8192),
      provider: { require_fp8: true },
    };

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://realtrust.ro",
        "X-Title": "RealTrust Platform",
      },
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* keep raw */ }

    if (!upstream.ok) {
      console.error("OpenRouter error", upstream.status, raw);
      return new Response(
        JSON.stringify({
          error: `OpenRouter ${upstream.status}`,
          details: data ?? raw,
        }),
        {
          status: upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const text: string = data?.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({
        model: data?.model ?? MODEL,
        text,
        usage: data?.usage ?? null,
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("openrouter-glm error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
