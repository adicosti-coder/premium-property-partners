/**
 * Property view privacy — page views keep only what the traffic reports need:
 * the referring site (origin, never the full address with its query string)
 * and a coarse device class instead of the full browser signature.
 * The database trigger `normalize_property_view` applies the same rules to every insert.
 */

export function referrerOrigin(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  const m = /^(https?:\/\/[^/?#\s]+)/i.exec(referrer.trim());
  return m ? m[1].toLowerCase().slice(0, 200) : null;
}

export function deviceClass(userAgent: string | null | undefined): "mobile" | "tablet" | "desktop" | null {
  if (!userAgent) return null;
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}
