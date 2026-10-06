// Passive WebP conversion for stored listing images (no AI calls).
// Decodes JPEG/PNG with ImageScript and encodes WebP with the libwebp WASM codec.
// On any failure the original bytes are returned so uploads never break.
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import encodeWebp, { init as initWebp } from "npm:@jsquash/webp@1.5.0/encode.js";

const WASM_URL = "https://unpkg.com/@jsquash/webp@1.5.0/codec/enc/webp_enc.wasm";
const MAX_WIDTH = 1920;
let ready: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const buf = await fetch(WASM_URL).then((r) => {
        if (!r.ok) throw new Error(`webp wasm ${r.status}`);
        return r.arrayBuffer();
      });
      await initWebp(await WebAssembly.compile(buf));
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export interface StoredImage {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  converted: boolean;
}

function sniff(bytes: Uint8Array): "jpeg" | "png" | "webp" | "other" {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return "other";
}

/** Encode an already-decoded ImageScript image to WebP. */
export async function imageToWebp(img: Image, quality = 80): Promise<Uint8Array> {
  await ensureInit();
  const data = new Uint8ClampedArray(img.bitmap.buffer, img.bitmap.byteOffset, img.bitmap.byteLength);
  const out = await encodeWebp({ data, width: img.width, height: img.height, colorSpace: "srgb" } as ImageData, { quality });
  return new Uint8Array(out);
}

/** Convert JPEG/PNG bytes to WebP; WebP passes through; others fall back unchanged. */
export async function toWebp(bytes: Uint8Array, quality = 80): Promise<StoredImage> {
  const kind = sniff(bytes);
  if (kind === "webp") return { bytes, contentType: "image/webp", ext: "webp", converted: false };
  const fallback: StoredImage = {
    bytes,
    contentType: kind === "png" ? "image/png" : "image/jpeg",
    ext: kind === "png" ? "png" : "jpg",
    converted: false,
  };
  if (kind === "other") return fallback;
  try {
    const img = await Image.decode(bytes);
    if (img.width > MAX_WIDTH) img.resize(MAX_WIDTH, Math.round((MAX_WIDTH / img.width) * img.height));
    const webp = await imageToWebp(img, quality);
    if (!webp.byteLength) return fallback;
    return { bytes: webp, contentType: "image/webp", ext: "webp", converted: true };
  } catch (e) {
    console.warn("[webpEncode] conversion failed, keeping original:", (e as Error).message);
    return fallback;
  }
}
