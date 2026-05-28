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

// ── Andrei core playbook (injected on every call) ─────────────────────
// Hybrid operating model: regim hotelier gestionat de RealTrust + ApArt Hotel.
// • Venitul brut net realizat este cu ~70% MAI MARE decât chiria clasică pe termen
//   lung pe aceeași proprietate (sursa: portofoliu intern, ocupare 75%, ADR mediu).
// • ROI net standard publicat = 9.4%/an după deducerea de 27% pentru management+taxe.
// • Combinația „venit +70% vs chiria clasică de 7%” = argumentul principal când
//   un proprietar întreabă de randament. Andrei NU promite 70% ROI anual — promite
//   „venit cu ~70% mai mare decât închirierea clasică, cu un ROI net de 9.4%/an”.
const ANDREI_ROI_PLAYBOOK =
  "ROI PLAYBOOK (obligatoriu când proprietarul întreabă de randament): " +
  "Modelul nostru HIBRID (regim hotelier gestionat end-to-end de RealTrust + ApArt Hotel) " +
  "generează un venit brut cu aproximativ 70% mai mare decât chiria clasică pe termen lung pe aceeași proprietate, " +
  "rezultând un ROI NET de 9.4% pe an după deducerea standard de 27% (management + taxe + utilități neacoperite). " +
  "Comparativ, chiria clasică în Timișoara aduce 5-7% net. " +
  "Folosește mereu cifre clare: ocupare 75%, ADR mediu pe complex, venit lunar țintă. " +
  "Nu inventa procente. Nu promite ROI > 9.4% pe an decât dacă ai date concrete de la dispatcher.";

const ANDREI_OBJECTIONS_TIMISOARA =
  "OBIECȚII LOCALE TIMIȘOARA (răspunsuri scurte, în maxim 2 fraze): " +
  "(a) „E prea scump în ISHO/Paltim/Fructus/City of Mara” → justifică prin: standard de construcție clasa A, " +
  "smart-lock + self check-in 24/7, parcare subterană, proximitate Piața Unirii/Victoriei (5-10 min), " +
  "ocupare 90%+ pe Booking. " +
  "(b) „În Dumbrăvița/Aradului/Torontalului e mai ieftin” → da, dar ocuparea pentru regim hotelier scade la 70-75% " +
  "fiindcă turiștii preferă Cetatea; recomandă acele zone DOAR pentru închiriere clasică pe termen lung. " +
  "(c) „Fabric/Iosefin nu e sigur” → corectează politicos: ambele cartiere s-au revitalizat puternic, " +
  "Iosefin = ISHO + Sinagoga, Fabric = Piața Traian + Millennium, cerere mare din partea Capitalei Culturale. " +
  "(d) „Vreau să administrez singur” → arată costul real al timpului: check-in, curățenie, plângeri, reglementări ANAF; " +
  "noi preluăm tot pentru cei 27%. " +
  "(e) „De ce 9.4% și nu 12-15%?” → randamentele de peste 10% nete sunt marketing; noi publicăm cifre auditate.";

const UNKNOWN_CONTEXT =
  "CFR NOTE: Apelant necunoscut — numărul nu este în pipeline-ul nostru. " +
  "Adoptă o postură de partener de management imobiliar pentru brandurile RealTrust și ApArt Hotel. " +
  "Califică apelul: află dacă este proprietar interesat de regim hotelier în Timișoara, ce zonă, " +
  "tipul proprietății, numărul de camere și disponibilitatea pentru o evaluare gratuită. " +
  ANDREI_ROI_PLAYBOOK + " " + ANDREI_OBJECTIONS_TIMISOARA;

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

  if (error) {
    console.error("v_prospect_funnel query error:", error.message);
    return new Response(
      JSON.stringify({
        caller_found: false,
        agent_memory_context: UNKNOWN_CONTEXT,
        error: "db_query_failed",
        details: error.message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({
        caller_found: false,
        phone_e164: e164,
        agent_memory_context: UNKNOWN_CONTEXT,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const d = data as any;
  const ownerName = d.title || "proprietar";
  const propertyType = d.prospect_type || "proprietate";
  const zone = d.zone || d.location || "Timișoara";
  const price = d.price ?? "n/a";
  const funnelStatus = d.funnel_status || d.prospect_lifecycle || "necunoscut";
  const qualityScore = d.prospect_score ?? d.lead_score ?? "n/a";
  const notes = d.call_summary || d.title || "fără note anterioare";
  const rooms = "n/a";



  const agent_memory_context =
    `CFR NOTE: Vorbești cu ${ownerName}. Acest număr este verificat prin Twilio. ` +
    `Detalii proprietate identificată: ${propertyType} cu ${rooms} camere în zona ${zone}, ` +
    `listată la prețul de ${price} EUR. Stadiul actual în funnel-ul nostru: ${funnelStatus}. ` +
    `Scorul inițial AI: ${qualityScore}/100. Note anterioare: ${notes}. ` +
    `Adoptă o postură de partener de management imobiliar pentru brandurile RealTrust și ApArt Hotel. ` +
    ANDREI_ROI_PLAYBOOK + " " + ANDREI_OBJECTIONS_TIMISOARA;

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
