// Instagram-safe square/portrait JPEGs; fit entire sources without cropping.
// Fail closed: never send an unprocessed source after a preparation failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decodeSource } from "./listingCover.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { instagramFrame, metaAspectError } from "./socialImageSelection.ts";
import { isUrlAllowed, fetchWithSizeCap } from "./urlGuard.ts";

// Supabase Storage sources are downscaled server-side first so decoding stays within edge CPU limits.
function smallerSource(url: string): string {
  const m = url.match(/^(https:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+?)(\?.*)?$/);
  return m ? `${m[1]}/storage/v1/render/image/public/${m[2]}?width=1080&height=1350&resize=contain&quality=85` : url;
}

async function optimizeOne(url: string, key: string, story = false): Promise<string> {
  if (!isUrlAllowed(url, { extraHostSuffixes: ["olxcdn.com", "img.publi24.ro", "realtrust.ro"] }).ok) throw new Error("Sursa imaginii nu este permisă");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = `social/instagram/${key}.jpg`;
  const cachedUrl = sb.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  // Already prepared earlier (same source + format): reuse without re-decoding.
  const head = await fetch(cachedUrl, { method: "HEAD" }).catch(() => null);
  if (head?.ok) return cachedUrl;
  let res = await fetchWithSizeCap(smallerSource(url), { redirect: "error" }, 15 * 1024 * 1024);
  if ((!res.ok || !res.bytes) && smallerSource(url) !== url) res = await fetchWithSizeCap(url, { redirect: "error" }, 15 * 1024 * 1024);
  if (!res.ok || !res.bytes) throw new Error(res.error || "download failed");
  const img = await decodeSource(res.bytes);
  const f = instagramFrame(img.width, img.height, story);
  const out = new Image(f.width, f.height).fill(0xffffffff);
  out.composite(img.resize(f.imageWidth, f.imageHeight), f.x, f.y);
  const bad = metaAspectError(out.width, out.height, story);
  if (bad) throw new Error(bad);
  const jpeg = await out.encodeJPEG(88);
  const { error } = await sb.storage.from("property-images").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const publicUrl = sb.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  // Verificăm fișierul public efectiv (cache/CDN) înainte să-l trimitem către Make/Meta.
  // Dimensions were validated on the encoded frame above; only confirm public reachability (no re-decode).
  const check = await fetch(publicUrl, { method: "HEAD" }).catch(() => null);
  if (!check?.ok) throw new Error("Imaginea pregătită nu este accesibilă public");
  return publicUrl;
}

export async function prepareInstagramImages(images: string[], story = false): Promise<string[]> {
  const prepared: string[] = [];
  const failures: string[] = [];
  for (const u of images) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(u));
    const key = (story ? "story-v2-" : "fit-v3-") + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
    // Skip dead sources (e.g. 404 from a removed portal photo) instead of failing the whole post.
    try { prepared.push(await optimizeOne(u, key, story)); } catch (e) { failures.push(String((e as Error)?.message || e)); }
  }
  if (!prepared.length && images.length) {
    const dead = failures.some((f) => /Upstream 4\d\d/.test(f));
    throw new Error(dead
      ? "Imaginea postării nu mai există la sursă (404). Încarcă o imagine nouă în ciornă, apoi publică din nou."
      : `Nicio imagine nu a putut fi pregătită pentru Meta: ${failures[0] || "eroare necunoscută"}`);
  }
  return prepared;
}
