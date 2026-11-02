import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";

export const SITE_ORIGIN = "https://realtrust.ro";

/**
 * Builds canonical + hreflang URLs for a route.
 * - Each language version self-canonicalizes (required by Google: hreflang
 *   targets must not canonicalize to another language).
 * - RO: clean path (all query params stripped). EN: clean path + `?lang=en`.
 * - x-default = RO.
 */
/** Complexes with a richer landing page under /complexe/:slug (single canonical). */
export const COMPLEX_LANDING_SLUGS = new Set([
  "isho", "paltim", "ateneo", "green-forest", "helios", "fructus-plaza",
  "city-of-mara", "vivalia", "nord-one", "xcity-towers", "denya-forest",
]);

export function buildLangAlternates(pathname: string, search: string) {
  let stripped = pathname.replace(/\/+$/, "");
  const complex = stripped.match(/^\/complex\/([^/]+)$/);
  if (complex) stripped = `/complexe/${complex[1]}`;
  const path = stripped === "" ? "/" : stripped;
  const ro = SITE_ORIGIN + path;
  const en = `${ro}?lang=en`;
  const isEn = new URLSearchParams(search).get("lang")?.toLowerCase() === "en";
  return { canonical: isEn ? en : ro, languages: { ro, "x-default": ro } };
}

/** Global canonical + hreflang emitter, mounted once for every route. */
const CanonicalHreflang = () => {
  const { pathname, search } = useLocation();
  const { canonical, languages } = buildLangAlternates(pathname, search);
  // Hosting may still serve an older prerendered shell until the next publish.
  // Remove unmanaged links before Helmet adds its single route-owned canonical.
  useLayoutEffect(() => {
    document.head.querySelectorAll('link[rel="canonical"]:not([data-rh]), link[rel="alternate"][hreflang="en"]').forEach((node) => node.remove());
  }, [canonical]);

  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ro" href={languages.ro} />
      <link rel="alternate" hrefLang="x-default" href={languages["x-default"]} />
    </Helmet>
  );
};

export default CanonicalHreflang;
