import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import { buildSeoUrls, SITE_ORIGIN } from "@/lib/seoLanguagePolicy";
import { useEnglishVersionAvailable } from "@/lib/seoEnglishAvailability";

export { SITE_ORIGIN };

/** Complexes with a richer landing page under /complexe/:slug (single canonical). */
export const COMPLEX_LANDING_SLUGS = new Set([
  "isho", "paltim", "ateneo", "green-forest", "helios", "fructus-plaza",
  "city-of-mara", "vivalia", "nord-one", "xcity-towers", "denya-forest",
]);

/**
 * Canonical + hreflang URLs for a route (see src/lib/seoLanguagePolicy.ts).
 * `englishAvailable` = the page has a real English translation.
 */
export function buildLangAlternates(pathname: string, search: string, englishAvailable = false) {
  const urls = buildSeoUrls(pathname, search, englishAvailable);
  const languages: Record<string, string> = { ro: urls.ro, "x-default": urls.ro };
  if (urls.en) languages.en = urls.en;
  return { canonical: urls.canonical, languages, alternates: urls.alternates };
}

/** Global canonical + hreflang emitter, mounted once for every route. */
const CanonicalHreflang = () => {
  const { pathname, search } = useLocation();
  const englishAvailable = useEnglishVersionAvailable(pathname);
  const { canonical, alternates } = buildLangAlternates(pathname, search, englishAvailable);
  // The prerendered document (or an older shell) carries its own links.
  // Remove every unmanaged one so Helmet's route-owned set is the only one.
  useLayoutEffect(() => {
    document.head
      .querySelectorAll('link[rel="canonical"]:not([data-rh]), link[rel="alternate"][hreflang]:not([data-rh])')
      .forEach((node) => node.remove());
  }, [canonical, englishAvailable]);

  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
      {alternates.map((alt) => (
        <link key={alt.hreflang} rel="alternate" hrefLang={alt.hreflang} href={alt.href} />
      ))}
    </Helmet>
  );
};

export default CanonicalHreflang;
