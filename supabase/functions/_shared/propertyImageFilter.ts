/** Mirror of src/utils/propertyImageFilter.ts for edge functions. */
const BLOCKED = /(storia|kaufland|logo|watermark|placeholder|no[-_]?image|noimage|default[-_]?image|map[-_]?pin|marker|sprite|favicon|\bicon|icons?\/|avatar|badge|banner|staticmap|maps\.googleapis)/i;

export function isValidPropertyImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u || /\.svg(\?|$)/i.test(u)) return false;
  try {
    const p = new URL(u);
    const path = p.pathname.includes("/storage/v1/") ? p.pathname.split("/").pop() || "" : p.hostname + p.pathname;
    return !BLOCKED.test(path);
  } catch {
    return false;
  }
}
