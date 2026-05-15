import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://realtrust.ro";

/**
 * Global canonical + hreflang emitter.
 * - Canonical: ALWAYS points to the Romanian (default) version, without `?lang=en`.
 * - hreflang ro / x-default: same canonical URL.
 * - hreflang en: same path with `?lang=en` appended (preserves other query params).
 *
 * Mounted once near the top of the router so it applies to every route.
 */
const CanonicalHreflang = () => {
  const { pathname } = useLocation();

  // Normalize trailing slash(es): keep "/" for root, strip ALL trailing
  // slashes elsewhere ("/foo", "/foo/", "/foo///" => "/foo").
  // Ensures a single canonical form across the whole site.
  const stripped = pathname.replace(/\/+$/, "");
  const normalizedPath = stripped === "" ? "/" : stripped;

  // Canonical strips ALL query params (utm_*, fbclid, gclid, lang, etc.)
  // — keeps only the clean path. This prevents duplicate-content from
  // tracking parameters in Google Search Console.
  const canonicalUrl = SITE_ORIGIN + normalizedPath;

  // English alternate: clean path + ?lang=en only.
  const enUrl = `${canonicalUrl}?lang=en`;

  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="ro" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
    </Helmet>
  );
};

export default CanonicalHreflang;
