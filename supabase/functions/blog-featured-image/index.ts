// Generates a featured image for unpublished blog drafts that have none.
// Bounded: max 3 articles per run; idempotent (only rows with empty image fields).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalCall } from "../_shared/cronAuth.ts";

const MODEL = "openai/gpt-image-2.5-sunburst";
const MAX_PER_RUN = 3;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "LOVABLE_API_KEY missing" }, 500);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rows, error } = await sb
    .from("blog_articles")
    .select("id, slug, title, excerpt")
    .eq("is_published", false)
    .or("cover_image.is.null,cover_image.eq.")
    .or("main_image_url.is.null,main_image_url.eq.")
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) return json({ error: error.message }, 500);

  const results: unknown[] = [];
  for (const a of rows ?? []) {
    const prompt =
      `Editorial photograph-style illustration for a Romanian real-estate blog article titled "${a.title}". ` +
      `${a.excerpt ?? ""} Bright, modern, tastefully furnished apartment interior or calm European residential street, ` +
      `natural daylight, warm tones with subtle blue and gold accents. No text, no letters, no logos, no watermarks, no people's faces. Landscape 3:2.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, size: "1536x1024", quality: "medium" }),
    });
    if (!res.ok) {
      const msg = (await res.text()).slice(0, 300);
      results.push({ id: a.id, status: res.status, error: msg });
      // Circuit breaker: stop on credit/policy/rate issues.
      if ([402, 403, 429].includes(res.status)) break;
      continue;
    }
    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) { results.push({ id: a.id, error: "no image returned" }); continue; }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `featured/${a.slug || a.id}-${Date.now()}.png`;
    const up = await sb.storage.from("blog-images").upload(path, bytes, { contentType: "image/png", upsert: true });
    if (up.error) { results.push({ id: a.id, error: up.error.message }); continue; }
    const url = sb.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
    const { error: uErr } = await sb.from("blog_articles").update({ cover_image: url, main_image_url: url }).eq("id", a.id);
    results.push({ id: a.id, url: uErr ? undefined : url, error: uErr?.message });
  }
  return json({ processed: results.length, results });
});
