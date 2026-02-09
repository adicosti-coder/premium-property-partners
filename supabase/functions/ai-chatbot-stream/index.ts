import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  existing.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count };
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "unknown";
}

const SYSTEM_PROMPT_RO = `Ești asistentul virtual premium al ApArt Hotel Timișoara.

INFO COMPANIE:
- Nume: ApArt Hotel Timișoara (RealTrust)
- Locație: Timișoara, România
- Contact: WhatsApp +40723154520, email adicosti@gmail.com
- Rating: 4.9/5, Ocupare: 98%

PENTRU OASPEȚI:
- Check-in flexibil cu smart lock
- Apartamente premium în zone centrale
- WiFi, Netflix, facilități complete
- Cod discount rezervări directe: DIRECT5 (5% reducere)

PENTRU PROPRIETARI:
- Management complet proprietate
- +40% venit vs chirie tradițională
- Fotografii profesionale gratuite
- Raportare lunară transparentă
- Comision: 15-20%

REGULI:
1. Răspunde DOAR în română
2. Fii prietenos și concis
3. Menționează codul DIRECT5 pentru rezervări
4. Pentru prețuri specifice: îndrumă către WhatsApp`;

const SYSTEM_PROMPT_EN = `You are ApArt Hotel Timișoara's premium virtual assistant.

COMPANY INFO:
- Name: ApArt Hotel Timișoara (RealTrust)
- Location: Timișoara, Romania
- Contact: WhatsApp +40723154520, email adicosti@gmail.com
- Rating: 4.9/5, Occupancy: 98%

FOR GUESTS:
- Flexible smart lock check-in
- Premium apartments in central areas
- WiFi, Netflix, full amenities
- Direct booking discount: DIRECT5 (5% off)

FOR OWNERS:
- Complete property management
- +40% income vs traditional rent
- Free professional photography
- Transparent monthly reporting
- Commission: 18%

RULES:
1. Respond ONLY in English
2. Be friendly and concise
3. Mention DIRECT5 code for bookings
4. For specific prices: direct to WhatsApp`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "rate_limit" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { message, language = "ro", conversationHistory = [] } = await req.json();

    if (!message || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "invalid_message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "config_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_RO;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    console.log(`[ai-chatbot-stream] Request from ${clientIP}, lang: ${language}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 600,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error(`AI gateway error: ${response.status}`);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ai_rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "ai_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream response back to client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ delta: content })}\n\n`));
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in ai-chatbot-stream:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
