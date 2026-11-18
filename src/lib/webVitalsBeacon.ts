/**
 * Helpers for sending real-visitor Core Web Vitals to our own backend, where
 * `web-vitals-regression-check` compares them across publishes.
 */

/** Only the live site reports — preview, editor and localhost would skew the numbers. */
const REPORTING_HOSTS = new Set(["realtrust.ro", "www.realtrust.ro", "realtrust-aparthotel.lovable.app"]);

export function shouldReportVitals(hostname: string): boolean {
  return REPORTING_HOSTS.has(hostname.toLowerCase());
}

/** Same breakpoint as the mobile hero (max-width: 767px). */
export function deviceClassForWidth(width: number): "mobile" | "desktop" {
  return width <= 767 ? "mobile" : "desktop";
}

// Listing/article detail pages share one template: group them so one slow
// listing does not hide inside hundreds of single-visit paths.
const DETAIL_PREFIXES = [
  "/proprietati", "/proprietate", "/property", "/blog", "/complexe", "/cartier",
  "/imobiliare-timisoara", "/cazare", "/apartament", "/investitii", "/vanzare", "/inchiriere",
];

export function pageGroupForPath(pathname: string): string {
  let path = (pathname || "/").split(/[?#]/)[0].toLowerCase();
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 2 && DETAIL_PREFIXES.includes(`/${segments[0]}`)) {
    return `/${segments[0]}/:detaliu`;
  }
  if (segments.length > 2) return `/${segments.slice(0, 2).join("/")}/…`;
  return path.slice(0, 120) || "/";
}
