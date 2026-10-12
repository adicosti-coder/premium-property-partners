/** Mirror of src/utils/propertyImageFilter.ts for edge functions. */
const BLOCKED = /(storia|kaufland|logo|watermark|placeholder|no[-_]?image|noimage|default[-_]?image|map[-_]?pin|marker|sprite|favicon|\bicon|icons?\/|avatar|badge|banner|staticmap|maps\.googleapis|mapsresources|\/tiles\b|tile\.openstreetmap|doubleclick|admanager|baxter\.olx|googlesyndication|adservice|\/trackimp|lidl|profi|carrefour|auchan|penny|mega[-_]?image|dedeman|emag)/i;
/** Miniaturi (ex. OLX „s=314x236”) — de obicei anunțuri recomandate, nu proprietatea. */
const THUMB = /[;?&]s=(\d{2,3})x\d{2,4}\b/i;

export function isValidPropertyImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u || /\.svg(\?|$)/i.test(u)) return false;
  try {
    const p = new URL(u);
    const path = p.pathname.includes("/storage/v1/") ? p.pathname.split("/").pop() || "" : p.hostname + p.pathname;
    if (THUMB.test(u)) return false;
  return !BLOCKED.test(path);
  } catch {
    return false;
  }
}
