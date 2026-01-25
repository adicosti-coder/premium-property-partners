import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Check and update rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || existing.resetTime < now) {
    // New window or expired - reset
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    const resetIn = existing.resetTime - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  // Increment counter
  existing.count++;
  rateLimitStore.set(ip, existing);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count, resetIn: existing.resetTime - now };
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  // Check various headers for the real client IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }
  
  // Fallback to a hash of user-agent and other identifying info
  const userAgent = req.headers.get("user-agent") || "";
  const apiKey = req.headers.get("apikey") || "";
  return `fallback-${hashCode(userAgent + apiKey)}`;
}

// Simple hash function for fallback IP generation
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

interface ChatRequest {
  message: string;
  language?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

const SYSTEM_PROMPT_RO = `Ești asistentul virtual al ApArt Hotel Timișoara, un serviciu premium de administrare apartamente în regim hotelier.

INFORMAȚII DESPRE COMPANIE:
- Nume: ApArt Hotel Timișoara (parte din RealTrust)
- Locație: Timișoara, România
- Servicii: Administrare apartamente în regim hotelier, management proprietăți
- Contact: WhatsApp +40723154520, email adicosti@gmail.com
- Rată ocupare: 98%
- Rating: 4.9/5 stele

PENTRU OASPEȚI:
- Check-in flexibil cu smart lock
- Apartamente premium în zone centrale
- WiFi gratuit, Netflix, facilități complete
- Cod discount pentru rezervări directe: DIRECT5 (5% reducere)
- Prețuri mai bune la rezervare directă vs Booking/Airbnb

PENTRU PROPRIETARI:
- Management complet al proprietății
- Venit pasiv cu +40% față de chirie tradițională
- Fotografii profesionale gratuite
- Raportare lunară transparentă
- Suport 24/7

REGULI DE RĂSPUNS:
1. Răspunde DOAR în română
2. Fii prietenos, profesionist și concis
3. Ghidează utilizatorii către acțiuni: rezervare, contact WhatsApp, calculator profit
4. Dacă nu știi ceva specific, sugerează să contacteze echipa pe WhatsApp
5. Menționează codul DIRECT5 când vorbești despre rezervări
6. Pentru întrebări despre prețuri specifice, îndrumă către pagina de proprietăți sau WhatsApp`;

const SYSTEM_PROMPT_EN = `You are the virtual assistant of ApArt Hotel Timișoara, a premium apartment management service for short-term rentals.

COMPANY INFORMATION:
- Name: ApArt Hotel Timișoara (part of RealTrust)
- Location: Timișoara, Romania
- Services: Short-term rental apartment management, property management
- Contact: WhatsApp +40723154520, email adicosti@gmail.com
- Occupancy rate: 98%
- Rating: 4.9/5 stars

FOR GUESTS:
- Flexible check-in with smart lock
- Premium apartments in central areas
- Free WiFi, Netflix, complete amenities
- Discount code for direct bookings: DIRECT5 (5% off)
- Better prices when booking directly vs Booking/Airbnb

FOR PROPERTY OWNERS:
- Complete property management
- Passive income +40% compared to traditional rent
- Free professional photography
- Transparent monthly reporting
- 24/7 support

RESPONSE RULES:
1. Respond ONLY in English
2. Be friendly, professional, and concise
3. Guide users towards actions: booking, WhatsApp contact, profit calculator
4. If you don't know something specific, suggest contacting the team on WhatsApp
5. Mention the DIRECT5 code when talking about bookings
6. For specific price questions, direct them to the properties page or WhatsApp`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP);

  console.log(`AI Chatbot - IP: ${clientIP}, Remaining: ${rateLimit.remaining}, Allowed: ${rateLimit.allowed}`);

  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        response: "Ai trimis prea multe mesaje într-un timp scurt. Te rog așteaptă un moment sau contactează-ne pe WhatsApp: +40723154520",
        retryAfter: Math.ceil(rateLimit.resetIn / 1000)
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
          "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + rateLimit.resetIn / 1000).toString(),
          ...corsHeaders,
        },
      }
    );
  }

  try {
    const { message, language = "ro", conversationHistory = [] }: ChatRequest = await req.json();

    // Validate message length to prevent abuse
    if (!message || message.length > 2000) {
      return new Response(
        JSON.stringify({
          error: "Invalid message",
          response: language === "en"
            ? "Message is too long or empty. Please keep messages under 2000 characters."
            : "Mesajul este prea lung sau gol. Te rog păstrează mesajele sub 2000 de caractere."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`AI Chatbot request - Language: ${language}, Message length: ${message.length}`);

    const systemPrompt = language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_RO;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Use Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Upstream rate limit exceeded");
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            response: language === "en" 
              ? "I'm receiving too many requests right now. Please try again in a moment or contact us on WhatsApp."
              : "Primesc prea multe cereri în acest moment. Te rog încearcă din nou într-un moment sau contactează-ne pe WhatsApp."
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ 
            error: "Service temporarily unavailable",
            response: language === "en" 
              ? "Our AI service is temporarily unavailable. Please contact us on WhatsApp: +40723154520"
              : "Serviciul AI este temporar indisponibil. Te rog contactează-ne pe WhatsApp: +40723154520"
          }),
          { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    const assistantResponse = data.choices?.[0]?.message?.content || 
      (language === "en" 
        ? "I apologize, I couldn't process your request. Please try again or contact us on WhatsApp."
        : "Îmi pare rău, nu am putut procesa cererea. Te rog încearcă din nou sau contactează-ne pe WhatsApp.");

    console.log("AI Chatbot response generated successfully");

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          ...corsHeaders 
        },
      }
    );
  } catch (error: any) {
    console.error("Error in ai-chatbot function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "Îmi pare rău, a apărut o eroare. Te rog contactează-ne pe WhatsApp: +40723154520"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
