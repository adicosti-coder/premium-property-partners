// Generates an AI cover image (1:1, Instagram-safe) for social drafts with no photos.
// Modes: { post_id } from admin UI, or {} from cron (max 3 drafts per run).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

const MODEL = "openai/gpt-image-2.5-sunburst";
const MAX_PER_RUN = 3;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const hasImg = (p: any) => Boolean(p.image_url) || (p.image_urls?.length ?? 0) > 0;

function buildPrompt(p: any): string {
  const text = `${p.title ?? ""} ${String(p.caption ?? "").slice(0, 300)}`;
  const t = text.toLowerCase();
  const scene = p.type === "property" || /apartament|garsonier|camer|living|interior/.test(t)
    ? "a bright, modern, tastefully furnished apartment interior in Timișoara, Romania"
    : /clădire|bloc|ansamblu|complex|investi|vânzare|vanzare/.test(t)
      ? "a modern residential building in Timișoara, Romania, with calm European street context"
      : "a modern apartment interior or elegant residential building in Timișoara, Romania";
  return `Realistic editorial real-estate photograph for a social media post titled "${p.title}". ` +
    `Scene: ${scene}. Context: ${text.slice(0, 350)}. Natural daylight, warm tones with subtle navy blue and gold accents, ` +
    `high-end magazine look, sharp, inviting. No text, no letters, no logos, no watermarks, no identifiable faces. Square composition.`;
}

async function generateFor(sb: any, key: string, p: any) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: buildPrompt(p), size: "1024x1024", quality: "medium" }),
  });
  if (!res.ok) {
    let msg = (await res.text()).slice(0, 300);
    try { msg = JSON.parse(msg)?.error?.message ?? JSON.parse(msg)?.message ?? msg; } catch { /* raw */ }
    return { id: p.id, status: res.status, error: msg };
  }
  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) return { id: p.id, status: 502, error: "Serviciul nu a returnat nicio imagine." };
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `social-ai/${p.id}-${Date.now()}.png`;
  const up = await sb.storage.from("property-images").upload(path, bytes, { contentType: "image/png", upsert: true });
  if (up.error) return { id: p.id, status: 500, error: up.error.message };
  const url = sb.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("social_posts").update({ image_url: url, image_urls: [url] }).eq("id", p.id);
  return error ? { id: p.id, status: 500, error: error.message } : { id: p.id, status: 200, url };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const internal = await isInternalCall(req);
  if (!internal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "LOVABLE_API_KEY lipsește" }, 500);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const postId = typeof body?.post_id === "string" ? body.post_id : null;
  if (postId && !/^[0-9a-f-]{36}$/i.test(postId)) return json({ error: "post_id invalid" }, 400);
  const cols = "id, title, caption, type, status, image_url, image_urls, property_id";

  try {
    if (postId) {
      const { data: p, error } = await sb.from("social_posts").select(cols).eq("id", postId).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!p) return json({ error: "Postarea nu există." }, 404);
      const r = await generateFor(sb, key, p);
      return json(r, r.status);
    }
    if (!internal) return json({ error: "post_id lipsește" }, 400);
    const { data: rows, error } = await sb.from("social_posts").select(cols)
      .in("status", ["draft", "scheduled"]).order("created_at", { ascending: false }).limit(200);
    if (error) return json({ error: error.message }, 500);
    const candidates = (rows ?? []).filter((p: any) => !hasImg(p));
    // Skip posts whose linked property already has photos (UI shows those).
    const propIds = [...new Set(candidates.map((p: any) => p.property_id).filter(Boolean))];
    const withPhotos = new Set<string>();
    if (propIds.length) {
      const { data: imgs } = await sb.from("property_images").select("property_id").in("property_id", propIds);
      (imgs ?? []).forEach((i: any) => withPhotos.add(i.property_id));
    }
    const todo = candidates.filter((p: any) => !p.property_id || !withPhotos.has(p.property_id)).slice(0, MAX_PER_RUN);
    const results: any[] = [];
    for (const p of todo) {
      const r = await generateFor(sb, key, p);
      results.push(r);
      if ([402, 403, 429].includes(r.status)) break; // circuit breaker
    }
    return json({ processed: results.length, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
