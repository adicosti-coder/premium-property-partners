import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { localSocialRows, canonicalSocialUrl } from "./local.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok && auth.response) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown): k is string => typeof k === "string").map((k: string) => k.trim()).filter(Boolean).slice(0, 20) : [];
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Configurarea datelor lipsește." }, 500);
    const sb = createClient(url, key);
    const [properties, articles, existing, gallery] = await Promise.all([
      sb.from("properties").select("id,slug,name,description_ro,location,image_path,images,listing_type,capital_necesar,base_price_per_night").eq("is_active", true).order("updated_at", { ascending: false }).limit(1000),
      sb.from("blog_articles").select("slug,title,excerpt,content,cover_image,main_image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(1000),
      sb.from("social_posts").select("source_url").limit(10000),
      sb.from("property_images").select("property_id,image_path").eq("is_published",true).order("display_order").limit(10000),
    ]);
    const error = properties.error || articles.error || existing.error || gallery.error;
    if (error) return json({ success: false, error: error.message }, 500);
    const known = new Set((existing.data ?? []).map(p => canonicalSocialUrl(p.source_url)));
    const photos = new Map<string,string[]>();
    for (const row of gallery.data ?? []) photos.set(row.property_id,[...(photos.get(row.property_id) ?? []),row.image_path]);
    const candidates = localSocialRows((properties.data ?? []).map(p=>({...p,images:[...(p.images ?? []),...(photos.get(p.id) ?? [])]})), articles.data ?? [], value => sb.storage.from("property-images").getPublicUrl(value).data.publicUrl, keywords);
    const fresh = candidates.filter(p => !known.has(canonicalSocialUrl(p.source_url)));
    if (body.dry_run === true) return json({ success: true, source: "local", discovered: candidates.length, duplicates: candidates.length - fresh.length, inserted: 0, available: fresh.length });
    const rows = fresh.slice(0, 10);
    const result = rows.length ? await sb.from("social_posts").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true }).select("id") : { data: [], error: null };
    if (result.error) return json({ success: false, error: result.error.message }, 500);
    return json({ success: true, source: "local", discovered: candidates.length, duplicates: candidates.length - fresh.length, inserted: result.data?.length ?? 0, failed: 0 });
  } catch (err) { return json({ success: false, error: err instanceof Error ? err.message : "Extragerea locală a eșuat." }, 500); }
});
