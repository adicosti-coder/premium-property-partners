/**
 * Sitemap language rules for edge functions. Mirrors src/lib/seoLanguagePolicy.ts
 * (the site/prerender source of truth); seoLanguageParity.test.ts keeps both equal.
 *
 * - Only pages with a real English translation (English title + body) list a
 *   `?lang=en` URL and an `en` alternate.
 * - Every listed URL declares ro + (en) + x-default (= ro) alternates,
 *   including itself, so the cluster is reciprocal.
 */
export const SEO_SITE_ORIGIN = "https://realtrust.ro";

export function hasEnglishTranslation(fields: { title_en?: string | null; content_en?: string | null } | null | undefined): boolean {
  return Boolean(fields?.title_en?.trim() && fields?.content_en?.trim());
}

export function sitemapAlternateLinks(path: string, englishAvailable: boolean): string {
  const ro = `${SEO_SITE_ORIGIN}${path}`;
  const lines = [`    <xhtml:link rel="alternate" hreflang="ro" href="${ro}"/>`];
  if (englishAvailable) lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${ro}?lang=en"/>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${ro}"/>`);
  return lines.join("\n");
}

/** One <url> block for the Romanian page and, when translated, one for `?lang=en`. */
export function sitemapLanguageBlocks(
  path: string,
  englishAvailable: boolean,
  extra: { lastmod?: string | null; changefreq?: string; priority?: string; image?: string } = {},
): string {
  const alternates = sitemapAlternateLinks(path, englishAvailable);
  const meta = [
    extra.lastmod ? `    <lastmod>${extra.lastmod}</lastmod>` : "",
    extra.changefreq ? `    <changefreq>${extra.changefreq}</changefreq>` : "",
    extra.priority ? `    <priority>${extra.priority}</priority>` : "",
  ].filter(Boolean).join("\n");
  const block = (loc: string, image = "") =>
    `  <url>\n    <loc>${loc}</loc>\n${meta ? `${meta}\n` : ""}${alternates}${image}\n  </url>\n`;
  const ro = `${SEO_SITE_ORIGIN}${path}`;
  return block(ro, extra.image ?? "") + (englishAvailable ? block(`${ro}?lang=en`) : "");
}
