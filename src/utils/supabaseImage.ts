/**
 * Supabase Storage image optimisation.
 *
 * Public storage URLs (`/storage/v1/object/public/...`) serve the original file —
 * pentru pozele importate asta înseamnă frecvent 4000x2239 / 1.5 MB livrat într-un
 * card de 380px (principala cauză a LCP-ului slab pe mobil).
 *
 * Endpoint-ul de transformare (`/storage/v1/render/image/public/...`) redimensionează
 * și recomprimă la edge, deci trimitem exact ce afișăm.
 */

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

interface StorageImageOptions {
  /** Lățimea afișată în CSS px (se dublează intern pentru ecrane retina). */
  width?: number;
  /** Calitate 20-100. Default 70 — indistinguibil vizual, ~5x mai mic. */
  quality?: number;
}

/**
 * Returnează un URL optimizat pentru o imagine din Supabase Storage.
 * Orice alt tip de URL (extern, data:, blob:, relativ) este returnat neschimbat.
 */
export function storageImage(
  src?: string | null,
  { width = 800, quality = 70 }: StorageImageOptions = {},
): string {
  if (!src || typeof src !== "string") return "";
  if (!src.includes(OBJECT_PATH)) return src;
  if (src.includes(RENDER_PATH)) return src;

  const [base, existingQuery] = src.replace(OBJECT_PATH, RENDER_PATH).split("?");
  const params = new URLSearchParams(existingQuery);
  // x2 pentru DPR retina, plafonat la 1600 ca să nu depășim util dimensiunea afișată.
  params.set("width", String(Math.min(Math.round(width * 2), 1600)));
  params.set("quality", String(quality));
  params.set("resize", "cover");
  return `${base}?${params.toString()}`;
}

/** srcSet responsive pentru imagini din Supabase Storage. */
export function storageImageSrcSet(
  src?: string | null,
  widths: number[] = [400, 640, 800, 1200],
  quality = 70,
): string | undefined {
  if (!src || !src.includes(OBJECT_PATH)) return undefined;
  return widths.map((w) => `${storageImage(src, { width: w / 2, quality })} ${w}w`).join(", ");
}
