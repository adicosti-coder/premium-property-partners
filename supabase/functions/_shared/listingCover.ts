import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { toWebp } from "./webpEncode.ts";

/** Remove the portal footer before a source photograph becomes the public cover.
 * No AI, no invented photo, no unprocessed-original fallback on failure.
 */
export async function prepareListingCover(urls: string[], prospectId: string, storage: any): Promise<string | null> {
  for (let index = 0; index < Math.min(urls.length, 3); index++) {
    const source = urls[index];
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 8 * 1024 * 1024) continue;
      const image = await Image.decode(bytes);
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