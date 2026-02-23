/**
 * Cloudinary CDN helper — uses `image/fetch` to optimize any public image URL.
 *
 * How it works:
 *   1. We build a Cloudinary fetch URL with automatic format (f_auto),
 *      automatic quality (q_auto), and optional width (w_XXX).
 *   2. The browser receives the best format (AVIF > WebP > JPEG) at the
 *      requested size, served from Cloudinary's edge CDN.
 *
 * Usage:
 *   cloudinaryUrl("/images/hero.webp", { width: 800 })
 *   // → https://res.cloudinary.com/dbuymy7tn/image/fetch/f_auto,q_auto,w_800/https://<origin>/images/hero.webp
 */

const CLOUD_NAME = "dbuymy7tn";

// The public origin of the deployed site — used to build absolute URLs
// from relative paths like "/images/hero.webp".
const SITE_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://realtrustaparthotel.lovable.app";

interface CloudinaryOptions {
  /** Desired display width in CSS pixels. Omit to keep original size. */
  width?: number;
  /** Cloudinary quality preset. Defaults to "auto" (perceptual optimisation). */
  quality?: "auto" | "auto:low" | "auto:eco" | "auto:good" | "auto:best";
  /** Extra raw transformations (e.g. "c_fill,ar_16:9,g_auto"). */
  raw?: string;
}

/**
 * Returns a Cloudinary fetch URL for the given image source.
 *
 * - Relative paths (e.g. "/images/hero.webp") are resolved against SITE_ORIGIN.
 * - Absolute URLs are used as-is.
 * - Data URIs, blob URIs, and already-cloudinary URLs are returned unchanged.
 */
export function cloudinaryUrl(
  src: string,
  opts: CloudinaryOptions = {}
): string {
  // Skip data/blob URIs
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;

  // Skip if already a Cloudinary URL
  if (src.includes("res.cloudinary.com")) return src;

  // Build transformation string
  const parts: string[] = ["f_auto", `q_${opts.quality ?? "auto"}`];
  if (opts.width) parts.push(`w_${Math.round(opts.width)}`);
  if (opts.raw) parts.push(opts.raw);
  const transformations = parts.join(",");

  // Resolve to absolute URL
  const absoluteSrc = src.startsWith("http") ? src : `${SITE_ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${absoluteSrc}`;
}

/**
 * Breakpoint widths for responsive srcSet generation.
 */
const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1920];

/**
 * Generates a srcSet string for responsive images via Cloudinary.
 */
export function cloudinarySrcSet(
  src: string,
  widths: number[] = DEFAULT_WIDTHS,
  opts: Omit<CloudinaryOptions, "width"> = {}
): string {
  return widths
    .map((w) => `${cloudinaryUrl(src, { ...opts, width: w })} ${w}w`)
    .join(", ");
}
