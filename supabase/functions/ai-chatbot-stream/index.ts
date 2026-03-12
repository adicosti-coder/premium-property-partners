import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOOL_DEFINITIONS, executeTool } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Rate Limiting ──────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;
const rateStore = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateStore.get(ip);
  if (!entry || entry.reset < now) {
    rateStore.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}

// ─── System Prompt Builder ──────────────────────────────────

async function buildSystemPrompt(language: string, pageContext: string = "/"): Promise<string> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: properties } = await sb
    .from("properties")
    .select("name, booking_url, tag, location, property_code, estimated_revenue, listing_type")
    .eq("is_active", true)
    .order("display_order");

  const propertyLines = (properties || []).map((p: any) => {
    const revenue = p.estimated_revenue ? ` | Venit: ${p.estimated_revenue}` : "";
    const bookingLink = p.booking_url && p.booking_url !== "#" ? p.booking_url : "https://www.realtrust.ro/oaspeti";
    return `  • ${p.name} (${p.property_code}) – ${p.tag}${revenue} | Rezervare: ${bookingLink}`;
  }).join("\n");

  const whatsapp = "https://wa.me/40723154520";
  const fallbackBooking = "https://www.realtrust.ro/oaspeti";

  const base = language === "en"
    ? `You are ApArt Hotel Timișoara's premium Digital Concierge (powered by RealTrust).`
    : `Ești Concierge-ul Digital premium al ApArt Hotel Timișoara (powered by RealTrust).`;

  return `${base}

=== COMPANY ===
• ApArt Hotel Timișoara (RealTrust) | Timișoara, România
• WhatsApp: ${whatsapp} | Email: adicosti@gmail.com
• Rating: 4.9/5 | Ocupare: 98%

=== PROPERTIES ===
${propertyLines || "Contactați-ne pentru disponibilitate."}
Direct booking: ${fallbackBooking} | Cod discount: DIRECT5 (5% off)

=== HOUSE RULES ===
• Check-in: 15:00+ | Check-out: 11:00 | Quiet: 22-08
• No smoking inside | Pets on request | Smart lock access
• Free WiFi, Netflix, equipped kitchen | Min 2 nights

=== FOR OWNERS ===
• +40% income vs classic rent | Commission: 15-20%
• Free pro photography | Monthly transparent reports
• Portal: https://www.realtrust.ro/portal-proprietar
• Investor Guide 2026: https://www.realtrust.ro/pentru-proprietari

=== 4-LAYER SAFETY ===
1. 🔍 Guest screening | 2. 📡 Noise monitoring | 3. 🏠 Post-checkout inspection | 4. 🛡️ Insurance up to €3M

=== TOOLS (IMPORTANT) ===
You have access to real-time tools. USE THEM proactively:
• **check_availability** — When user asks about dates, availability, booking. ALWAYS use it instead of guessing.
• **calculate_roi** — When user asks about investment, profit, yield, returns. Give precise numbers.
• **schedule_viewing** — When user wants to visit, schedule meeting. Collect name + phone, then call tool.
• **get_tourist_recommendations** — When user asks what to visit, eat, see. ALWAYS use instead of inventing.

=== RESPONSE RULES ===
1. ${language === "en" ? "Respond ONLY in English" : "Răspunde DOAR în română, cu formă de politețe 'dumneavoastră'"}
2. Use markdown formatting, tables, and emojis (🏠📈📍💰) for readability
3. Always mention DIRECT5 code for direct bookings
4. For availability: USE the check_availability tool, then present results in a clear table
5. For ROI/investment: USE calculate_roi tool, present as professional financial analysis
6. For scheduling: Collect name + phone naturally, then USE schedule_viewing tool
7. For tourism: USE get_tourist_recommendations, NEVER recommend external sites (TripAdvisor, Google Maps)
8. Direct owners to https://www.realtrust.ro/pentru-proprietari and Investor Guide 2026
9. NEVER invent prices — use only tool data or say "contactați-ne"
10. After 3+ exchanges, ask for rating: "Cum ați evalua această conversație? (1-5 ⭐)"

=== PAGE CONTEXT ===
The user is currently on: ${pageContext}
${pageContext.includes("/pentru-proprietari") || pageContext.includes("/investitii") ? "→ OWNER/INVESTOR page: Focus on ROI, management fees, Investor Guide 2026. Use calculate_roi proactively." : ""}
${pageContext.includes("/proprietate/") ? "→ PROPERTY DETAIL page: Focus on this specific property — availability, price, amenities. Use check_availability proactively." : ""}
${pageContext.includes("/oaspeti") || pageContext.includes("/pentru-oaspeti") ? "→ GUEST page: Focus on booking, availability, local tips. Use check_availability and get_tourist_recommendations." : ""}
${pageContext.includes("/zona/") ? "→ ZONE LANDING page: Focus on this neighborhood — properties, investment potential, local attractions." : ""}
Adapt your suggestions and tone to match the page context.`;
}

// ─── Lead Detection ─────────────────────────────────────────

async function detectAndSaveLead(message: string, conversationHistory: any[]) {
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const match = message.match(phoneRegex);
  if (!match) return;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const allText = conversationHistory.map((m: any) => m.content).join(" ") + " " + message;

  let name = "Lead din Chat AI";
  const nameMatch = allText.match(/(?:mă numesc|numele meu este|sunt|my name is|i am|i'm)\s+([A-ZÀ-Ž][a-zà-ž]+(?:\s+[A-ZÀ-Ž][a-zà-ž]+)?)/i);
  if (nameMatch) name = nameMatch[1];

  let propertyType = "studio";
  if (/3\s*cam|three.?room/i.test(allText)) propertyType = "3_camere";
  else if (/2\s*cam|two.?room/i.test(allText)) propertyType = "2_camere";

  try {
    await sb.from("leads").insert({
      name,
      whatsapp_number: match[0].replace(/\s/g, ""),
      property_type: propertyType,
      property_area: propertyType === "studio" ? 35 : propertyType === "2_camere" ? 55 : 75,
      source: "AI Chat (Tools)",
    });
  } catch (err) {
    console.error("[lead-save]", err);
  }
}

// ─── Main Handler ───────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!checkRateLimit(getClientIP(req))) {
    return new Response(JSON.stringify({ error: "rate_limit" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { message, language = "ro", conversationHistory = [], pageContext = "/", imageBase64, qualificationContext } = await req.json();

    if ((!message && !imageBase64) || (message && message.length > 2000)) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Async lead detection
    detectAndSaveLead(message, conversationHistory).catch(console.error);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "config_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = await buildSystemPrompt(language, pageContext);

    // Enhance system prompt with qualification context and HostScan capabilities
    if (qualificationContext) {
      systemPrompt += `\n\n=== PROPERTY OWNER QUALIFICATION ===
Owner pre-qualified via wizard:
• Name: ${qualificationContext.name || "N/A"}
• Phone: ${qualificationContext.phone || "N/A"}
• Zone: ${qualificationContext.zone || "N/A"}
Treat this as a warm lead. Focus on ROI analysis for their zone. Use calculate_roi proactively.`;
    }

    systemPrompt += `\n\n=== PHOTO ANALYSIS ===
If the user sends a property photo, analyze:
1. Finish quality (premium/standard/basic) and estimated impact on nightly rate
2. Furnishing style and condition
3. Specific ROI recommendations based on visual assessment
4. Score the property 0-140 points across: Location(30), Finishes(25), Furnishing(25), Layout(20), Amenities(20), Condition(20)

When you complete a full property analysis, include a structured report at the end using this exact format:
<RAPORT_JSON>{"scor": 115, "max_scor": 140, "zona": "ISHO", "roi_estimat": "9.4%", "tarif_noapte": 110, "note_consultant": "Proprietate excelentă cu finisaje premium și potențial ridicat de randament.", "recomandari": ["Optimizare iluminat", "Adăugare smart lock"], "categorie": "Premium"}</RAPORT_JSON>`;

    // Build user message content (text + optional image)
    const userContent: any = imageBase64
      ? [
          { type: "text", text: message || "Am atașat o imagine cu proprietatea mea. Analizează te rog." },
          { type: "image_url", image_url: { url: imageBase64 } },
        ]
      : message;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    console.log(`[chatbot] Request from ${getClientIP(req)}, lang: ${language}`);

    // ─── Step 1: Initial call with tools (non-streaming) ────

    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        tools: TOOL_DEFINITIONS,
        stream: false,
      }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      console.error(`AI gateway error: ${status}`);
      const errKey = status === 429 ? "ai_rate_limit" : status === 402 ? "payment_required" : "ai_error";
      return new Response(JSON.stringify({ error: errKey }), {
        status: status >= 400 && status < 500 ? status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // ─── Step 2: Check if AI wants to call tools ────────────

    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      console.log(`[chatbot] Tool calls: ${toolCalls.map((tc: any) => tc.function.name).join(", ")}`);

      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (tc: any) => {
          let args: Record<string, any> = {};
          try {
            args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          } catch {}
          const result = await executeTool(tc.function.name, args);
          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: result,
          };
        })
      );

      // ─── Step 3: Stream final response with tool results ──

      const finalMessages = [
        ...messages,
        choice.message,
        ...toolResults,
      ];

      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: finalMessages,
          max_tokens: 1200,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        return new Response(JSON.stringify({ error: "ai_error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return streamSSE(streamResponse);
    }

    // ─── No tool calls: stream the initial response as SSE ──

    // If we already have a complete response (non-streaming), convert it to SSE format
    const content = choice?.message?.content || "";
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        // Send content in small chunks to simulate streaming feel
        const chunkSize = 12;
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          await writer.write(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
          // Small delay for natural streaming feel
          if (i + chunkSize < content.length) {
            await new Promise(r => setTimeout(r, 15));
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (error: any) {
    console.error("Error in ai-chatbot-stream:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── SSE Stream Helper ──────────────────────────────────────

function streamSSE(response: Response): Response {
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
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
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
          } catch {}
        }
      }
    } catch (e) {
      console.error("Stream error:", e);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
