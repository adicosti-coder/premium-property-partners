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
  const { pathname, search } = useLocation();

  // Strip lang param from search to build the canonical (RO) URL.
  const params = new URLSearchParams(search);
  params.delete("lang");
  const cleanSearch = params.toString();

  // Normalize trailing slash: keep "/" for root, no trailing slash elsewhere.
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  const canonicalUrl =
    SITE_ORIGIN + normalizedPath + (cleanSearch ? `?${cleanSearch}` : "");

  // English alternate: append lang=en to the cleaned query.
  const enParams = new URLSearchParams(cleanSearch);
  enParams.set("lang", "en");
  const enUrl = `${SITE_ORIGIN}${normalizedPath}?${enParams.toString()}`;

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
