/** Rejects portal logos, watermarks, placeholders, map pins and amenity icons. */
const BLOCKED = /(storia|kaufland|logo|watermark|placeholder|no[-_]?image|noimage|default[-_]?image|map[-_]?pin|marker|sprite|favicon|\bicon|icons?\/|avatar|badge|banner|staticmap|maps\.googleapis|mapsresources|\/tiles\b|tile\.openstreetmap|doubleclick|admanager|baxter\.olx|googlesyndication|adservice|\/trackimp|lidl|\bprofi\b|carrefour|auchan|\bpenny\b|mega[-_]?image|dedeman|\bemag\b)/i;
/** Miniaturi (ex. OLX „s=314x236”) — de obicei anunțuri recomandate, nu proprietatea. */
const THUMB = /[;?&]s=(\d{2,3})x\d{2,4}\b/i;

export function isValidPropertyImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u || u === "null" || u === "undefined") return false;
  if (u.startsWith("data:") && !u.startsWith("data:image/")) return false;
  if (/\.svg(\?|$)/i.test(u)) return false;
  let path = u;
  try {
    const parsed = new URL(u, "https://realtrust.ro");
    // Our own storage paths may contain the source platform name — only check the file name there.
    path = parsed.pathname.includes("/storage/v1/") ? parsed.pathname.split("/").pop() || "" : parsed.hostname + parsed.pathname;
  } catch {
    return false;
  }
  if (THUMB.test(u)) return false;
  return !BLOCKED.test(path);
}

export function filterPropertyImages(urls: unknown[] | null | undefined, broken?: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls || []) {
    if (!isValidPropertyImageUrl(raw)) continue;
    const u = raw.trim();
    if (seen.has(u) || broken?.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export const PROPERTY_IMAGE_PLACEHOLDER = "/placeholder.svg";
