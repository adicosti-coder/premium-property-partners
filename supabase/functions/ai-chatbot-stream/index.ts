import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: existing.resetTime - now };
  }

  existing.count++;
  rateLimitStore.set(ip, existing);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count, resetIn: existing.resetTime - now };
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  const userAgent = req.headers.get("user-agent") || "";
  const apiKey = req.headers.get("apikey") || "";
  let hash = 0;
  const str = userAgent + apiKey;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

// Verify hCaptcha token
async function verifyCaptcha(token: string, formType: string, ipAddress: string, userAgent: string): Promise<boolean> {
  const secretKey = Deno.env.get("HCAPTCHA_SECRET_KEY");
  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY not configured");
    return false;
  }

  try {
    const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const result = await verifyResponse.json();
    console.log("hCaptcha verification result:", JSON.stringify(result));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("captcha_logs").insert({
      form_type: formType,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: result.success,
      error_codes: result["error-codes"] || null,
      score: result.score || null,
      hostname: result.hostname || null,
    });

    return result.success === true;
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return false;
  }
}

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Verifică disponibilitatea unui apartament pentru o anumită perioadă. Check apartment availability for a date range.",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Data check-in în format YYYY-MM-DD" },
          check_out: { type: "string", description: "Data check-out în format YYYY-MM-DD" },
          guests: { type: "number", description: "Numărul de oaspeți" },
        },
        required: ["check_in", "check_out"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_price",
      description: "Calculează prețul estimativ pentru o rezervare. Calculate estimated price for a booking.",
      parameters: {
        type: "object",
        properties: {
          nights: { type: "number", description: "Numărul de nopți" },
          apartment_type: { type: "string", description: "Tipul apartamentului: studio, 1-bedroom, 2-bedroom" },
          guests: { type: "number", description: "Numărul de oaspeți" },
        },
        required: ["nights"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_property_info",
      description: "Obține informații despre proprietățile disponibile. Get information about available properties.",
      parameters: {
        type: "object",
        properties: {
          property_name: { type: "string", description: "Numele proprietății (opțional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_owner_profit",
      description: "Calculează profitul estimativ pentru un proprietar. Calculate estimated profit for a property owner.",
      parameters: {
        type: "object",
        properties: {
          property_area: { type: "number", description: "Suprafața proprietății în mp" },
          property_type: { type: "string", description: "Tipul proprietății: studio, garsoniera, 2-camere, 3-camere" },
          location: { type: "string", description: "Locația proprietății" },
        },
        required: ["property_area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_viewing",
      description: "Programează o vizionare de apartament pentru oaspeți sau o evaluare gratuită pentru proprietari. Schedule an apartment viewing for guests or a free property evaluation for owners.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Numele complet al persoanei" },
          phone: { type: "string", description: "Numărul de telefon sau WhatsApp" },
          email: { type: "string", description: "Adresa de email (opțional)" },
          date: { type: "string", description: "Data dorită pentru programare în format YYYY-MM-DD" },
          time: { type: "string", description: "Ora dorită (ex: 10:00, 14:30)" },
          type: { type: "string", description: "Tipul programării: 'viewing' (vizionare apartament) sau 'evaluation' (evaluare proprietate)" },
          property_address: { type: "string", description: "Adresa proprietății de evaluat (pentru proprietari)" },
          notes: { type: "string", description: "Note sau cerințe speciale" },
        },
        required: ["name", "phone", "date", "time", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_local_recommendations",
      description: "Oferă recomandări locale pentru oaspeți: restaurante, baruri, atracții turistice, cafenele. Get local recommendations for guests.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Categoria: restaurants, cafes, bars, attractions, shopping, transport" },
          preferences: { type: "string", description: "Preferințe specifice (ex: romantic, family-friendly, budget)" },
        },
        required: ["category"],
      },
    },
  },
];

// Execute tool calls
async function executeTool(name: string, args: Record<string, unknown>, supabase: any): Promise<string> {
  console.log(`Executing tool: ${name}`, args);

  switch (name) {
    case "check_availability": {
      const checkIn = args.check_in as string;
      const checkOut = args.check_out as string;
      const guests = (args.guests as number) || 2;

      // Query bookings to check availability
      const { data: bookings } = await supabase
        .from("bookings")
        .select("property_id, check_in, check_out")
        .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`)
        .eq("status", "confirmed");

      const { data: properties } = await supabase
        .from("properties")
        .select("id, name, location")
        .eq("is_active", true)
        .limit(5);

      const bookedPropertyIds = new Set(bookings?.map((b: any) => b.property_id) || []);
      const available = properties?.filter((p: any) => !bookedPropertyIds.has(p.id)) || [];

      if (available.length > 0) {
        return `✅ **Disponibilitate pentru ${checkIn} - ${checkOut}** (${guests} oaspeți)\n\n` +
          `Am găsit **${available.length}** apartamente disponibile:\n\n` +
          available.map((p: any) => `• **${p.name}** - ${p.location}`).join("\n") +
          `\n\n📞 Pentru rezervare, contactează-ne pe WhatsApp: +40723154520 sau folosește codul **DIRECT5** pentru 5% discount!`;
      } else {
        return `⚠️ Din păcate, nu avem disponibilitate pentru perioada ${checkIn} - ${checkOut}.\n\n` +
          `Te rugăm să încerci alte date sau să ne contactezi pe WhatsApp: +40723154520 pentru alternative.`;
      }
    }

    case "calculate_price": {
      const nights = args.nights as number;
      const apartmentType = (args.apartment_type as string) || "studio";
      const guests = (args.guests as number) || 2;

      // Price per night based on apartment type
      const basePrices: Record<string, number> = {
        "studio": 55,
        "1-bedroom": 75,
        "2-bedroom": 95,
        "garsoniera": 55,
        "2-camere": 75,
        "3-camere": 95,
      };

      const basePrice = basePrices[apartmentType.toLowerCase()] || 65;
      let totalPrice = basePrice * nights;

      // Discounts
      let discount = 0;
      if (nights >= 7) discount = 10;
      else if (nights >= 3) discount = 5;

      const discountedPrice = totalPrice * (1 - discount / 100);

      return `💰 **Estimare preț pentru ${nights} nopți**\n\n` +
        `• Tip: **${apartmentType}**\n` +
        `• Oaspeți: **${guests}**\n` +
        `• Preț/noapte: **€${basePrice}**\n` +
        `• Subtotal: **€${totalPrice}**\n` +
        (discount > 0 ? `• Discount (${discount}%): **-€${(totalPrice - discountedPrice).toFixed(0)}**\n` : "") +
        `• **Total: €${discountedPrice.toFixed(0)}**\n\n` +
        `🎁 Folosește codul **DIRECT5** pentru încă 5% reducere la rezervarea directă!`;
    }

    case "get_property_info": {
      const propertyName = args.property_name as string;

      let query = supabase
        .from("properties")
        .select("name, location, description_ro, features, tag")
        .eq("is_active", true);

      if (propertyName) {
        query = query.ilike("name", `%${propertyName}%`);
      }

      const { data: properties } = await query.limit(5);

      if (properties && properties.length > 0) {
        return `🏠 **Proprietățile noastre:**\n\n` +
          properties.map((p: any) => 
            `**${p.name}** (${p.tag})\n` +
            `📍 ${p.location}\n` +
            `${p.description_ro?.substring(0, 100)}...\n` +
            `✨ ${p.features?.slice(0, 3).join(", ")}`
          ).join("\n\n") +
          `\n\n👉 Vezi toate apartamentele: [Proprietăți](/pentru-oaspeti)`;
      } else {
        return `Nu am găsit informații despre "${propertyName}". Contactează-ne pentru detalii.`;
      }
    }

    case "calculate_owner_profit": {
      const area = args.property_area as number;
      const propertyType = (args.property_type as string) || "2-camere";
      const location = (args.location as string) || "Timișoara";

      // Pricing logic based on area
      const nightlyRate = area <= 40 ? 55 : area <= 60 ? 75 : 95;
      const occupancyRate = 0.75;
      const daysPerMonth = 30;
      const grossIncome = nightlyRate * daysPerMonth * occupancyRate;
      const managementFee = 0.18;
      const netIncome = grossIncome * (1 - managementFee);

      // Compare to traditional rent
      const traditionalRent = area * 10; // €10/mp estimated
      const difference = netIncome - traditionalRent;
      const percentIncrease = ((netIncome / traditionalRent) - 1) * 100;

      return `📊 **Estimare profit pentru proprietatea ta**\n\n` +
        `• Suprafață: **${area} mp**\n` +
        `• Tip: **${propertyType}**\n` +
        `• Locație: **${location}**\n\n` +
        `**Cu ApArt Hotel:**\n` +
        `• Venit brut lunar: **€${grossIncome.toFixed(0)}**\n` +
        `• Comision management (18%): **€${(grossIncome * managementFee).toFixed(0)}**\n` +
        `• **Venit net lunar: €${netIncome.toFixed(0)}**\n\n` +
        `**Comparație:**\n` +
        `• Chirie tradițională: ~€${traditionalRent.toFixed(0)}/lună\n` +
        `• **Diferență: +€${difference.toFixed(0)}/lună (+${percentIncrease.toFixed(0)}%)**\n\n` +
        `📞 Contactează-ne pentru o evaluare personalizată: [WhatsApp](https://wa.me/40723154520)`;
    }

    case "schedule_viewing": {
      const name = args.name as string;
      const phone = args.phone as string;
      const email = (args.email as string) || "";
      const date = args.date as string;
      const time = args.time as string;
      const appointmentType = (args.type as string) || "viewing";
      const propertyAddress = (args.property_address as string) || "";
      const notes = (args.notes as string) || "";

      // Send to Make.com webhook
      const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
      
      if (makeWebhookUrl) {
        try {
          const webhookPayload = {
            source: "ai_chatbot",
            type: appointmentType,
            appointment: {
              name,
              phone,
              email,
              date,
              time,
              property_address: propertyAddress,
              notes,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              language: "ro",
            },
          };

          console.log("Sending appointment to Make.com:", JSON.stringify(webhookPayload));
          
          await fetch(makeWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookPayload),
          });
        } catch (webhookError) {
          console.error("Make.com webhook error:", webhookError);
        }
      }

      // Also save to leads table
      await supabase.from("leads").insert({
        name,
        whatsapp_number: phone,
        email,
        property_type: appointmentType === "evaluation" ? "evaluare" : "vizionare",
        property_area: 0,
        message: `Programare ${appointmentType}: ${date} la ${time}. ${propertyAddress ? `Adresă: ${propertyAddress}. ` : ""}${notes}`,
        source: "ai_chatbot_scheduling",
      });

      if (appointmentType === "evaluation") {
        return `✅ **Programare confirmată pentru evaluare!**\n\n` +
          `📋 **Detalii programare:**\n` +
          `• **Nume:** ${name}\n` +
          `• **Telefon:** ${phone}\n` +
          `• **Data:** ${date}\n` +
          `• **Ora:** ${time}\n` +
          `${propertyAddress ? `• **Adresa proprietății:** ${propertyAddress}\n` : ""}` +
          `${notes ? `• **Note:** ${notes}\n` : ""}\n` +
          `Un consultant ApArt Hotel te va contacta în curând pentru confirmare.\n\n` +
          `📞 Pentru întrebări urgente: [WhatsApp](https://wa.me/40723154520)`;
      } else {
        return `✅ **Programare confirmată pentru vizionare!**\n\n` +
          `📋 **Detalii programare:**\n` +
          `• **Nume:** ${name}\n` +
          `• **Telefon:** ${phone}\n` +
          `• **Data:** ${date}\n` +
          `• **Ora:** ${time}\n` +
          `${notes ? `• **Note:** ${notes}\n` : ""}\n` +
          `Te vom contacta pentru a confirma apartamentul disponibil și locația exactă.\n\n` +
          `📞 Pentru întrebări: [WhatsApp](https://wa.me/40723154520)`;
      }
    }

    case "get_local_recommendations": {
      const category = (args.category as string).toLowerCase();
      const preferences = (args.preferences as string) || "";

      // Fetch POIs from database
      const categoryMap: Record<string, string[]> = {
        restaurants: ["restaurant", "fine_dining"],
        cafes: ["cafe", "coffee"],
        bars: ["bar", "nightlife", "cocktail"],
        attractions: ["landmark", "museum", "park", "tourist"],
        shopping: ["mall", "shopping"],
        transport: ["transport", "station"],
      };

      const dbCategories = categoryMap[category] || [category];
      
      const { data: pois } = await supabase
        .from("points_of_interest")
        .select("name, name_en, description, address, rating, category")
        .eq("is_active", true)
        .in("category", dbCategories)
        .order("rating", { ascending: false })
        .limit(5);

      if (pois && pois.length > 0) {
        const categoryLabels: Record<string, string> = {
          restaurants: "🍽️ Restaurante recomandate",
          cafes: "☕ Cafenele de top",
          bars: "🍸 Baruri & Viață de noapte",
          attractions: "🏛️ Atracții turistice",
          shopping: "🛍️ Shopping",
          transport: "🚌 Transport",
        };

        return `${categoryLabels[category] || "📍 Locuri recomandate"}\n\n` +
          pois.map((poi: any, idx: number) => 
            `${idx + 1}. **${poi.name}**${poi.rating ? ` ⭐${poi.rating}` : ""}\n` +
            `   📍 ${poi.address || "Timișoara"}\n` +
            `   ${poi.description ? poi.description.substring(0, 80) + "..." : ""}`
          ).join("\n\n") +
          `\n\n💡 *Tip: Menționează că ești oaspete ApArt Hotel pentru o experiență VIP!*`;
      } else {
        return `🔍 Nu am găsit recomandări pentru "${category}" în baza noastră.\n\n` +
          `Te sugerez să verifici:\n` +
          `• Google Maps pentru opțiuni actualizate\n` +
          `• Întreabă-ne pe WhatsApp pentru sfaturi personalizate: +40723154520`;
      }
    }

    default:
      return "Funcție necunoscută.";
  }
}

const SYSTEM_PROMPT_RO = `Ești asistentul virtual premium al ApArt Hotel Timișoara - un serviciu de administrare apartamente în regim hotelier cu rating 4.9/5 și ocupare 98%.

## PERSONALITATE
- Răspunzi profesionist, cald și empatic
- Folosești formatare Markdown avansată: **bold**, *italic*, liste, link-uri, emoji
- Ești proactiv - anticipezi nevoile și oferi informații relevante înainte să fie cerute
- Ghidezi utilizatorii către acțiuni concrete cu CTA-uri clare
- Personalizezi răspunsurile în funcție de context (oaspete vs proprietar)
- Răspunzi concis dar complet, evitând textele lungi nenecesare

## INFORMAȚII CHEIE BUSINESS
- **Rating**: ⭐ 4.9/5 pe toate platformele
- **Ocupare**: 98% anual
- **Contact rapid**: WhatsApp +40723154520
- **Cod discount**: **DIRECT5** pentru 5% reducere la rezervări directe
- **Locație**: Timișoara, România

## CAPABILITĂȚI DE PROGRAMARE (FOARTE IMPORTANT!)
Poți programa vizionări și evaluări direct din chat. Când un utilizator vrea să programeze o vizionare:
1. **ÎNTREABĂ ÎNTOTDEAUNA MAI ÎNTÂI**: "🔍 Vrei să vizionezi un apartament pentru o potențială achiziție (cumpărare) sau pentru cazare?"
2. După ce primești răspunsul, cere-i informațiile necesare conversațional (nume, telefon, data, ora)
3. Folosește tool-ul schedule_viewing pentru a finaliza programarea
4. Pentru **oaspeți**: programează vizionări de apartamente (cazare)
5. Pentru **cumpărători/investitori**: programează vizionări pentru achiziție

## SERVICII CONCIERGE LOCAL
Poți oferi recomandări personalizate pentru oaspeți folosind tool-ul get_local_recommendations:
- Restaurante și cafenele de top
- Baruri și viață de noapte
- Atracții turistice în Timișoara
- Shopping și transport

## SERVICII PENTRU OASPEȚI
- Self check-in 24/7 cu smart lock (cod digital)
- Apartamente premium în zone centrale (Piața Unirii, ISHO, City of Mara)
- WiFi de mare viteză, Netflix, Smart TV
- Bucătărie complet utilată, mașină de spălat
- Parcare gratuită (la majoritatea proprietăților)
- Curățenie profesională certificată

## SERVICII PENTRU PROPRIETARI
- Management complet "hands-off"
- +40% venituri vs chirie tradițională
- Fotografii profesionale GRATUITE la onboarding
- Optimizare listing-uri pe 5+ platforme (Booking, Airbnb, VRBO)
- Prețuri dinamice bazate pe AI și date de piață
- Raportare lunară transparentă cu acces la dashboard
- Mentenanță preventivă și reactivă
- Comision competitiv de doar 18%

## INSTRUCȚIUNI CRITICE
1. **FOLOSEȘTE TOOL-URILE** pentru date precise - nu inventa disponibilități sau prețuri
2. **PROGRAMEAZĂ ACTIV** - când cineva vrea o întâlnire, colectează datele și folosește schedule_viewing
3. **FORMATEAZĂ RĂSPUNSURILE** cu Markdown pentru aspect premium
4. **MENȚIONEAZĂ CODUL DIRECT5** când discuți despre rezervări
5. **OFERĂ RECOMANDĂRI LOCALE** când oaspeții cer sfaturi despre oraș
6. **FII SPECIFIC** - dă numere, date, exemple concrete
7. **OFERĂ NEXT STEPS** clare la finalul fiecărui răspuns`;

const SYSTEM_PROMPT_EN = `You are the premium virtual assistant of ApArt Hotel Timișoara - an apartment management service for short-term rentals with a 4.9/5 rating and 98% occupancy.

## PERSONALITY
- Respond professionally, warmly, and empathetically
- Use advanced Markdown formatting: **bold**, *italic*, lists, links, emoji
- Be proactive - anticipate needs and offer relevant information before it's requested
- Guide users towards concrete actions with clear CTAs
- Personalize responses based on context (guest vs owner)
- Respond concisely but completely, avoiding unnecessarily long texts

## KEY BUSINESS INFO
- **Rating**: ⭐ 4.9/5 across all platforms
- **Occupancy**: 98% annually
- **Quick Contact**: WhatsApp +40723154520
- **Discount Code**: **DIRECT5** for 5% off direct bookings
- **Location**: Timișoara, Romania

## SCHEDULING CAPABILITIES (VERY IMPORTANT!)
You can schedule viewings and evaluations directly from chat. When a user wants to schedule:
1. Conversationally ask for required info (name, phone, date, time)
2. Use the schedule_viewing tool to complete the booking
3. For **guests**: schedule apartment viewings
4. For **owners**: schedule free property evaluations

## LOCAL CONCIERGE SERVICES
You can offer personalized recommendations for guests using the get_local_recommendations tool:
- Top restaurants and cafes
- Bars and nightlife
- Tourist attractions in Timișoara
- Shopping and transport

## GUEST SERVICES
- 24/7 self check-in with smart lock (digital code)
- Premium apartments in central areas (Piața Unirii, ISHO, City of Mara)
- High-speed WiFi, Netflix, Smart TV
- Fully equipped kitchen, washing machine
- Free parking (at most properties)
- Certified professional cleaning

## OWNER SERVICES
- Complete "hands-off" management
- +40% income vs traditional rent
- FREE professional photography at onboarding
- Listing optimization on 5+ platforms (Booking, Airbnb, VRBO)
- AI-powered dynamic pricing based on market data
- Transparent monthly reporting with dashboard access
- Preventive and reactive maintenance
- Competitive 18% commission only

## CRITICAL INSTRUCTIONS
1. **USE TOOLS** for precise data - never make up availability or prices
2. **ACTIVELY SCHEDULE** - when someone wants an appointment, collect data and use schedule_viewing
3. **FORMAT RESPONSES** with Markdown for premium appearance
4. **MENTION DIRECT5 CODE** when discussing bookings
5. **OFFER LOCAL RECOMMENDATIONS** when guests ask about the city
6. **BE SPECIFIC** - give numbers, dates, concrete examples
7. **OFFER CLEAR NEXT STEPS** at the end of each response`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      `data: ${JSON.stringify({ error: "rate_limit", message: "Prea multe cereri. Așteaptă un moment." })}\n\n`,
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      }
    );
  }

  try {
    const { message, language = "ro", conversationHistory = [] } = await req.json();

    // CAPTCHA verification removed - rate limiting provides sufficient protection

    if (!message || message.length > 2000) {
      return new Response(
        `data: ${JSON.stringify({ error: "invalid_message" })}\n\n`,
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
      );
    }

    console.log(`AI Chatbot Stream - Language: ${language}, Message: ${message.substring(0, 50)}...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const systemPrompt = language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_RO;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // First API call - may include tool calls
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        tools,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          `data: ${JSON.stringify({ error: "ai_rate_limit" })}\n\n`,
          { status: 429, headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      }
      
      throw new Error("AI gateway error");
    }

    // Create a TransformStream to process the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  fullContent += delta.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: delta.content })}\n\n`));
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index || 0;
                    if (!toolCalls[idx]) {
                      toolCalls[idx] = { id: tc.id || "", name: tc.function?.name || "", arguments: "" };
                    }
                    if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                    if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
                    if (tc.id) toolCalls[idx].id = tc.id;
                  }
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }

          // Process tool calls if any
          if (toolCalls.length > 0) {
            console.log("Processing tool calls:", toolCalls.map(tc => tc.name));

            for (const tc of toolCalls) {
              if (!tc.name) continue;
              
              try {
                const args = JSON.parse(tc.arguments || "{}");
                const toolResult = await executeTool(tc.name, args, supabase);
                
                // Stream the tool result
                const chunks = toolResult.match(/.{1,50}/g) || [toolResult];
                for (const chunk of chunks) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
                  await new Promise(r => setTimeout(r, 20)); // Small delay for smooth streaming
                }
              } catch (e) {
                console.error("Tool execution error:", e);
              }
            }
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error in ai-chatbot-stream function:", error);
    return new Response(
      `data: ${JSON.stringify({ error: error.message })}\n\n`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      }
    );
  }
};

serve(handler);
