import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { toWebp } from "./webpEncode.ts";
import decodeWebp, { init as initWebpDecoder } from "npm:@jsquash/webp@1.5.0/decode.js";
import { isUrlAllowed, fetchWithSizeCap } from "./urlGuard.ts";

let decoderReady: Promise<void> | null = null;
async function decodeSource(bytes: Uint8Array): Promise<Image> {
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return Image.decode(bytes);
  if (!decoderReady) {
    decoderReady = (async () => {
      const response = await fetch("https://unpkg.com/@jsquash/webp@1.5.0/codec/dec/webp_dec.wasm");
      if (!response.ok) throw new Error("WebP decoder unavailable");
      await initWebpDecoder(await WebAssembly.compile(await response.arrayBuffer()));
    })().catch(error => { decoderReady = null; throw error; });
  }
  await decoderReady;
  const decoded = await decodeWebp(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const image = new Image(decoded.width, decoded.height);
  image.bitmap.set(decoded.data);
  return image;
}

/** Remove the portal footer before a source photograph becomes the public cover.
 * No AI, no invented photo, no unprocessed-original fallback on failure.
 */
export async function prepareListingCover(urls: string[], prospectId: string, storage: any): Promise<string | null> {
  for (let index = 0; index < Math.min(urls.length, 3); index++) {
    const source = urls[index];
    try {
      if (!isUrlAllowed(source, { extraHostSuffixes: ["olxcdn.com", "img.publi24.ro"] }).ok) continue;
      const response = await fetchWithSizeCap(source, { signal: AbortSignal.timeout(10000), redirect: "error" }, 8 * 1024 * 1024);
      if (!response.ok || !response.bytes) continue;
      const bytes = response.bytes;
      if (!bytes.length || bytes.length > 8 * 1024 * 1024) continue;
      const image = await decodeSource(bytes);
      if (image.width < 320 || image.height < 240) continue;
      if (image.width > 1600) image.resize(1600, Math.round(image.height * 1600 / image.width));
      const cropped = image.crop(0, 0, image.width, Math.floor(image.height * 0.88));
      const stored = await toWebp(await cropped.encodeJPEG(85));
      const path = `prospects/${prospectId}/cover-footer-crop-v1.${stored.ext}`;
      const bucket = storage.from("property-images");
      const { error } = await bucket.upload(path, stored.bytes, { contentType: stored.contentType, upsert: true });
      if (error) continue;
      return bucket.getPublicUrl(path).data.publicUrl;
    } catch (error) {
      console.warn("[listing-cover] candidate failed", index, (error as Error).message);
    }
  }
  return null;
}