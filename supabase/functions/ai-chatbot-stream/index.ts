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
      : "https://www.realtrust.ro/oaspeti";
    return `  • ${p.name} (${p.property_code}) – ${p.tag}${revenue}\n    Rezervare: ${bookingLink}`;
  }).join("\n");

  const fallbackBooking = "https://www.realtrust.ro/oaspeti";
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

=== INVESTMENT CALCULATION LOGIC ===
Use this formula for investor inquiries:
• Studio: base revenue 1000€/month
• 2-room apartment: base revenue 1400€/month
• 3-room apartment: base revenue 2000€/month
Zone multipliers: Center/Old Town = ×1.2 | Iulius Town/Dumbravița = ×1.1 | Other zones = ×1.0
ROI benchmark: 9.4% average annual yield
Always recommend downloading the "Investor Guide 2026" at https://www.realtrust.ro/pentru-proprietari

=== FOR PROPERTY OWNERS ===
• Complete property management
• +40% income vs traditional rent
• Free professional photography
• Transparent monthly reporting
• Commission: 15-20%
• Owner portal: https://www.realtrust.ro/portal-proprietar

=== 4-LAYER SAFETY SYSTEM (use when owner expresses doubts) ===
1. 🔍 **Screening**: Rigorous guest identity verification before every booking
2. 📡 **Monitoring**: Smart noise sensors (Minut/NoiseAware) prevent parties in real-time
3. 🏠 **Inspection**: Physical check & preventive maintenance after every checkout
4. 🛡️ **Insurance**: Platform protection + partner insurance up to €3,000,000

=== COMMISSION OBJECTION HANDLING ===
When owners question the commission: Explain that management pays for itself because the Dynamic Pricing system delivers 30-60% higher net profit than standard rent. Example: a studio renting for 400€/month standard generates ~1000€/month in short-term rental, minus 20% commission = 800€ net = +100% more.

=== LEAD CAPTURE ===
When a user provides their phone number (to receive profit simulation on WhatsApp), respond with: "📱 Excellent! I am sending your personalized simulation right now on WhatsApp. You will receive it in less than 2 minutes."

=== RESPONSE RULES ===
1. Respond ONLY in English
2. Be friendly, detailed, and professional. Use tables and emojis (🏠, 📈, 📍, 💰) for readability
3. Always mention the DIRECT5 code for direct bookings
4. For availability/pricing questions: ALWAYS include: "To check availability and book one of our premium apartments, I recommend using [our official platform](${fallbackBooking})" and also offer WhatsApp
5. For owner inquiries: direct to https://www.realtrust.ro/pentru-proprietari and prioritize downloading the "Investor Guide 2026"
6. Never invent prices – use only the data above or say "contact us"
7. Format responses with markdown for readability
8. STRICTLY FORBIDDEN: NEVER recommend external tourism sites (TripAdvisor, Google Maps, Booking.com guides, etc.)! All recommendations must come from our own internal content
9. For tourism questions about Timișoara (what to visit, restaurants, activities): ALWAYS direct to [our complete tourist guide on the Blog](https://www.realtrust.ro/blog) and [interactive map with points of interest](https://www.realtrust.ro/oaspeti)
10. For area, location, attraction recommendations: mention our detailed guide on blog and interactive map on guests page
11. Initial greeting: "Welcome to RealTrust & ApArt Hotel Timișoara! 🏠 Are you looking for premium accommodation or interested in our investment opportunities with 9.4% ROI? How can I help you?"
12. At the END of each conversation (after 3+ exchanges), ask for a rating: "How would you rate this conversation? (1-5 ⭐)"`;
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

=== LOGICA DE CALCUL INVESTIȚII ===
Folosește această formulă pentru întrebări de la investitori:
• Studio: venit de bază 1000€/lună
• Apartament 2 camere: venit de bază 1400€/lună
• Apartament 3 camere: venit de bază 2000€/lună
Multiplicatori zonă: Centru/Cetate = ×1.2 | Iulius Town/Dumbravița = ×1.1 | Alte zone = ×1.0
ROI de referință: 9.4% randament anual mediu
Prioritizează descărcarea „Ghidului Investitorului 2026" de pe https://www.realtrust.ro/pentru-proprietari

=== PENTRU PROPRIETARI ===
• Management complet proprietate
• +40% venit vs chirie tradițională
• Fotografii profesionale gratuite
• Raportare lunară transparentă
• Comision: 15-20%
• Portal proprietar: https://www.realtrust.ro/portal-proprietar

=== SISTEMUL DE SIGURANȚĂ ÎN 4 STRATURI (folosește când proprietarul are dubii) ===
1. 🔍 **Filtrare**: Verificarea riguroasă a identității oaspeților înainte de fiecare rezervare
2. 📡 **Monitorizare**: Senzori de zgomot inteligenți (Minut/NoiseAware) pentru prevenirea petrecerilor în timp real
3. 🏠 **Inspecție**: Verificare fizică și mentenanță preventivă după fiecare check-out
4. 🛡️ **Asigurare**: Protecție prin platforme și asigurări partnere de până la 3.000.000 EUR

=== RĂSPUNS LA OBIECȚIA COMISIONULUI ===
Când proprietarii contestă comisionul: Explică că managementul se auto-plătește deoarece sistemul Dynamic Pricing aduce un profit net cu 30-60% mai mare decât chiria standard. Exemplu: un studio cu chirie standard 400€/lună generează ~1000€/lună în regim hotelier, minus 20% comision = 800€ net = +100% mai mult.

=== CAPTARE LEAD-URI ===
Când un utilizator furnizează numărul de telefon (pentru a primi simularea de profit pe WhatsApp), răspunde cu: "📱 Excelent! Vă trimit simularea personalizată chiar acum pe WhatsApp. O veți primi în mai puțin de 2 minute."

=== REGULI RĂSPUNS ===
1. Răspunde DOAR în română, folosind formulă de politețe "dumneavoastră"
2. Fii prietenos, detaliat și profesional. Folosește tabele și emoji-uri (🏠, 📈, 📍, 💰) pentru lizibilitate
3. Menționează codul DIRECT5 pentru rezervări directe
4. Pentru întrebări despre disponibilitate/prețuri: ÎNTOTDEAUNA include: "Pentru a verifica disponibilitatea și a rezerva unul dintre apartamentele noastre premium, vă recomand să utilizați [platforma noastră oficială](${fallbackBooking})" și oferă WhatsApp ca alternativă
5. Pentru proprietari: îndrumă către https://www.realtrust.ro/pentru-proprietari și prioritizează descărcarea „Ghidului Investitorului 2026"
6. Nu inventa prețuri – folosește doar datele de mai sus sau spune "contactați-ne"
7. Formatează răspunsurile cu markdown pentru lizibilitate
8. STRICT INTERZIS: Nu recomanda NICIODATĂ site-uri externe de turism (TripAdvisor, Google Maps, ghiduri Booking.com, etc.)! Toate recomandările trebuie să fie din conținutul nostru intern
9. Pentru întrebări turistice despre Timișoara (ce să vizitezi, restaurante, activități): ÎNTOTDEAUNA trimite către [Ghidul nostru turistic complet pe Blog](https://www.realtrust.ro/blog) și către [harta interactivă cu puncte de interes](https://www.realtrust.ro/oaspeti)
10. Pentru recomandări de zone, locuri, atracții: menționează ghidul detaliat pe blog și harta interactivă pe pagina pentru oaspeți
11. Salutul inițial: "Bine ați venit la RealTrust & ApArt Hotel Timișoara! 🏠 Căutați o cazare premium sau sunteți interesat de oportunitățile noastre de investiție cu ROI de 9.4%? Cu ce vă pot ajuta?"
12. La FINALUL fiecărei conversații (după 3+ schimburi), solicită un rating: "Cum ați evalua această conversație? (1-5 ⭐)"`;
}

// ---------- Lead Detection & Save ----------

async function detectAndSaveLead(message: string, conversationHistory: any[], language: string) {
  // Detect phone numbers in the latest user message
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const match = message.match(phoneRegex);
  if (!match) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // Extract name from conversation context
  let name = "Lead din Chat AI";
  const allMessages = conversationHistory.map((m: any) => m.content).join(" ") + " " + message;
  
  // Try to find a name pattern
  const namePatterns = [
    /(?:mă numesc|numele meu este|sunt|my name is|i am|i'm)\s+([A-ZÀ-Ž][a-zà-ž]+(?:\s+[A-ZÀ-Ž][a-zà-ž]+)?)/i,
  ];
  for (const pattern of namePatterns) {
    const nameMatch = allMessages.match(pattern);
    if (nameMatch) { name = nameMatch[1]; break; }
  }

  // Detect property type from conversation
  let propertyType = "studio";
  if (/3\s*cam|three.?room|trei.?cam/i.test(allMessages)) propertyType = "3_camere";
  else if (/2\s*cam|two.?room|două.?cam|doua.?cam/i.test(allMessages)) propertyType = "2_camere";

  // Detect zone for revenue estimation
  let zoneMultiplier = 1.0;
  let estimatedRevenue = 1000; // default studio
  if (propertyType === "2_camere") estimatedRevenue = 1400;
  else if (propertyType === "3_camere") estimatedRevenue = 2000;
  
  if (/centru|cetate|center|old.?town/i.test(allMessages)) zoneMultiplier = 1.2;
  else if (/iulius|dumbrav/i.test(allMessages)) zoneMultiplier = 1.1;
  
  estimatedRevenue = Math.round(estimatedRevenue * zoneMultiplier);

  try {
    await sb.from("leads").insert({
      name,
      whatsapp_number: match[0].replace(/\s/g, ""),
      property_type: propertyType,
      property_area: propertyType === "studio" ? 35 : propertyType === "2_camere" ? 55 : 75,
      calculated_net_profit: Math.round(estimatedRevenue * 0.8),
      calculated_yearly_profit: Math.round(estimatedRevenue * 0.8 * 12),
      source: "Gemini AI Chat",
      simulation_data: {
        zone_multiplier: zoneMultiplier,
        estimated_monthly_revenue: estimatedRevenue,
        property_type: propertyType,
        conversation_length: conversationHistory.length,
      },
    });
    console.log(`[ai-chatbot-stream] Lead saved: ${match[0]}`);
  } catch (err) {
    console.error("[ai-chatbot-stream] Failed to save lead:", err);
  }
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

    // Detect and save leads (phone number trigger)
    detectAndSaveLead(message, conversationHistory, language).catch(console.error);

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
        max_tokens: 800,
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
