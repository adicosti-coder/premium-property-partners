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
  if (existing.count >= MAX_REQUESTS_PER_WINDOW) return { allowed: false, remaining: 0 };
  existing.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count };
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown";
}

// ---------- Dynamic System Prompt Builder ----------

async function buildSystemPrompt(language: string): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // Fetch active properties
  const { data: properties } = await sb
    .from("properties")
    .select("name, booking_url, tag, location, property_code, estimated_revenue")
    .eq("is_active", true)
    .order("display_order");

  const propertyLines = (properties || []).map((p: any) => {
    const revenue = p.estimated_revenue ? ` | Venit estimat: ${p.estimated_revenue}` : "";
    const bookingLink = p.booking_url && p.booking_url !== "#"
      ? p.booking_url
      : "https://realtrustaparthotel.lovable.app/oaspeti";
    return `  • ${p.name} (${p.property_code}) – ${p.tag}${revenue}\n    Rezervare: ${bookingLink}`;
  }).join("\n");

  const fallbackBooking = "https://realtrustaparthotel.lovable.app/oaspeti";
  const whatsapp = "https://wa.me/40723154520";

  if (language === "en") {
    return `You are ApArt Hotel Timișoara's premium Digital Concierge (powered by RealTrust).

=== COMPANY INFO ===
• Name: ApArt Hotel Timișoara (RealTrust)
• Location: Timișoara, Romania
• Contact: WhatsApp ${whatsapp} | email adicosti@gmail.com
• Rating: 4.9/5 | Occupancy: 98%

=== HOUSE RULES ===
• Check-in: from 15:00 (flexible with prior arrangement)
• Check-out: until 11:00
• Quiet hours: 22:00 – 08:00
• No smoking inside the apartments
• Pets: accepted on request (additional cleaning fee may apply)
• Smart lock access – no physical key needed
• Free high-speed WiFi, Netflix, fully equipped kitchen
• Parking: depends on property (ask for details)
• Minimum stay: 2 nights (exceptions possible)

=== CURRENT PROPERTIES & PRICES ===
${propertyLines || "  Contact us for current availability."}

Direct booking page: ${fallbackBooking}
Direct booking discount code: DIRECT5 (5% off)

=== FOR PROPERTY OWNERS ===
• Complete property management
• +40% income vs traditional rent
• Free professional photography
• Transparent monthly reporting
• Commission: 15-20%
• Owner portal: https://realtrustaparthotel.lovable.app/portal-proprietar

=== RESPONSE RULES ===
1. Respond ONLY in English
2. Be friendly, concise, and professional
3. Always mention the DIRECT5 code for direct bookings
4. For availability/pricing questions: ALWAYS include this phrase: "Pentru a verifica disponibilitatea și a rezerva unul dintre apartamentele noastre premium, vă recomand să utilizați platforma noastră oficială: ${fallbackBooking}" and also offer WhatsApp as alternative
5. For owner inquiries: direct to the calculator page https://realtrustaparthotel.lovable.app/pentru-proprietari
6. Never invent prices – use only the data above or say "contact us"
7. Format responses with markdown for readability`;
  }

  return `Ești Concierge-ul Digital premium al ApArt Hotel Timișoara (powered by RealTrust).

=== INFORMAȚII COMPANIE ===
• Nume: ApArt Hotel Timișoara (RealTrust)
• Locație: Timișoara, România
• Contact: WhatsApp ${whatsapp} | email adicosti@gmail.com
• Rating: 4.9/5 | Ocupare: 98%

=== REGULILE CASEI ===
• Check-in: de la ora 15:00 (flexibil cu aranjament prealabil)
• Check-out: până la ora 11:00
• Liniște: 22:00 – 08:00
• Fumatul interzis în interiorul apartamentelor
• Animale de companie: acceptate la cerere (taxă suplimentară de curățenie)
• Acces cu smart lock – nu ai nevoie de cheie fizică
• WiFi gratuit de mare viteză, Netflix, bucătărie complet echipată
• Parcare: depinde de proprietate (întreabă pentru detalii)
• Sejur minim: 2 nopți (excepții posibile)

=== PROPRIETĂȚI DISPONIBILE & PREȚURI ===
${propertyLines || "  Contactați-ne pentru disponibilitate."}

Pagina de rezervare directă: ${fallbackBooking}
Cod discount rezervări directe: DIRECT5 (5% reducere)

=== PENTRU PROPRIETARI ===
• Management complet proprietate
• +40% venit vs chirie tradițională
• Fotografii profesionale gratuite
• Raportare lunară transparentă
• Comision: 15-20%
• Portal proprietar: https://realtrustaparthotel.lovable.app/portal-proprietar

=== REGULI RĂSPUNS ===
1. Răspunde DOAR în română
2. Fii prietenos, concis și profesional
3. Menționează codul DIRECT5 pentru rezervări directe
4. Pentru întrebări despre disponibilitate/prețuri: ÎNTOTDEAUNA include această frază: "Pentru a verifica disponibilitatea și a rezerva unul dintre apartamentele noastre premium, vă recomand să utilizați platforma noastră oficială: ${fallbackBooking}" și oferă WhatsApp ca alternativă
5. Pentru proprietari: îndrumă către calculatorul de pe https://realtrustaparthotel.lovable.app/pentru-proprietari
6. Nu inventa prețuri – folosește doar datele de mai sus sau spune "contactați-ne"
7. Formatează răspunsurile cu markdown pentru lizibilitate`;
}

// ---------- Main Handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "rate_limit" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { message, language = "ro", conversationHistory = [] } = await req.json();

    if (!message || message.length > 2000) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "config_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build dynamic system prompt with live DB data
    const systemPrompt = await buildSystemPrompt(language);

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
      const statusMap: Record<number, string> = { 429: "ai_rate_limit", 402: "payment_required" };
      const errorKey = statusMap[response.status] || "ai_error";
      return new Response(JSON.stringify({ error: errorKey }), {
        status: response.status >= 400 && response.status < 500 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            } catch { /* ignore partial JSON */ }
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
