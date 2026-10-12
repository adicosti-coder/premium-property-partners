// Prepares photos for Instagram: 1080x1350 (4:5 portrait, recommended feed size),
// centre-weighted crop (slightly above centre to keep ceilings/windows), JPEG q88, sRGB.
// Uploaded to public storage so Meta can fetch them. On any failure the original URL is kept.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decodeSource } from "./listingCover.ts";
import { isUrlAllowed, fetchWithSizeCap } from "./urlGuard.ts";

const W = 1080, H = 1350;

async function optimizeOne(url: string, key: string): Promise<string> {
  if (!isUrlAllowed(url, { extraHostSuffixes: ["olxcdn.com", "img.publi24.ro"] }).ok) return url;
  const res = await fetchWithSizeCap(url, undefined, 15 * 1024 * 1024);
  if (!res.ok || !res.bytes) throw new Error(res.error || "download failed");
  const img = await decodeSource(res.bytes);
  const target = W / H, ratio = img.width / img.height;
  let cw = img.width, ch = img.height;
  if (ratio > target) cw = Math.round(img.height * target); else ch = Math.round(img.width / target);
  const x = Math.round((img.width - cw) / 2);
  const y = Math.round((img.height - ch) * 0.45);
  const out = img.crop(x, y, cw, ch).resize(W, H);
  const jpeg = await out.encodeJPEG(88);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = `social/instagram/${key}.jpg`;
  const { error } = await sb.storage.from("property-images").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return sb.storage.from("property-images").getPublicUrl(path).data.publicUrl;
}

export async function prepareInstagramImages(images: string[]): Promise<string[]> {
  const stamp = Date.now();
  return Promise.all(images.map(async (u, i) => {
    try { return await optimizeOne(u, `${stamp}-${i}`); }
    catch (e) { console.warn("[ig-optimize] fallback la original", (e as Error).message); return u; }
  }));
}
