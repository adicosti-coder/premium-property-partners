// Instagram-safe square/portrait JPEGs; fit entire sources without cropping.
// Fail closed: never send an unprocessed source after a preparation failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decodeSource } from "./listingCover.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { instagramFrame, metaAspectError } from "./socialImageSelection.ts";
import { isUrlAllowed, fetchWithSizeCap } from "./urlGuard.ts";

async function optimizeOne(url: string, key: string, story = false): Promise<string> {
  if (!isUrlAllowed(url, { extraHostSuffixes: ["olxcdn.com", "img.publi24.ro", "realtrust.ro"] }).ok) throw new Error("Sursa imaginii nu este permisă");
  const res = await fetchWithSizeCap(url, { redirect: "error" }, 15 * 1024 * 1024);
  if (!res.ok || !res.bytes) throw new Error(res.error || "download failed");
  const img = await decodeSource(res.bytes);
  const f = instagramFrame(img.width, img.height, story);
  const out = new Image(f.width, f.height).fill(0xffffffff);
  out.composite(img.resize(f.imageWidth, f.imageHeight), f.x, f.y);
  const bad = metaAspectError(out.width, out.height, story);
  if (bad) throw new Error(bad);
  const jpeg = await out.encodeJPEG(88);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = `social/instagram/${key}.jpg`;
  const { error } = await sb.storage.from("property-images").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const publicUrl = sb.storage.from("property-images").getPublicUrl(path).data.publicUrl;
  // Verificăm fișierul public efectiv (cache/CDN) înainte să-l trimitem către Make/Meta.
  const check = await fetchWithSizeCap(publicUrl, { redirect: "error" }, 15 * 1024 * 1024);
  if (!check.ok || !check.bytes) throw new Error("Imaginea pregătită nu este accesibilă public");
  const final = await decodeSource(check.bytes);
  const finalBad = metaAspectError(final.width, final.height, story);
  if (finalBad) throw new Error(`Imagine respinsă înainte de Meta: ${finalBad}`);
  return publicUrl;
}

export async function prepareInstagramImages(images: string[], story = false): Promise<string[]> {
  const prepared: string[] = [];
  for (const u of images) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(u));
    const key = (story ? "story-v2-" : "fit-v3-") + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
    prepared.push(await optimizeOne(u, key, story));
  }
  return prepared;
}
