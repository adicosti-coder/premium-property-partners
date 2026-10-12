// Completează descrierile pozelor (caption/alt_text) și descrierea structurată
// pentru toate anunțurile active la cererea explicită a administratorului.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { captionImages, synthesizeDescription, tagImages, applyVisualTags } from "../_shared/imageContentFilter.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const denied = await requireInternalOrAdmin(req, cors);
  if (denied) return denied;
  let body: { limit?: number; property_id?: string; tags_only?: boolean; offset?: number; all?: boolean } = {};
  try { body = await req.json(); } catch { /* */ }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Missing configuration" }, 500);
  const sb = createClient(url, key);
   const imageUrl = (path: string) => {
     const legacy = path.match(/^\/assets\/(helios|apt-03|apt-04|apt-05|apt-06|apt-07|apt-09|apt-11)\.webp$/);
     if (legacy) return sb.storage.from("property-images").getPublicUrl(`static-ai/${legacy[1]}.webp`).data.publicUrl;
     return /^https?:\/\//.test(path) ? path : path.startsWith("/") ? `https://realtrust.ro${path}` : sb.storage.from("property-images").getPublicUrl(path.replace(/^property-images\//, "")).data.publicUrl;
   };
  let q = sb.from("properties")
    .select("id, name, rooms, size, floor, year_built, listing_type, location, description_ro, images, image_path, long_description_ro, original_description_raw, amenities, has_ac, has_elevator, heating_type, balconies, parking")
    .eq("is_active", true)
    .order("created_at").range(Number(body.offset) || 0, (Number(body.offset) || 0) + Math.min(Number(body.limit) || 5, 10) - 1);
  if (body.property_id) q = q.eq("id", body.property_id);
  // all=true includes manual listings on explicit admin request.
  if (!body.all) q = q.not("migrated_from_prospect_id", "is", null);
  const { data: props, error: queryError } = await q;
  if (queryError) return json({ error: queryError.message }, 500);
  const results: unknown[] = [];
  for (const p of props ?? []) {
    const { data: imgs } = await sb.from("property_images").select("id, image_path, display_order, caption, alt_text")
      .eq("property_id", p.id).order("display_order");
    const list = imgs ?? [];
    const paths = list.length ? list.map((i) => i.image_path) : (p.images?.length ? p.images : p.image_path ? [p.image_path] : []);
    const urls = paths.map(imageUrl);
    if (body.tags_only) {
      const tags = await tagImages(urls);
      const before = JSON.stringify([p.amenities, p.has_ac, p.has_elevator, p.heating_type, p.balconies, p.parking]);
      const d: Record<string, any> = { amenities: p.amenities, has_ac: p.has_ac, has_elevator: p.has_elevator, heating_type: p.heating_type, balconies: p.balconies, parking: p.parking };
      applyVisualTags(d, tags);
      const changed = JSON.stringify([d.amenities, d.has_ac, d.has_elevator, d.heating_type, d.balconies, d.parking]) !== before;
      if (changed) await sb.from("properties").update(d).eq("id", p.id);
      results.push({ id: p.id, name: p.name, tags: Array.from(tags), changed });
      continue;
    }
    const generated = await captionImages(urls);
    const caps = paths.map((_, i) => generated[i] || list[i]?.caption || "");
    const visual: Record<string, any> = { amenities: p.amenities, has_ac: p.has_ac, has_elevator: p.has_elevator, heating_type: p.heating_type, balconies: p.balconies, parking: p.parking };
    applyVisualTags(visual, await tagImages(urls));
    const title = String(p.name || "").slice(0, 80);
    const alts = caps.map((c) => c ? `${c} – ${title}` : title);
    for (let i = 0; i < list.length; i++) {
      if (caps[i]) {
        const { error } = await sb.from("property_images").update({ caption: caps[i], alt_text: alts[i] }).eq("id", list[i].id);
        if (error) return json({ error: error.message }, 500);
      }
    }
    if (!list.length && paths.length) {
      const { error } = await sb.from("property_images").insert(paths.map((path, i) => ({ property_id: p.id, image_path: path, display_order: i, is_published: true, is_primary: i === 0, caption: caps[i] || null, alt_text: alts[i] })));
      if (error) return json({ error: error.message }, 500);
    }
    const original = p.original_description_raw || [p.description_ro, p.long_description_ro].filter(Boolean).join("\n\n");
    const desc = await synthesizeDescription({
      title: p.name, originalText: original,
      captions: caps.filter(Boolean),
      facts: { locatie: p.location, camere: p.rooms, suprafata_mp: p.size, etaj: p.floor, an_constructie: p.year_built, tip: p.listing_type, dotari_vizibile: visual.amenities ?? [] },
    });
    const upd: Record<string, unknown> = { ...visual, image_alts: alts };
    if (desc) {
      upd.long_description_ro = desc;
      upd.description_ro = desc.split(/\n\s*##/)[0].replace(/[*_#]/g, "").trim();
      if (!p.original_description_raw) upd.original_description_raw = original;
    }
    const { error: saveError } = await sb.from("properties").update(upd).eq("id", p.id);
    results.push({ id: p.id, name: p.name, images: paths.length, captioned: caps.filter(Boolean).length, description_updated: !!desc && !saveError, error: saveError?.message });
  }
  return json({ ok: true, results });
});
