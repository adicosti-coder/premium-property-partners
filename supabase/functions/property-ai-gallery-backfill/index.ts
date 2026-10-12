// Completează descrierile pozelor (caption/alt_text) și descrierea structurată
// pentru anunțurile publicate automat deja existente.
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
  let body: { limit?: number; property_id?: string; tags_only?: boolean; offset?: number } = {};
  try { body = await req.json(); } catch { /* */ }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let q = sb.from("properties")
    .select("id, name, rooms, size, floor, year_built, listing_type, location, long_description_ro, original_description_raw, amenities, has_ac, has_elevator, heating_type, balconies, parking")
    .not("migrated_from_prospect_id", "is", null).eq("is_active", true)
    .order("created_at").range(Number(body.offset) || 0, (Number(body.offset) || 0) + Math.min(Number(body.limit) || 5, 10) - 1);
  if (body.property_id) q = q.eq("id", body.property_id);
  const { data: props } = await q;
  const results: unknown[] = [];
  for (const p of props ?? []) {
    const { data: imgs } = await sb.from("property_images").select("id, image_path, display_order")
      .eq("property_id", p.id).order("display_order");
    const list = imgs ?? [];
    if (body.tags_only) {
      const tags = await tagImages(list.map((i) => i.image_path));
      const before = JSON.stringify([p.amenities, p.has_ac, p.has_elevator, p.heating_type, p.balconies, p.parking]);
      const d: Record<string, any> = { amenities: p.amenities, has_ac: p.has_ac, has_elevator: p.has_elevator, heating_type: p.heating_type, balconies: p.balconies, parking: p.parking };
      applyVisualTags(d, tags);
      const changed = JSON.stringify([d.amenities, d.has_ac, d.has_elevator, d.heating_type, d.balconies, d.parking]) !== before;
      if (changed) await sb.from("properties").update(d).eq("id", p.id);
      results.push({ id: p.id, name: p.name, tags: Array.from(tags), changed });
      continue;
    }
    const caps = await captionImages(list.map((i) => i.image_path));
    const title = String(p.name || "").slice(0, 80);
    const alts = caps.map((c) => c ? `${c} – ${title}` : title);
    for (let i = 0; i < list.length; i++) {
      await sb.from("property_images").update({ caption: caps[i] || null, alt_text: alts[i] }).eq("id", list[i].id);
    }
    const desc = await synthesizeDescription({
      title: p.name, originalText: p.original_description_raw || p.long_description_ro || "",
      captions: caps.filter(Boolean),
      facts: { locatie: p.location, camere: p.rooms, suprafata_mp: p.size, etaj: p.floor, an_constructie: p.year_built, tip: p.listing_type, dotari_vizibile: p.amenities ?? [] },
    });
    const upd: Record<string, unknown> = { image_alts: alts };
    if (desc) upd.long_description_ro = desc;
    await sb.from("properties").update(upd).eq("id", p.id);
    results.push({ id: p.id, name: p.name, images: list.length, captioned: caps.filter(Boolean).length, description_updated: !!desc });
  }
  return json({ ok: true, results });
});
