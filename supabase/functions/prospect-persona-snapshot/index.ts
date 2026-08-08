import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

/* ──────────────────────────────────────────────────────────────
   Persona Snapshot Generator
   Triggered by DB on every new prospect_listings INSERT.
   Uses Lovable AI (Gemini) to generate a rich seller profile
   that helps the voice agent (or Andrei) sound human-aware.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `Ești un analist de vânzări imobiliare în Timișoara care creează profiluri de vânzător pe baza anunțurilor publicate.
Scopul e să ajuți un agent telefonic să sune empatic și pregătit, NU robotic.
Răspunde DOAR cu JSON valid, fără text suplimentar, în limba română.`;

const SCHEMA_HINT = `{
  "summary": "string — 2-3 propoziții despre vânzător (cine pare să fie, motivație probabilă, urgență)",
  "seller_type": "owner | agent | developer | unclear",
  "motivation": "string scurt — moștenire | mutare | upgrade | investitor exit | nevoie cash | unclear",
  "urgency_level": 1-10,
  "urgency_signals": ["listă de cuvinte/fraze din anunț care indică urgență"],
  "price_signal": "under_market | market | over_market | unclear",
  "negotiation_room": "high | medium | low | unclear",
  "approach": {
    "tone": "empatic | direct | profesional-rece | prietenos",
    "opening_line": "string — exact ce ar trebui să zică agentul în prima frază",
    "key_questions": ["max 3 întrebări de pus în primele 2 minute"],
    "avoid": ["max 3 lucruri de evitat"]
  },
  "objections_likely": ["max 3 obiecții probabile"],
  "best_call_window": "morning | midday | afternoon | evening | unclear",
  "confidence": 0-100
}`;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJsonParse(raw: string): any | null {
  if (!raw) return null;
  // Strip ```json fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  // Fallback: extract first {...} block
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: internal cron/trigger secret OR authenticated admin.
  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }



  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return jsonResp({ error: "LOVABLE_API_KEY missing" }, 500);
  }

  let prospect_id: string | null = null;
  let force = false;
  try {
    const body = await req.json();
    prospect_id = body?.prospect_id ?? null;
    force = body?.force === true;
  } catch {}

  if (!prospect_id) return jsonResp({ error: "prospect_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: prospect, error: fetchErr } = await supabase
    .from("prospect_listings")
    .select("id, title, description, price, currency, location, zone, size, rooms, year_built, source_platform, contact_name, scraped_at, persona_generated_at")
    .eq("id", prospect_id)
    .maybeSingle();

  if (fetchErr || !prospect) {
    return jsonResp({ error: "prospect not found", details: fetchErr?.message }, 404);
  }

  // Idempotency: skip if already generated in last hour (unless force=true)
  if (!force && prospect.persona_generated_at) {
    const ageMs = Date.now() - new Date(prospect.persona_generated_at).getTime();
    if (ageMs < 3600_000) {
      return jsonResp({ skipped: true, reason: "already generated", prospect_id });
    }
  }

  const userPrompt = `Analizează acest anunț imobiliar din Timișoara și generează profilul vânzătorului.

ANUNȚ:
- Titlu: ${prospect.title || "(lipsă)"}
- Preț: ${prospect.price ?? "?"} ${prospect.currency || ""}
- Zonă: ${prospect.zone || prospect.location || "?"}
- Suprafață: ${prospect.size ?? "?"} mp, ${prospect.rooms ?? "?"} camere
- An construcție: ${prospect.year_built ?? "?"}
- Sursă: ${prospect.source_platform || "?"}
- Postat: ${prospect.scraped_at || "?"}
- Contact: ${prospect.contact_name || "(necunoscut)"}

DESCRIERE:
${(prospect.description || "(fără descriere)").slice(0, 2500)}

Returnează DOAR JSON conform schemei:
${SCHEMA_HINT}`;

  let aiRaw = "";
  let persona: any = null;
  let aiError: string | null = null;

  try {
    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      aiError = `AI ${aiRes.status}: ${errText.slice(0, 300)}`;
      console.error("[persona-snapshot]", aiError);
    } else {
      const data = await aiRes.json();
      aiRaw = data?.choices?.[0]?.message?.content ?? "";
      persona = safeJsonParse(aiRaw);
      if (!persona) aiError = "AI returned non-JSON";
    }
  } catch (e: any) {
    aiError = `AI exception: ${e?.message || String(e)}`;
    console.error("[persona-snapshot]", aiError);
  }

  // Fallback minimal persona if AI fails
  if (!persona) {
    persona = {
      summary: "Profil indisponibil — generare AI eșuată. Folosiți pitch-ul standard.",
      seller_type: "unclear",
      motivation: "unclear",
      urgency_level: 5,
      urgency_signals: [],
      price_signal: "unclear",
      negotiation_room: "unclear",
      approach: {
        tone: "profesional-rece",
        opening_line: "Bună ziua, am văzut anunțul dumneavoastră, mai este disponibil?",
        key_questions: ["Mai e disponibil?", "Sunteți proprietarul direct?", "Care e flexibilitatea la preț?"],
        avoid: ["Presiune"],
      },
      objections_likely: [],
      best_call_window: "unclear",
      confidence: 0,
      _error: aiError,
    };
  }

  persona._model = MODEL;
  persona._generated_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("prospect_listings")
    .update({
      persona_snapshot: persona,
      persona_generated_at: new Date().toISOString(),
    })
    .eq("id", prospect_id);

  if (updateErr) {
    return jsonResp({ error: "update failed", details: updateErr.message, persona }, 500);
  }

  return jsonResp({
    success: true,
    prospect_id,
    persona_summary: persona.summary,
    urgency_level: persona.urgency_level,
    ai_error: aiError,
  });
});
