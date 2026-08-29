/**
 * Dynamic Open Graph tags for POI deep-links (#nume-restaurant).
 *
 * Note: this is a client-side SPA head update — JS-executing crawlers
 * (Googlebot) and in-app previews that render the page pick it up, while
 * pure social scrapers still read the static index.html head.
 */

const MANAGED_ATTR = "data-poi-og";

interface PoiMetaInput {
  name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  url: string;
}

const setTag = (selectorAttr: "property" | "name", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${selectorAttr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(selectorAttr, key);
    document.head.appendChild(el);
  }
  if (!el.getAttribute(MANAGED_ATTR)) {
    el.setAttribute(MANAGED_ATTR, el.getAttribute("content") ?? "");
  }
  el.setAttribute("content", content);
};

/** Applies POI-specific OG/Twitter tags. Returns a cleanup function. */
export const applyPoiSocialMeta = (poi: PoiMetaInput): void => {
  if (typeof document === "undefined") return;
  const label = poi.category === "cafe" ? "Cafenea" : "Restaurant";
  const title = `${poi.name} — ${label} recomandat în Timișoara | RealTrust`;
  const description = (
    poi.description?.trim() ||
    `${poi.name}${poi.address ? `, ${poi.address}` : ""} — recomandare verificată din ghidul de restaurante pentru oaspeții ApArt Hotel Timișoara.`
  ).slice(0, 200);

  setTag("property", "og:title", title);
  setTag("property", "og:description", description);
  setTag("property", "og:type", "article");
  setTag("property", "og:url", poi.url);
  setTag("name", "twitter:card", "summary_large_image");
  setTag("name", "twitter:title", title);
  setTag("name", "twitter:description", description);
  if (poi.imageUrl) {
    setTag("property", "og:image", poi.imageUrl);
    setTag("name", "twitter:image", poi.imageUrl);
  }
  setTag("name", "description", description);
};

/** Restores the tags that were present before the POI deep-link was opened. */
export const resetPoiSocialMeta = (): void => {
  if (typeof document === "undefined") return;
  document.head.querySelectorAll<HTMLMetaElement>(`meta[${MANAGED_ATTR}]`).forEach((el) => {
    const original = el.getAttribute(MANAGED_ATTR) ?? "";
    if (original) {
      el.setAttribute("content", original);
      el.removeAttribute(MANAGED_ATTR);
    } else {
      el.remove();
    }
  });
};
