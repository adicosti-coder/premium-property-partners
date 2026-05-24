// Voice Agent Context — serves dynamic caller memory from v_prospect_funnel
// Secured via X-Voice-Agent-Secret header matched against VOICE_AGENT_SECRET env.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-voice-agent-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function normalizeRoPhone(raw: string): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("40")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+4" + cleaned;
  return "+40" + cleaned;
}

const UNKNOWN_CONTEXT =
  "CFR NOTE: Apelant necunoscut — numărul nu este în pipeline-ul nostru. " +
  "Adoptă o postură de partener de management imobiliar pentru brandurile RealTrust și ApArt Hotel. " +
  "Califică apelul: află dacă este proprietar interesat de regim hotelier în Timișoara, ce zonă, " +
  "tipul proprietății, numărul de camere și disponibilitatea pentru o evaluare gratuită.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("VOICE_AGENT_SECRET") || "";
  const provided = req.headers.get("x-voice-agent-secret") || "";
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawPhone = (body.phone || "").toString().trim();
  if (!rawPhone) {
    return new Response(JSON.stringify({ error: "Missing 'phone'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const e164 = normalizeRoPhone(rawPhone);
  const digits = rawPhone.replace(/\D/g, "");
  // Build candidate variants for matching across columns that may not be normalized
  const variants = new Set<string>();
  if (rawPhone) variants.add(rawPhone);
  if (e164) variants.add(e164);
  if (digits) {
    variants.add(digits);
    if (digits.startsWith("40")) variants.add("0" + digits.slice(2));
    if (digits.startsWith("0")) variants.add("40" + digits.slice(1));
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Match across phone_normalized / contact_phone / scraper_phone using all variants
  const orParts: string[] = [];
  for (const v of variants) {
    const esc = v.replace(/[(),]/g, "");
    orParts.push(`phone_normalized.eq.${esc}`);
    orParts.push(`contact_phone.eq.${esc}`);
    orParts.push(`scraper_phone.eq.${esc}`);
    // Loose contains match (last 9 digits) to catch formatting differences
    if (esc.length >= 9) {
      const tail = esc.slice(-9);
      orParts.push(`contact_phone.ilike.*${tail}*`);
      orParts.push(`scraper_phone.ilike.*${tail}*`);
      orParts.push(`phone_normalized.ilike.*${tail}*`);
    }
  }

  const { data, error } = await supabase
    .from("v_prospect_funnel")
    .select("*")
    .or(orParts.join(","))
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();


  const agent_memory_context =
    `CFR NOTE: Vorbești cu ${ownerName}. Acest număr este verificat prin Twilio. ` +
    `Detalii proprietate identificată: ${propertyType} cu ${rooms} camere în zona ${zone}, ` +
    `listată la prețul de ${price} EUR. Stadiul actual în funnel-ul nostru: ${funnelStatus}. ` +
    `Scorul inițial AI: ${qualityScore}/100. Note anterioare: ${notes}. ` +
    `Adoptă o postură de partener de management imobiliar pentru brandurile RealTrust și ApArt Hotel.`;

  return new Response(
    JSON.stringify({
      caller_found: true,
      phone_e164: e164,
      agent_memory_context,
      lead: {
        owner_name: ownerName,
        property_type: propertyType,
        rooms,
        zone,
        price,
        funnel_status: funnelStatus,
        quality_score: qualityScore,
      },
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
});
