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

function pickMode(platform: string): Mode {
  const p = (platform || "").toLowerCase();
  if (BOTTOM_CROP_SOURCES.has(p)) return "bottom_crop";
  if (CENTRAL_WM_SOURCES.has(p)) return DEWATERMARK_KEY ? "ai_inpaint" : "bottom_crop";
  return DEWATERMARK_KEY ? "ai_inpaint" : "bottom_crop";
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
  const newH = Math.max(1, Math.floor(img.height * (1 - cropRatio)));
  const cropped = img.crop(0, 0, img.width, newH);
  return await cropped.encodeJPEG(85);
}

async function dewatermarkClean(bytes: Uint8Array): Promise<Uint8Array | null> {
  // Dewatermark.ai auto-detects the watermark — no mask required.
  try {
    const form = new FormData();
    form.append("original_preview_image", new Blob([bytes], { type: "image/jpeg" }), "image.jpeg");
    form.append("remove_text", "true");
    form.append("predict_mode", "3.0");

    const res = await fetch(DEWATERMARK_URL, {
      method: "POST",
      headers: { "X-API-KEY": DEWATERMARK_KEY },
      body: form,
    });
    if (!res.ok) {
      console.error("Dewatermark error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const b64 = data?.edited_image?.image;
    if (!b64) return null;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    console.error("Dewatermark exception", e);
    return null;
  }
}

async function processOne(
  bytes: Uint8Array,
  mode: Mode,
): Promise<{ out: Uint8Array; method: string }> {
  if (mode === "ai_inpaint") {
    const cleaned = await dewatermarkClean(bytes);
    if (cleaned) return { out: cleaned, method: "ai_inpaint_dewatermark" };
    return { out: await bottomCrop(bytes, 0.12), method: "bottom_crop_fallback" };
  }
  if (mode === "bottom_crop") {
    return { out: await bottomCrop(bytes, 0.10), method: "bottom_crop" };
  }
  return { out: bytes, method: "passthrough" };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: { property_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const propertyId = body.property_id;

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

  const sources: string[] = Array.isArray(prop.images) ? prop.images.slice(0, MAX_IMAGES) : [];
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

  const mode = pickMode(prop.source_platform || "");
  const newUrls: string[] = [];
  const perImage: any[] = [];
  let okCount = 0;

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    try {
      const raw = await fetchImageBytes(src);
      if (!raw) { perImage.push({ i, src, status: "fetch_failed" }); continue; }
      const { out, method } = await processOne(raw, mode);

      const path = `properties/${propertyId}/${Date.now()}-${i}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, out, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) { perImage.push({ i, src, status: "upload_failed", error: upErr.message }); continue; }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      newUrls.push(pub.publicUrl);
      perImage.push({ i, status: "ok", method, bytes_in: raw.byteLength, bytes_out: out.byteLength });
      okCount++;
    } catch (err: any) {
      perImage.push({ i, src, status: "error", error: String(err?.message || err) });
    }
  }

  const status = newUrls.length > 0 ? "completed" : "failed";
  await supabase.from("properties").update({
    images: newUrls.length > 0 ? newUrls : prop.images,
    images_processing_status: status,
    images_processed_at: new Date().toISOString(),
    images_processing_log: {
      mode,
      source_platform: prop.source_platform,
      total: sources.length,
      ok: okCount,
      details: perImage,
    },
  }).eq("id", propertyId);

  return new Response(JSON.stringify({
    ok: true, property_id: propertyId, mode, processed: okCount, total: sources.length, status,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
