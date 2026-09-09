// Refresh POI images: resolve a real Google Places photo, persist it in Storage
// (Google photo URLs expire, so storing them in the DB breaks the gallery).
// Internal/admin only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const BUCKET = "property-images";
const STORAGE_MARKER = "/storage/v1/object/public/";

interface Poi {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
}

async function json(url: string) {
  const res = await fetch(url);
  return await res.json();
}

/** Resolve a photo_reference for a POI using Google Places. */
async function findPhotoReference(poi: Poi, apiKey: string): Promise<string | null> {
  const name = poi.name.trim();
  const address = (poi.address || "").trim();
  const hasCoords = Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude);

  // 1) Nearby search by coordinates (most accurate for local places)
  if (hasCoords) {
    const nearby = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    nearby.searchParams.set("location", `${poi.latitude},${poi.longitude}`);
    nearby.searchParams.set("rankby", "distance");
    nearby.searchParams.set("keyword", name);
    nearby.searchParams.set("key", apiKey);
    const data = await json(nearby.toString());
    const hit = (data.results || []).find((r: any) => r.photos?.length);
    if (hit) return hit.photos[0].photo_reference;
  }

  // 2) Text search by name + address
  for (const query of [address ? `${name}, ${address}` : name, `${name} Timișoara`]) {
    const text = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    text.searchParams.set("query", query);
    if (hasCoords) {
      text.searchParams.set("location", `${poi.latitude},${poi.longitude}`);
      text.searchParams.set("radius", "6000");
    }
    text.searchParams.set("key", apiKey);
    const data = await json(text.toString());
    const hit = (data.results || []).find((r: any) => r.photos?.length);
    if (hit) return hit.photos[0].photo_reference;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) return respond({ error: "GOOGLE_PLACES_API_KEY missing" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin-only: require a signed-in admin user.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return respond({ error: "Unauthorized" }, 401);
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return respond({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body?.dryRun === true;
    const limit = Math.min(Number(body?.limit) || 100, 200);
    const onlyMissing = body?.onlyMissing !== false; // default: skip POIs already on our Storage

    const { data: pois, error } = await admin
      .from("points_of_interest")
      .select("id, name, address, latitude, longitude, image_url")
      .eq("is_active", true)
      .order("is_premium", { ascending: false })
      .limit(200);
    if (error) throw error;

    const targets = (pois as Poi[])
      .filter((p) => !onlyMissing || !(p.image_url || "").includes(STORAGE_MARKER))
      .slice(0, limit);

    const results: Record<string, unknown>[] = [];
    let updated = 0;
    let cleared = 0;

    for (const poi of targets) {
      try {
        const photoReference = await findPhotoReference(poi, apiKey);
        if (!photoReference) {
          if (!dryRun) {
            // No real photo available → clear it so the UI shows the category placeholder
            // instead of a broken or stock image.
            await admin.from("points_of_interest").update({ image_url: null }).eq("id", poi.id);
            cleared++;
          }
          results.push({ name: poi.name, status: "no_photo" });
          continue;
        }

        if (dryRun) {
          results.push({ name: poi.name, status: "photo_found" });
          continue;
        }

        const photoUrl =
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200` +
          `&photo_reference=${photoReference}&key=${apiKey}`;
        const photoRes = await fetch(photoUrl, { redirect: "follow" });
        if (!photoRes.ok) {
          results.push({ name: poi.name, status: "download_failed", code: photoRes.status });
          continue;
        }
        const contentType = photoRes.headers.get("content-type") || "image/jpeg";
        const bytes = new Uint8Array(await photoRes.arrayBuffer());
        if (bytes.byteLength < 1024) {
          results.push({ name: poi.name, status: "download_empty" });
          continue;
        }

        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const path = `poi/${poi.id}.${ext}`;
        const { error: upErr } = await admin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType, upsert: true });
        if (upErr) {
          results.push({ name: poi.name, status: "upload_failed", error: upErr.message });
          continue;
        }

        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = pub?.publicUrl;
        if (!publicUrl) {
          results.push({ name: poi.name, status: "no_public_url" });
          continue;
        }

        const { error: updErr } = await admin
          .from("points_of_interest")
          .update({ image_url: publicUrl })
          .eq("id", poi.id);
        if (updErr) {
          results.push({ name: poi.name, status: "db_update_failed", error: updErr.message });
          continue;
        }

        updated++;
        results.push({ name: poi.name, status: "updated" });
      } catch (err) {
        results.push({ name: poi.name, status: "error", error: (err as Error).message });
      }
    }

    return respond({
      processed: targets.length,
      updated,
      cleared,
      dryRun,
      results,
    });
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});
