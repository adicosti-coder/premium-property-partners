import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    const { message, language = "ro", conversationHistory = [] }: ChatRequest = await req.json();

    console.log(`AI Chatbot request - Language: ${language}, Message: ${message}`);

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

    // Use Lovable AI (OpenRouter)
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://realtrustaparthotel.lovable.app",
        "X-Title": "ApArt Hotel Chatbot",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenRouter API error:", data);
      throw new Error(data.error?.message || "API error");
    }

    const assistantResponse = data.choices?.[0]?.message?.content || 
      (language === "en" 
        ? "I apologize, I couldn't process your request. Please try again or contact us on WhatsApp."
        : "Îmi pare rău, nu am putut procesa cererea. Te rog încearcă din nou sau contactează-ne pe WhatsApp.");

    console.log("AI Chatbot response generated successfully");

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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
