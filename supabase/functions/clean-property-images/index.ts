// clean-property-images
// Lightweight, memory-safe replacement for process-listing-images.
// For each image of a property, calls Dewatermark.ai (no local decode), uploads
// the cleaned bytes into the property-images bucket, and updates properties.images.
//
// Designed to run within the Edge Runtime memory cap by processing 1-3 images
// per invocation (configurable via { offset, limit }).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEWATERMARK_KEY = Deno.env.get("DEWATERMARK_API_KEY") || "";
const DEWATERMARK_URL =
  "https://platform.dewatermark.ai/api/object_removal/v2/erase_watermark";

const BUCKET = "property-images";
const MAX_IMAGES = 12;
const DEFAULT_LIMIT = 2;

function smallerVariant(url: string): string {
  // OLX apollo CDN — request a smaller variant to keep payloads light.
  if (/olxcdn\.com/.test(url)) {
    return url.replace(/;s=\d+x\d+/i, ";s=1024x768");
  }
  return url;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(smallerVariant(url), { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

async function dewatermark(bytes: Uint8Array): Promise<{ b64: string | null; error: string | null }> {
  try {
    const form = new FormData();
    form.append(
      "original_preview_image",
      new Blob([bytes], { type: "image/jpeg" }),
      "image.jpeg",
    );
    form.append("remove_text", "true");
    form.append("predict_mode", "3.0");
    const resp = await fetch(DEWATERMARK_URL, {
      method: "POST",
      headers: { "X-API-KEY": DEWATERMARK_KEY },
      body: form,
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return { b64: null, error: `dewatermark_${resp.status}: ${txt.slice(0, 200)}` };
    }
    const data = await resp.json();
    const b64 = data?.edited_image?.image;
    if (!b64) return { b64: null, error: "no_image_returned" };
    return { b64, error: null };
  } catch (e) {
    return { b64: null, error: (e as Error).message };
  }
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  if (!DEWATERMARK_KEY) {
    return new Response(JSON.stringify({ error: "DEWATERMARK_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { property_id?: string; offset?: number; limit?: number };
  try { body = await req.json(); } catch { body = {}; }
  const propertyId = body.property_id;
  if (!propertyId) {
    return new Response(JSON.stringify({ error: "property_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const offset = Math.max(0, Number(body.offset) || 0);
  const limit = Math.max(1, Math.min(4, Number(body.limit) || DEFAULT_LIMIT));

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: prop, error: pErr } = await supabase
    .from("properties").select("id, images").eq("id", propertyId).single();
  if (pErr || !prop) {
    return new Response(JSON.stringify({ error: "property not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const all: string[] = Array.isArray(prop.images) ? prop.images.slice(0, MAX_IMAGES) : [];
  const slice = all.slice(offset, offset + limit);
  if (slice.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, is_last: true, next_offset: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const merged = [...all];
  const details: any[] = [];
  let ok = 0;

  for (let k = 0; k < slice.length; k++) {
    const idx = offset + k;
    const src = slice[k];
    try {
      const raw = await fetchBytes(src);
      if (!raw) { details.push({ idx, src, status: "fetch_failed" }); continue; }

      const { b64, error } = await dewatermark(raw);
      if (!b64) { details.push({ idx, src, status: "dewatermark_failed", error }); continue; }

      const bytes = b64ToBytes(b64);
      const path = `properties/${propertyId}/${Date.now()}-${idx}-clean.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: "image/jpeg", upsert: true, cacheControl: "31536000",
      });
      if (upErr) { details.push({ idx, src, status: "upload_failed", error: upErr.message }); continue; }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      merged[idx] = pub.publicUrl;
      ok++;
      details.push({ idx, status: "ok", new_url: pub.publicUrl });
    } catch (e) {
      details.push({ idx, src, status: "error", error: (e as Error).message });
    }
  }

  const isLast = offset + slice.length >= all.length;
  await supabase.from("properties").update({
    images: merged,
    images_processing_status: isLast ? "completed" : "processing",
    images_processed_at: new Date().toISOString(),
    images_processing_log: {
      tool: "clean-property-images",
      batch: { offset, limit, total: all.length, is_last: isLast },
      ok, details,
    },
  }).eq("id", propertyId);

  return new Response(JSON.stringify({
    ok: true, property_id: propertyId, processed: ok,
    batch: { offset, limit, total: all.length, is_last: isLast },
    next_offset: isLast ? null : offset + slice.length,
    details,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
