// property-vision-score — multimodal photo analysis for scraped prospect listings.
//
// Reads up to 5 photos from prospect_listings.images, asks a multimodal model to
// judge the real state of the apartment (condition, finishes, furnishing,
// hotel-regime readiness) and writes back a 0-100 "Property Quality Score" plus
// the structured analysis. The score is then blended into the AI lead score.
//
// Auth: admin JWT (manual "Analizează foto" button) OR internal service-role /
// cron secret call (automatic run right after prospect-ai-scorer).
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { isUrlAllowed } from "../_shared/urlGuard.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Multimodal model — direct Google Gemini API (GEMINI_API_KEY), no gateway.
const VISION_MODEL = "gemini-1.5-flash";

const DEFAULT_MAX_IMAGES = 5;
const DEFAULT_AUTO_THRESHOLD = 70;

interface VisionSettings {
  vision_enabled: boolean;
  auto_threshold: number;
  cache_enabled: boolean;
  cache_ttl_days: number;
  max_images: number;
}

const DEFAULT_SETTINGS: VisionSettings = {
  vision_enabled: true,
  auto_threshold: DEFAULT_AUTO_THRESHOLD,
  cache_enabled: true,
  cache_ttl_days: 90,
  max_images: DEFAULT_MAX_IMAGES,
};

/** Stable fingerprint of the analysed image set (order-independent) + model. */
async function imagesHash(urls: string[], model: string): Promise<string> {
  const payload = `${model}::${[...urls].sort().join("|")}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface VisionResult {
  quality_score: number;
  condition: string;
  finishes: string;
  furnishing: string;
  hotel_readiness: number;
  renovation_needed: boolean;
  estimated_refresh_cost_eur: number | null;
  highlights: string[];
  red_flags: string[];
  reasoning: string;
}

const CONDITIONS = ["nou", "renovat_recent", "bun", "invechit", "necesita_renovare"];
const FINISHES = ["premium", "standard", "economic", "neterminat"];
const FURNISHING = ["complet_mobilat", "parțial_mobilat", "nemobilat"];

const clamp = (n: unknown, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const internal = await isInternalCall(req);
  let actorId: string | null = null;
  if (!internal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
    actorId = auth.userId ?? null;
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY missing" }, 500);


  let body: { prospect_id?: string; id?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prospectId = (body.prospect_id || body.id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(prospectId)) return json({ error: "prospect_id (uuid) required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: settingsRow } = await supabase
    .from("property_vision_settings")
    .select("vision_enabled, auto_threshold, cache_enabled, cache_ttl_days, max_images")
    .eq("id", 1)
    .maybeSingle();
  const settings: VisionSettings = { ...DEFAULT_SETTINGS, ...(settingsRow || {}) };

  /**
   * Observability: every vision failure is logged so Admin can see when the
   * multimodal model is degraded. `fallback_used` marks the cases where the
   * prospect keeps its text-only lead score instead of being blocked.
   */
  const logVisionError = async (
    stage: string,
    opts: { status?: number | null; error?: unknown; images?: number; fallback?: boolean } = {},
  ) => {
    try {
      await supabase.from("property_vision_errors").insert({
        prospect_id: prospectId,
        stage,
        status_code: opts.status ?? null,
        error: opts.error ? String(opts.error).slice(0, 1000) : null,
        images_count: opts.images ?? null,
        fallback_used: opts.fallback ?? true,
        model: VISION_MODEL,
      });
    } catch (e) {
      console.error("[property-vision-score] logVisionError failed:", e);
    }
  };

  // Kill-switch: automatic runs stop, an explicit admin click still works.
  if (!settings.vision_enabled && internal) {
    return json({ skipped: "vision_disabled", prospect_id: prospectId });
  }


  try {
    const { data: prospect, error: fetchErr } = await supabase
      .from("prospect_listings")
      .select(
        "id, title, zone, location, rooms, size, price, currency, year_built, images, lead_score, ai_score_breakdown, quality_analyzed_at",
      )
      .eq("id", prospectId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!prospect) return json({ error: "prospect not found" }, 404);

    if (prospect.quality_analyzed_at && body.force !== true) {
      return json({ skipped: "already analyzed", prospect_id: prospectId });
    }

    const images = (Array.isArray(prospect.images) ? prospect.images : [])
      .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
      .filter((u: string) => isUrlAllowed(u).ok)
      .slice(0, settings.max_images);

    if (images.length === 0) {
      await logVisionError("no_usable_images", { images: 0 });
      return json({ error: "no_usable_images", prospect_id: prospectId, fallback: "text_only" }, 422);
    }


    const contextLine = [
      prospect.title ? `Titlu: ${prospect.title}` : null,
      prospect.zone || prospect.location ? `Zonă: ${prospect.zone || prospect.location}` : null,
      prospect.rooms ? `Camere: ${prospect.rooms}` : null,
      prospect.size ? `Suprafață: ${prospect.size} mp` : null,
      prospect.price ? `Preț cerut: ${prospect.price} ${prospect.currency || "EUR"}` : null,
      prospect.year_built ? `An construcție: ${prospect.year_built}` : null,
    ].filter(Boolean).join(" | ");

    const hash = await imagesHash(images, VISION_MODEL);
    const useCache = settings.cache_enabled;

    let analysis: Record<string, unknown> | null = null;
    let qualityScore = 0;
    let hotelReadiness = 0;
    let fromCache = false;

    if (useCache) {
      const freshSince = new Date(
        Date.now() - settings.cache_ttl_days * 86_400_000,
      ).toISOString();
      const { data: cached } = await supabase
        .from("property_vision_cache")
        .select("id, quality_score, hotel_readiness, analysis, hit_count, created_at")
        .eq("images_hash", hash)
        .gte("created_at", freshSince)
        .maybeSingle();

      if (cached) {
        fromCache = true;
        qualityScore = clamp(cached.quality_score, 0, 100);
        hotelReadiness = clamp(cached.hotel_readiness, 0, 100);
        analysis = {
          ...((cached.analysis || {}) as Record<string, unknown>),
          from_cache: true,
        };
        await supabase
          .from("property_vision_cache")
          .update({ hit_count: (cached.hit_count ?? 0) + 1, last_used_at: new Date().toISOString() })
          .eq("id", cached.id);
      }
    }

    if (!fromCache) {
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
    for (const url of images) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const mimeType = r.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        if (!mimeType.startsWith("image/")) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.byteLength === 0 || buf.byteLength > 6_000_000) continue;
        let binary = "";
        for (let i = 0; i < buf.length; i += 8192) {
          binary += String.fromCharCode(...buf.subarray(i, i + 8192));
        }
        imageParts.push({ inlineData: { mimeType, data: btoa(binary) } });
      } catch (e) {
        console.error("[property-vision-score] image fetch failed", url, String(e));
      }
    }

    if (imageParts.length === 0) {
      await logVisionError("images_unreachable", { images: images.length });
      return json({ error: "images_unreachable", fallback: "text_only" }, 502);
    }

    const aiRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "Ești evaluator tehnic de apartamente pentru RealTrust Timișoara (regim hotelier). Analizezi EXCLUSIV ce se vede în fotografii: stare reală, finisaje, mobilier, uzură, lumină, calitate băi/bucătărie. Nu inventezi detalii care nu apar în poze. Răspunzi STRICT cu JSON valid conform schemei.",
            }],
          },
          contents: [{
            role: "user",
            parts: [
              {
                text:
                  `Analizează fotografiile acestui apartament și dă un Property Quality Score 0-100 ` +
                  `(100 = gata de regim hotelier fără investiție, 0 = necesită renovare completă).\n` +
                  `Context anunț: ${contextLine || "necunoscut"}\n` +
                  `Evaluează stare, finisaje, mobilare, potențial regim hotelier, semnale negative (igrasie, uzură, ` +
                  `mobilier vechi, poze slabe) și estimează bugetul de refresh în EUR dacă e nevoie.`,
              },
              ...imageParts,
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                quality_score: { type: "INTEGER", description: "Property Quality Score 0-100" },
                condition: { type: "STRING", enum: CONDITIONS },
                finishes: { type: "STRING", enum: FINISHES },
                furnishing: { type: "STRING", enum: FURNISHING },
                hotel_readiness: { type: "INTEGER", description: "Pretabilitate regim hotelier 0-100" },
                renovation_needed: { type: "BOOLEAN" },
                estimated_refresh_cost_eur: { type: "INTEGER", description: "Buget estimat refresh in EUR, 0 daca nu e necesar" },
                highlights: { type: "ARRAY", items: { type: "STRING" } },
                red_flags: { type: "ARRAY", items: { type: "STRING" } },
                reasoning: { type: "STRING", description: "Explicație 1-3 propoziții" },
              },
              required: [
                "quality_score",
                "condition",
                "finishes",
                "furnishing",
                "hotel_readiness",
                "renovation_needed",
                "estimated_refresh_cost_eur",
                "highlights",
                "red_flags",
                "reasoning",
              ],
            },
          },
        }),
      },
      { label: "property-vision-score", maxAttempts: 3, timeoutMs: 120_000, maxBodyChars: 200_000 },
    );

    if (!aiRes.ok) {
      await logVisionError("gemini", {
        status: aiRes.status,
        error: aiRes.error ?? aiRes.body,
        images: imageParts.length,
        fallback: true,
      });
      if (aiRes.status === 429) return json({ error: "rate_limited", retry: true }, 429);
      if (aiRes.status === 401 || aiRes.status === 403) {
        return json({
          error: "gemini_key_invalid",
          message: "Cheia Google Gemini (GEMINI_API_KEY) este invalidă sau nu are acces la model.",
        }, aiRes.status);
      }
      console.error("[property-vision-score] gemini error", aiRes.status, aiRes.body);
      // Fallback: prospect keeps its text-only lead score, nothing is overwritten.
      return json({ error: `gemini_${aiRes.status || "network"}`, fallback: "text_only" }, 502);
    }

    const aiData = JSON.parse(aiRes.body || "{}");
    const rawText = (aiData?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    if (!rawText) {
      await logVisionError("empty_response", { status: aiRes.status, images: imageParts.length });
      return json({ error: "empty_response", fallback: "text_only" }, 502);
    }

    let parsed: Partial<VisionResult> = {};
    try {
      parsed = JSON.parse(rawText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    } catch {
      await logVisionError("invalid_json", { images: imageParts.length });
      return json({ error: "invalid_json", fallback: "text_only" }, 502);
    }


    qualityScore = clamp(parsed.quality_score, 0, 100);
    hotelReadiness = clamp(parsed.hotel_readiness, 0, 100);
    analysis = {
      quality_score: qualityScore,
      condition: CONDITIONS.includes(String(parsed.condition)) ? parsed.condition : "bun",
      finishes: FINISHES.includes(String(parsed.finishes)) ? parsed.finishes : "standard",
      furnishing: FURNISHING.includes(String(parsed.furnishing)) ? parsed.furnishing : "nemobilat",
      hotel_readiness: hotelReadiness,
      renovation_needed: parsed.renovation_needed === true,
      estimated_refresh_cost_eur:
        parsed.estimated_refresh_cost_eur == null ? null : clamp(parsed.estimated_refresh_cost_eur, 0, 200_000),
      highlights: (parsed.highlights || []).slice(0, 8).map((s) => String(s).slice(0, 160)),
      red_flags: (parsed.red_flags || []).slice(0, 8).map((s) => String(s).slice(0, 160)),
      reasoning: String(parsed.reasoning || "").slice(0, 800),
      images_analyzed: images.length,
      model: VISION_MODEL,
      analyzed_by: internal ? "auto" : actorId,
    };

      if (useCache) {
        await supabase.from("property_vision_cache").upsert(
          {
            images_hash: hash,
            quality_score: qualityScore,
            hotel_readiness: hotelReadiness,
            images_analyzed: images.length,
            model: VISION_MODEL,
            analysis,
            hit_count: 0,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "images_hash" },
        );
      }
    }

    // Blend the visual signal into the AI lead score: ±12 points, centred on 50.
    const baseLeadScore = clamp(prospect.lead_score ?? 0, 0, 100);
    const visualAdjustment = Math.round(((qualityScore + hotelReadiness) / 2 - 50) * 0.24);
    const blendedLeadScore = clamp(baseLeadScore + visualAdjustment, 0, 100);

    const breakdown = (prospect.ai_score_breakdown || {}) as Record<string, unknown>;
    const nowIso = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("prospect_listings")
      .update({
        quality_score: qualityScore,
        quality_analysis: analysis,
        quality_analyzed_at: nowIso,
        lead_score: blendedLeadScore,
        score: blendedLeadScore,
        ai_score_breakdown: {
          ...breakdown,
          text_lead_score: baseLeadScore,
          visual_quality_score: qualityScore,
          visual_hotel_readiness: hotelReadiness,
          visual_adjustment: visualAdjustment,
          vision_model: VISION_MODEL,
        },
      })
      .eq("id", prospectId);
    if (updErr) throw updErr;

    return json({
      success: true,
      prospect_id: prospectId,
      quality_score: qualityScore,
      hotel_readiness: hotelReadiness,
      lead_score: blendedLeadScore,
      visual_adjustment: visualAdjustment,
      images_analyzed: images.length,
      cached: fromCache,
      analysis,
    });
  } catch (e) {
    console.error("[property-vision-score] error:", e);
    await logVisionError("exception", { error: e });
    return json({ error: (e as Error).message, fallback: "text_only" }, 500);

  }
});
