// process-listing-images
// Cleans imported listing images:
//  - Predictable-watermark sources (olx, storia, imobiliare.ro, anuntul, publi24)
//    -> bottom strip crop (~10%) to remove footer watermark
//  - Central / unknown watermark sources
//    -> AI inpaint via Dewatermark.ai (auto-detects watermark, no mask needed),
//       otherwise falls back to bottom crop.
// Uploads results to public `property-images` bucket under properties/{property_id}/.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEWATERMARK_KEY = Deno.env.get("DEWATERMARK_API_KEY") || "";
const DEWATERMARK_URL = "https://platform.dewatermark.ai/api/object_removal/v2/erase_watermark";

const BUCKET = "property-images";
const MAX_IMAGES = 12;
const DEFAULT_BATCH_SIZE = 4; // process at most this many per invocation to stay within compute limits
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap per source image

// Sources where the watermark is predictably in the bottom strip / corners.
const BOTTOM_CROP_SOURCES = new Set([
  "olx", "olx.ro", "storia", "storia.ro",
  "imobiliare", "imobiliare.ro",
  "anuntul", "anuntul.ro", "publi24", "publi24.ro",
]);

// Sources where watermark tends to sit centrally → try AI inpaint first.
const CENTRAL_WM_SOURCES = new Set([
  "remax", "remax.ro", "century21", "blitz", "blitz.ro",
]);

type Mode = "bottom_crop" | "ai_inpaint" | "passthrough";

// AUTO PIPELINE = bottom_crop ONLY. Dewatermark AI is invoked exclusively on demand
// (per-listing manual trigger via `force_ai: true` in the request body, or via the
// dedicated `remove-watermark` edge function from the admin UI). This protects API
// credits and avoids wasting calls on images where the simple crop is enough.
function pickMode(platform: string, forceAi = false): Mode {
  if (forceAi && DEWATERMARK_KEY) return "ai_inpaint";
  // Everything else (including central-watermark sources) defaults to bottom_crop.
  // Admin can manually escalate to AI for those listings that still show a watermark.
  return "bottom_crop";
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

async function bottomCrop(bytes: Uint8Array, cropRatio = 0.10): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  // Downscale large images first to keep worker memory under the compute limit.
  if (img.width > 1600) {
    const newH = Math.round((1600 / img.width) * img.height);
    img.resize(1600, newH);
  }
  const newH2 = Math.max(1, Math.floor(img.height * (1 - cropRatio)));
  const cropped = img.crop(0, 0, img.width, newH2);
  return await cropped.encodeJPEG(85);
}

type AiResult = { bytes: Uint8Array | null; error: string | null };

// Retry policy: max 3 attempts total with TRUE exponential backoff + jitter.
// Base = 2000ms, factor = 2  → 2s, 4s, 8s (± up to 25% jitter to avoid thundering herd).
// Only timeouts and transient server errors (408/429/5xx, network/abort) are retried.
// After the 3rd failure the caller falls back to bottom_crop.
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 2000;
const RETRY_FACTOR = 2;
const RETRYABLE =
  /timeout|network|fetch|abort|api_http_(408|429|5\d\d)|ECONN|ETIMEDOUT|ENOTFOUND|socket/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attemptIndex: number): number {
  // attemptIndex is 0-based for the *previous* failed attempt
  const base = RETRY_BASE_MS * Math.pow(RETRY_FACTOR, attemptIndex);
  const jitter = base * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.max(250, Math.round(base + jitter));
}

async function withRetry<T extends { error: string | null }>(
  label: string,
  fn: () => Promise<T>,
): Promise<T & { retries_attempted: number }> {
  let last: T | null = null;
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const wait = backoffDelay(attempt - 1);
      console.log(`[retry] ${label} attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${wait}ms backoff`);
      await sleep(wait);
    }
    const res = await fn();
    last = res;
    if (!res.error) return { ...res, retries_attempted: attempt };
    if (!RETRYABLE.test(res.error)) {
      // Non-retryable (e.g. insufficient_balance, 400 decode error) → give up immediately
      console.warn(`[retry] ${label} non-retryable error, aborting: ${res.error}`);
      return { ...res, retries_attempted: attempt };
    }
    console.warn(`[retry] ${label} transient failure attempt ${attempt + 1}: ${res.error}`);
  }
  console.error(`[retry] ${label} exhausted ${MAX_RETRY_ATTEMPTS} attempts → falling back`);
  return { ...(last as T), retries_attempted: MAX_RETRY_ATTEMPTS - 1 };
}
// Re-encode arbitrary input (webp/png/jpeg) to a clean JPEG buffer so Dewatermark
// can always identify the file. Many Storia/OLX images are served as webp, which
// caused "cannot identify image file" 400s before.
async function toCleanJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const img = await Image.decode(bytes);
    return await img.encodeJPEG(88);
  } catch {
    return null;
  }
}

async function dewatermarkCleanOnce(bytes: Uint8Array): Promise<AiResult> {
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), 30000);
  try {
    // Normalize to JPEG first; if decode fails, give up immediately (non-retryable)
    const jpeg = await toCleanJpeg(bytes);
    if (!jpeg) {
      clearTimeout(timeout);
      return { bytes: null, error: "decode_failed_unsupported_format" };
    }

    const form = new FormData();
    form.append("original_preview_image", new Blob([jpeg], { type: "image/jpeg" }), "image.jpeg");
    form.append("remove_text", "true");
    form.append("predict_mode", "3.0");

    const res = await fetch(DEWATERMARK_URL, {
      method: "POST",
      headers: { "X-API-KEY": DEWATERMARK_KEY },
      body: form,
      signal: ctl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 300);
      // Mark insufficient balance / auth errors specially so caller can short-circuit
      if (/insufficient\s*balance|payment\s*required|quota/i.test(txt)) {
        return { bytes: null, error: `api_insufficient_balance: ${txt}` };
      }
      return { bytes: null, error: `api_http_${res.status}: ${txt}` };
    }
    const data = await res.json();
    const b64 = data?.edited_image?.image;
    if (!b64) return { bytes: null, error: "api_empty_response" };
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return { bytes: out, error: null };
  } catch (e: any) {
    clearTimeout(timeout);
    const reason = e?.name === "AbortError" ? "api_timeout" : `api_exception: ${String(e?.message || e)}`;
    return { bytes: null, error: reason };
  }
}

async function dewatermarkClean(bytes: Uint8Array) {
  return withRetry("dewatermark", () => dewatermarkCleanOnce(bytes));
}

type ProcessResult =
  | { kind: "processed"; out: Uint8Array; method: string; retries_attempted: number }
  | { kind: "ai_failed"; error: string; retries_attempted: number; fatal?: boolean };

// Errors that mean "stop trying AI for the rest of this property — won't recover this run"
const FATAL_AI_ERROR_RX = /insufficient_balance|payment_required|api_http_40[123]/i;

async function processOne(bytes: Uint8Array, mode: Mode): Promise<ProcessResult> {
  if (mode === "ai_inpaint") {
    // Pipeline: ALWAYS bottom_crop ~12% FIRST, then run Dewatermark on the cropped image.
    // Guarantees footer watermarks are gone even if AI later fails or leaves residue.
    const pre = await bottomCrop(bytes, 0.12);
    const r = await dewatermarkClean(pre);
    if (r.bytes) {
      return { kind: "processed", out: r.bytes, method: "bottom_crop+ai_inpaint_dewatermark", retries_attempted: r.retries_attempted };
    }
    const fatal = FATAL_AI_ERROR_RX.test(r.error || "");
    return { kind: "ai_failed", error: r.error || "unknown_ai_error", retries_attempted: r.retries_attempted, fatal };
  }
  if (mode === "bottom_crop") {
    return { kind: "processed", out: await bottomCrop(bytes, 0.12), method: "bottom_crop", retries_attempted: 0 };
  }
  return { kind: "processed", out: bytes, method: "passthrough", retries_attempted: 0 };
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: { property_id?: string; force_ai?: boolean; offset?: number; limit?: number };
  try { body = await req.json(); } catch { body = {}; }
  const propertyId = body.property_id;
  const forceAi = body.force_ai === true;
  const offset = Math.max(0, Number(body.offset) || 0);
  const limit = Math.max(1, Math.min(DEFAULT_BATCH_SIZE, Number(body.limit) || DEFAULT_BATCH_SIZE));

  if (!propertyId || typeof propertyId !== "string") {
    return new Response(JSON.stringify({ error: "property_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id, images, source_platform, images_processing_status")
    .eq("id", propertyId)
    .single();

  if (pErr || !prop) {
    return new Response(JSON.stringify({ error: "property not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allSources: string[] = Array.isArray(prop.images) ? prop.images.slice(0, MAX_IMAGES) : [];
  const sources = allSources.slice(offset, offset + limit);
  if (sources.length === 0) {
    await supabase.from("properties").update({
      images_processing_status: "skipped",
      images_processed_at: new Date().toISOString(),
      images_processing_log: { reason: "no_source_images" },
    }).eq("id", propertyId);
    return new Response(JSON.stringify({ ok: true, processed: 0, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("properties").update({
    images_processing_status: "processing",
  }).eq("id", propertyId);

  const mode = pickMode(prop.source_platform || "", forceAi);
  let effectiveMode: Mode = mode;
  const finalUrls: string[] = [];
  const perImage: any[] = [];
  let okCount = 0;
  let aiFailures = 0;
  let totalRetries = 0;
  let aiCircuitOpen = false; // becomes true after a fatal AI error (e.g. insufficient balance)
  const aiErrors: string[] = [];
  let fallbackCropUsed = 0;

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    try {
      const raw = await fetchImageBytes(src);
      if (!raw) {
        // Last-resort: keep original (we don't even have bytes)
        finalUrls.push(src);
        perImage.push({ i, src, status: "fetch_failed", fallback: "kept_original", retries_attempted: 0 });
        continue;
      }

      // If AI circuit broke earlier in this run, force bottom_crop for remaining images
      const modeForThis: Mode = aiCircuitOpen ? "bottom_crop" : effectiveMode;
      const result = await processOne(raw, modeForThis);
      totalRetries += result.retries_attempted;

      // AI failed: ALWAYS try bottom_crop fallback so we never publish a watermarked original
      if (result.kind === "ai_failed") {
        aiFailures++;
        aiErrors.push(result.error);
        if (result.fatal) {
          aiCircuitOpen = true;
          console.warn(`[process-listing-images] AI circuit opened: ${result.error}`);
        }
        try {
          const cropped = await bottomCrop(raw, 0.12);
          const path = `properties/${propertyId}/${Date.now()}-${i}-crop.jpg`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, cropped, {
            contentType: "image/jpeg", upsert: true, cacheControl: "31536000",
          });
          if (upErr) {
            finalUrls.push(src);
            perImage.push({ i, src, status: "ai_failed_crop_upload_failed", error: result.error, upload_error: upErr.message, fallback: "kept_original" });
          } else {
            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
            finalUrls.push(pub.publicUrl);
            fallbackCropUsed++;
            perImage.push({ i, status: "ai_failed_cropped", method: "bottom_crop_fallback", ai_error: result.error, retries_attempted: result.retries_attempted });
            okCount++;
          }
        } catch (cropErr: any) {
          finalUrls.push(src);
          perImage.push({ i, src, status: "ai_failed_crop_failed", error: result.error, crop_error: String(cropErr?.message || cropErr), fallback: "kept_original" });
        }
        continue;
      }

      const path = `properties/${propertyId}/${Date.now()}-${i}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, result.out, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) {
        finalUrls.push(src);
        perImage.push({ i, src, status: "upload_failed", error: upErr.message, fallback: "kept_original", retries_attempted: result.retries_attempted });
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      finalUrls.push(pub.publicUrl);
      perImage.push({
        i, status: "ok",
        method: result.method,
        retries_attempted: result.retries_attempted,
        bytes_in: raw.byteLength,
        bytes_out: result.out.byteLength,
      });
      okCount++;
    } catch (err: any) {
      finalUrls.push(src);
      perImage.push({ i, src, status: "error", error: String(err?.message || err), fallback: "kept_original", retries_attempted: 0 });
    }
  }

  // Status decision matrix:
  // - all good (no AI failure or all AI failures were salvaged by bottom_crop fallback) → completed
  // - AI failed AND fallback crop also failed for some images → fallback_failed
  // - nothing succeeded → failed
  const cropSalvaged = fallbackCropUsed;
  const unsalvagedAi = aiFailures - cropSalvaged;
  let status: "completed" | "fallback_failed" | "failed";
  if (okCount === 0) status = "failed";
  else if (unsalvagedAi > 0) status = "fallback_failed";
  else status = "completed";

  await supabase.from("properties").update({
    images: finalUrls,
    images_processing_status: status,
    images_processed_at: new Date().toISOString(),
    images_processing_log: {
      mode,
      ai_circuit_opened: aiCircuitOpen,
      source_platform: prop.source_platform,
      total: sources.length,
      ok: okCount,
      ai_failures: aiFailures,
      crop_fallback_used: cropSalvaged,
      ai_errors: aiErrors.slice(0, 5),
      retry_policy: { max_attempts: MAX_RETRY_ATTEMPTS, base_ms: RETRY_BASE_MS, factor: RETRY_FACTOR, jitter: "±25%" },
      total_retries: totalRetries,
      details: perImage,
    },
  }).eq("id", propertyId);

  return new Response(JSON.stringify({
    ok: true, property_id: propertyId, mode, processed: okCount,
    ai_failures: aiFailures, total_retries: totalRetries,
    total: sources.length, status,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
