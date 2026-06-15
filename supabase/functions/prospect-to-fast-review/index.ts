/**
 * prospect-to-fast-review — manual push of a scraper prospect into properties as a draft.
 *
 * Body: { prospect_id: string } or { prospect_ids: string[] }  (bulk)
 *
 * Behavior:
 *  - Admin-gated.
 *  - For each prospect:
 *      * If properties.migrated_from_prospect_id already exists → returns existing id (idempotent).
 *      * Otherwise inserts a draft properties row with mapped fields (name, location,
 *        descriptions, rooms, size, images, source_url, etc.), needs_review=true,
 *        is_active=false, status_operativ='draft'.
 *      * Tags the prospect with 'pushed-to-fast-review' and a timestamp in admin_notes
 *        so it disappears from outreach pipeline.
 *  - Returns property_id(s).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(s: string): string {
  return (s || "anunt-importat")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80) || `import-${Date.now()}`;
}

function pickImages(prospect: any): string[] {
  const arr =
    (Array.isArray(prospect?.enriched_images) && prospect.enriched_images.length
      ? prospect.enriched_images
      : Array.isArray(prospect?.images) ? prospect.images : []) as unknown[];
  return arr
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, 25);
}

function mapListingType(category: string | null | undefined): string {
  const c = String(category || "").toLowerCase().trim();
  if (c === "vanzare") return "vanzare";
  if (c === "inchiriere") return "inchiriere";
  if (c === "hotelier") return "cazare";
  return "cazare";
}

async function pushOne(
  supabase: ReturnType<typeof createClient>,
  prospectId: string,
): Promise<{ prospect_id: string; property_id?: string; reason?: string; created: boolean }> {
  // Idempotent: already migrated?
  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("migrated_from_prospect_id", prospectId)
    .maybeSingle();
  if (existing) {
    return { prospect_id: prospectId, property_id: (existing as any).id, reason: "already_exists", created: false };
  }

  const { data: p, error: pErr } = await supabase
    .from("prospect_listings")
    .select("id, title, description, enriched_title, enriched_description, location, zone, rooms, size, price, currency, floor, year_built, features, images, enriched_images, category, source_url, source_platform, contact_phone, phone_normalized, admin_notes, tags, lead_score, prospect_type")
    .eq("id", prospectId)
    .maybeSingle();
  if (pErr || !p) return { prospect_id: prospectId, reason: pErr?.message || "prospect_not_found", created: false };

  const prospect = p as any;
  const name = (prospect.enriched_title || prospect.title || "Anunț importat").slice(0, 180);
  const descRo = (prospect.enriched_description || prospect.description || "").trim();
  const listingType = mapListingType(prospect.category);
  const images = pickImages(prospect);
  const slug = `${slugify(name)}-${prospectId.slice(0, 6)}`;

  const insertRow: Record<string, unknown> = {
    name,
    slug,
    location: prospect.location || prospect.zone || "Timișoara",
    description_ro: descRo || name,
    description_en: descRo || name,
    long_description_ro: descRo || null,
    features: Array.isArray(prospect.features) ? prospect.features : [],
    tag: prospect.zone || "Import prospect",
    is_active: false,
    status_operativ: "draft",
    listing_type: listingType,
    needs_review: true,
    images,
    image_path: images[0] || null,
    rooms: prospect.rooms ?? null,
    size: typeof prospect.size === "number" ? Math.round(prospect.size) : null,
    floor: prospect.floor ?? null,
    year_built: prospect.year_built ?? null,
    source_url: prospect.source_url ?? null,
    original_source_url: prospect.source_url ?? null,
    source_platform: prospect.source_platform ?? null,
    import_source: "prospect_manual_push",
    imported_at: new Date().toISOString(),
    migrated_from_prospect_id: prospectId,
    original_description_raw: prospect.description ?? null,
    images_processing_status: "pending",
    capital_necesar: typeof prospect.price === "number" ? prospect.price : null,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("properties")
    .insert(insertRow as any)
    .select("id")
    .single();
  if (insErr || !inserted) {
    console.error("[prospect-to-fast-review] insert failed", { prospectId, error: insErr });
    return { prospect_id: prospectId, reason: insErr?.message || "insert_failed", created: false };
  }

  const propertyId = (inserted as any).id as string;

  // Mark prospect so it disappears from outreach pipeline (tags + notes only;
  // we intentionally do NOT touch lifecycle_status because 'pushed_to_review'
  // is not part of the lead_lifecycle_status enum and the update would fail.)
  const newTags = Array.from(new Set([...(Array.isArray(prospect.tags) ? prospect.tags : []), "pushed-to-fast-review"]));
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const noteLine = `[${stamp}] Trimis la Fast Review (property ${propertyId.slice(0, 8)}).`;
  const newNotes = prospect.admin_notes ? `${prospect.admin_notes}\n${noteLine}` : noteLine;

  const { error: updErr } = await supabase
    .from("prospect_listings")
    .update({ tags: newTags, admin_notes: newNotes })
    .eq("id", prospectId);
  if (updErr) console.warn("[prospect-to-fast-review] prospect tag update failed", updErr.message);

  // Best-effort audit log
  try {
    await supabase.from("admin_audit_log").insert({
      action: "prospect_pushed_to_fast_review",
      actor_label: "admin",
      entity_type: "prospect_listing",
      entity_id: prospectId,
      details: { property_id: propertyId },
      severity: "info",
    });
  } catch { /* best-effort */ }

  return { prospect_id: prospectId, property_id: propertyId, created: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const gate = await requireAdmin(req, corsHeaders);
  if (!gate.ok) return gate.response!;

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const ids: string[] = Array.isArray(body?.prospect_ids)
    ? body.prospect_ids.filter((x: unknown) => typeof x === "string")
    : (typeof body?.prospect_id === "string" ? [body.prospect_id] : []);

  if (!ids.length) {
    return new Response(JSON.stringify({ error: "missing prospect_id or prospect_ids" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = [];
  for (const id of ids) {
    try {
      results.push(await pushOne(supabase, id));
    } catch (e) {
      results.push({ prospect_id: id, reason: (e as Error).message, created: false });
    }
  }

  const createdCount = results.filter((r) => r.created).length;
  const existedCount = results.filter((r) => r.reason === "already_exists").length;
  const failedCount = results.filter((r) => !r.property_id).length;

  return new Response(JSON.stringify({
    success: true,
    created: createdCount,
    existed: existedCount,
    failed: failedCount,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
