import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

/* ──────────────────────────────────────────────────────────────
   AI Lead Scorer for prospect_listings.
   - Triggered by DB after INSERT (or manually via API).
   - Reads description/title/price/location → asks Gemini for
     a 0-100 lead_score + breakdown + category suggestion.
   - Writes back lead_score, ai_score_breakdown, category, ai_scored_at.
   - If score > 80 and lifecycle_status='new', the existing AFTER
     UPDATE trigger fires the auto-dial automatically.
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_SIGNALS = [
  "proprietar", "direct-de-la-proprietar", "direct proprietar", "de la proprietar",
  "fara comision", "fără comision", "fara intermediar", "privat", "privati",
  "privați", "persoana fizica", "persoană fizică", "persoane fizice",
];

function hasOwnerFilterSignal(prospect: any): boolean {
  if (prospect?.prospect_type === "proprietar") return true;
  const keywords = Array.isArray(prospect?.search_keywords) ? prospect.search_keywords.join(" ") : "";
  const blob = `${prospect?.source_url || ""} ${prospect?.title || ""} ${prospect?.description || ""} ${prospect?.contact_name || ""} ${keywords}`.toLowerCase();
  return OWNER_SIGNALS.some((signal) => blob.includes(signal));
}

function isQuotaExhausted(body: string): boolean {
  return /RESOURCE_EXHAUSTED|quota exceeded|free_tier/i.test(body || "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Allow either: (a) admin JWT, or (b) internal call from DB trigger
  // (x-cron-secret / x-webhook-secret / service_role bearer)
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const SERVICE_KEY_ENV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bearerInternal = bearer.length > 0 && SERVICE_KEY_ENV.length > 0 && bearer === SERVICE_KEY_ENV;
  const isInternal = bearerInternal || (await isInternalCall(req));
  if (!isInternal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const prospectId = body.prospect_id || body.id;
    const force = body.force === true;

    if (!prospectId) {
      return new Response(JSON.stringify({ error: "prospect_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prospect, error: fetchErr } = await supabase
      .from("prospect_listings")
      .select("id, title, description, price, currency, location, zone, rooms, size, year_built, prospect_type, contact_name, ai_scored_at, source_platform, source_url, search_keywords")
      .eq("id", prospectId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!prospect) {
      return new Response(JSON.stringify({ error: "prospect not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prospect.ai_scored_at && !force) {
      return new Response(JSON.stringify({ skipped: "already scored", id: prospectId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prompt compact: doar atributele esențiale, descriere comprimată (economie de tokens).
    const desc = (prospect.description || "").replace(/\s+/g, " ").trim().slice(0, 600);
    const userPrompt = `Anunț Timișoara → scor lead RealTrust.
${prospect.title || "?"} | ${prospect.zone || prospect.location || "?"} | ${prospect.price || "?"} ${prospect.currency || "EUR"} | ${prospect.rooms || "?"}cam ${prospect.size || "?"}mp | an ${prospect.year_built || "?"} | ${prospect.source_platform || "?"} | contact: ${prospect.contact_name || "?"}
Descriere: ${desc || "-"}
Criterii: proprietar direct +30; pretabil hotelier (centru, 1-3 cam, mobilat) +20; urgență/negociabil +15; date contact +10; copy generic agenție -20.`;

    const GEMINI_MODEL = "gemini-3.6-flash";
    const responseSchema = {
      type: "OBJECT",
      properties: {
        lead_score: { type: "INTEGER", description: "Scor 0-100" },
        category: { type: "STRING", enum: ["vanzare", "inchiriere", "hotelier"] },
        is_owner_direct: { type: "BOOLEAN" },
        hotel_potential: { type: "INTEGER", description: "Potențial regim hotelier 0-100" },
        urgency_signals: { type: "ARRAY", items: { type: "STRING" } },
        owner_sentiment: { type: "STRING", enum: ["presat", "deschis", "agentie", "neutru"] },
        urgency_level: { type: "INTEGER", description: "Nivel urgență 0-10" },
        reasoning: { type: "STRING", description: "Explicație 1-2 propoziții" },
        recommended_pitch: { type: "STRING", description: "Sugestie de abordare pentru apel" },
      },
      required: [
        "lead_score", "category", "is_owner_direct", "hotel_potential",
        "owner_sentiment", "urgency_level", "reasoning", "recommended_pitch",
      ],
    };

    // Google returnează frecvent 503 („high demand”) — reîncercăm cu backoff,
    // altfel anunțurile noi rămân fără scor în coada de verificare.
    const aiRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Ești expert în scoring lead-uri imobiliare pentru agenții premium din Timișoara. Răspunzi STRICT cu JSON valid conform schemei, niciodată text liber.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
      { label: "prospect-ai-scorer", maxAttempts: 7, baseDelayMs: 2500, maxDelayMs: 30_000, timeoutMs: 120_000, maxBodyChars: 60_000,
        // Cota zilnică epuizată nu se rezolvă în câteva secunde — nu mai ardem cereri.
        shouldRetry: (_s, b) => !isQuotaExhausted(b) },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429 && isQuotaExhausted(aiRes.body)) {
        await supabase.from("prospect_listings").update({ auto_verify_status: "reîncercare" }).eq("id", prospectId);
        // 402 → prospect-auto-verify pune verificarea pe pauză (circuit breaker) până la reluare manuală.
        return new Response(JSON.stringify({
          error: "Cota zilnică Google Gemini este epuizată — activează facturarea în Google AI Studio sau reia mâine.",
          code: "gemini_quota_exhausted",
          retry: false,
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("Gemini error:", aiRes.status, aiRes.body.slice(0, 500));
      if (aiRes.status === 429 || aiRes.status >= 500 || aiRes.status === 0) {
        // Marcăm anunțul pentru reîncercare automată (cron), fără să-l blocăm.
        await supabase
          .from("prospect_listings")
          .update({ auto_verify_status: "reîncercare" })
          .eq("id", prospectId);
        return new Response(JSON.stringify({
          error: "Google Gemini indisponibil temporar — se reîncearcă la următoarea rulare.",
          code: "gemini_unavailable",
          retry: true,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 401 || aiRes.status === 403) {
        return new Response(JSON.stringify({
          error: "Cheia Google Gemini (GEMINI_API_KEY) este invalidă sau nu are acces la model.",
          code: "gemini_key_invalid",
          retryable: false,
        }), { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Gemini ${aiRes.status}: ${aiRes.body.slice(0, 300)}`);
    }

    const aiData = JSON.parse(aiRes.body || "{}");
    const rawText = (aiData?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    if (!rawText) throw new Error("Empty Gemini response");

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    } catch {
      throw new Error("Invalid JSON in Gemini response");
    }


    const leadScore = Math.max(0, Math.min(100, parseInt(parsed.lead_score) || 0));
    const ownerSignal = hasOwnerFilterSignal(prospect);
    const isOwnerDirect = ownerSignal || parsed.is_owner_direct === true;
    const finalProspectType = isOwnerDirect ? "proprietar" : (prospect.prospect_type || "necunoscut");

    const ownerSentiment = ["presat", "deschis", "agentie", "neutru"].includes(parsed.owner_sentiment)
      ? parsed.owner_sentiment : "neutru";
    const urgencyLevel = Math.max(0, Math.min(10, parseInt(parsed.urgency_level) || 0));

    const { error: updErr } = await supabase
      .from("prospect_listings")
      .update({
        lead_score: leadScore,
        score: leadScore, // mirror to legacy column
        category: parsed.category,
        prospect_type: finalProspectType,
        owner_sentiment: ownerSentiment,
        urgency_level: urgencyLevel,
        ai_score_breakdown: {
          is_owner_direct: isOwnerDirect,
          owner_filter_signal: ownerSignal,
          hotel_potential: parsed.hotel_potential,
          urgency_signals: parsed.urgency_signals || [],
          owner_sentiment: ownerSentiment,
          urgency_level: urgencyLevel,
          reasoning: parsed.reasoning,
          recommended_pitch: parsed.recommended_pitch,
          model: "google-direct/gemini-3.6-flash",
        },
        ai_scored_at: new Date().toISOString(),
      })
      .eq("id", prospectId);
    if (updErr) throw updErr;

    // Auto multimodal photo analysis for promising prospects.
    // Threshold + kill-switch are admin-configurable (property_vision_settings).
    let visionTriggered = false;
    const { data: visionSettings } = await supabase
      .from("property_vision_settings")
      .select("vision_enabled, auto_threshold")
      .eq("id", 1)
      .maybeSingle();
    const visionEnabled = visionSettings?.vision_enabled ?? true;
    const visionThreshold = Number(visionSettings?.auto_threshold ?? 70);
    if (visionEnabled && leadScore >= visionThreshold) {
      visionTriggered = true;
      fetch(`${SUPABASE_URL}/functions/v1/property-vision-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          "x-webhook-secret": SERVICE_KEY,
        },
        body: JSON.stringify({ prospect_id: prospectId }),
      }).catch((e) => console.error("property-vision-score trigger failed:", e));
    }

    return new Response(JSON.stringify({
      success: true,
      prospect_id: prospectId,
      lead_score: leadScore,
      category: parsed.category,
      will_auto_call: leadScore > 80,
      vision_triggered: visionTriggered,
      vision_threshold: visionThreshold,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("prospect-ai-scorer error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
