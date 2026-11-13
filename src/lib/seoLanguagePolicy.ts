/**
 * Single source of truth for canonical + hreflang URLs on realtrust.ro.
 *
 * Used by the global route emitter (CanonicalHreflang), SEOHead (og:url),
 * the build-time prerender (plugins/vite-prerender-seo.ts) and the sitemap
 * build script. Edge functions mirror the sitemap part in
 * supabase/functions/_shared/seoLanguage.ts (kept in sync by a test).
 *
 * Rules:
 * - Absolute, non-www, no trailing slash (root excepted), /complex/ → /complexe/.
 * - Every query parameter is dropped except:
 *     · `page` (integer ≥ 2) on paginated archives;
 *     · `lang=en` only when the page has a real English translation.
 * - Translated page: each language self-canonicalizes and both list
 *   hreflang ro + en + x-default (= ro).
 * - Untranslated page opened with ?lang=en: canonical points to the clean
 *   Romanian URL and no English alternate is declared.
 * - Robots never depend on the language; a page is noindex only when the page
 *   itself asks for it.
 */
export const SITE_ORIGIN = "https://realtrust.ro";

/** Archives whose `?page=N` shows a different list and keeps its own canonical. */
export const PAGINATED_PREFIXES = ["/blog/categorie/", "/blog/locatie/"] as const;

/** Routes that may carry an English version (`?lang=en`) in sitemaps. */
export const ENGLISH_VERSION_PATTERN = /^\/blog\/(?!categorie$|locatie$)[^/]+$/;

/**
 * Static (non-blog) pages declared fully translated into English. Each one
 * self-canonicalizes per language, lists ro + en + x-default and has its
 * `?lang=en` URL in the sitemap. Mirrored in supabase/functions/_shared/seoLanguage.ts.
 */
export const TRANSLATED_STATIC_PATHS: readonly string[] = ["/cazare"];

export function isTranslatedStaticPath(pathname: string): boolean {
  return TRANSLATED_STATIC_PATHS.includes(normalizeSeoPath(pathname));
}

/** A path whose `?lang=en` URL may be listed (translated articles or static pages). */
export function mayHaveEnglishVersion(pathname: string): boolean {
  const path = normalizeSeoPath(pathname);
  return ENGLISH_VERSION_PATTERN.test(path) || isTranslatedStaticPath(path);
}

export function normalizeSeoPath(pathname: string): string {
  let path = (pathname || "/").split(/[?#]/)[0].replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  const complex = path.match(/^\/complex\/([^/]+)$/);
  if (complex) path = `/complexe/${complex[1]}`;
  return path === "" ? "/" : path;
}

export function isEnglishRequest(search: string): boolean {
  return new URLSearchParams(search).get("lang")?.toLowerCase() === "en";
}

export function isPaginatedPath(path: string): boolean {
  return PAGINATED_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

/** Page number kept in the canonical, or null for page 1 / invalid values. */
export function canonicalPage(path: string, search: string): number | null {
  if (!isPaginatedPath(path)) return null;
  const raw = new URLSearchParams(search).get("page") ?? "";
  if (!/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  return page >= 2 ? page : null;
}

export interface EnglishFields {
  title_en?: string | null;
  content_en?: string | null;
}

/** A page counts as translated only when its English title and body exist. */
export function hasEnglishTranslation(fields: EnglishFields | null | undefined): boolean {
  return Boolean(fields?.title_en?.trim() && fields?.content_en?.trim());
}

export type HreflangCode = "ro" | "en" | "x-default";

export interface SeoUrls {
  canonical: string;
  ro: string;
  en: string | null;
  alternates: Array<{ hreflang: HreflangCode; href: string }>;
}

export function buildSeoUrls(pathname: string, search: string, englishAvailable = false): SeoUrls {
  const path = normalizeSeoPath(pathname);
  const page = canonicalPage(path, search);
  const urlFor = (english: boolean) => {
    const params: string[] = [];
    if (page) params.push(`page=${page}`);
    if (english) params.push("lang=en");
    return `${SITE_ORIGIN}${path}${params.length ? `?${params.join("&")}` : ""}`;
  };
  const ro = urlFor(false);
  const en = englishAvailable ? urlFor(true) : null;
  const canonical = en && isEnglishRequest(search) ? en : ro;
  const alternates: SeoUrls["alternates"] = [{ hreflang: "ro", href: ro }];
  if (en) alternates.push({ hreflang: "en", href: en });
  alternates.push({ hreflang: "x-default", href: ro });
  return { canonical, ro, en, alternates };
}

export function seoRobots(noIndex = false): string {
  return noIndex ? "noindex, nofollow" : "index, follow";
}

/**
 * Canonical/hreflang head markup for a prerendered document. One static file
 * is served for every query variant of its path, so when the canonical depends
 * on the query (translated or paginated pages) the raw HTML carries no
 * canonical and `prerenderLanguageScript` inserts the self-referencing one
 * synchronously in <head>. Otherwise the raw HTML canonical is final for
 * every variant.
 */
export function prerenderHeadLinks(path: string, englishAvailable: boolean): string[] {
  const urls = buildSeoUrls(path, "", englishAvailable);
  const dynamic = englishAvailable || isPaginatedPath(normalizeSeoPath(path));
  const links: string[] = [];
  if (!dynamic) links.push(`<link rel="canonical" href="${urls.ro}" />`);
  // Paginated archives get their page-specific alternates from the script.
  if (!isPaginatedPath(normalizeSeoPath(path))) {
    for (const alt of urls.alternates) links.push(`<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`);
  }
  return links;
}

export interface PrerenderEnglishMeta {
  title?: string;
  description?: string;
}

const jsString = (value: string) => JSON.stringify(value).replace(/</g, "\\u003c");

export function prerenderLanguageScript(path: string, englishAvailable: boolean, english: PrerenderEnglishMeta = {}): string {
  const clean = normalizeSeoPath(path);
  const base = `${SITE_ORIGIN}${clean}`;
  const paginated = isPaginatedPath(clean);
  const dynamic = englishAvailable || paginated;
  const parts = [
    "var s=new URLSearchParams(location.search),en=(s.get('lang')||'').toLowerCase()==='en',h=document.head,d=document.documentElement;",
  ];
  if (dynamic) {
    parts.push(
      `var p=${paginated ? "s.get('page')||''" : "''"},q=/^\\d+$/.test(p)&&Number(p)>=2?'page='+Number(p):'';`,
      `function u(l){var x=[q,l?'lang=en':''].filter(Boolean).join('&');return ${jsString(base)}+(x?'?'+x:'');}`,
      "function k(r,a,v){var e=document.createElement('link');e.rel=r;if(a)e.hreflang=a;e.href=v;h.appendChild(e);}",
      `k('canonical','',${englishAvailable ? "en?u(1):u(0)" : "u(0)"});`,
    );
    if (paginated) parts.push(`k('alternate','ro',u(0));${englishAvailable ? "k('alternate','en',u(1));" : ""}k('alternate','x-default',u(0));`);
  }
  parts.push("if(en){d.lang='en';d.setAttribute('xml:lang','en');");
  if (englishAvailable && english.title) parts.push(`document.title=${jsString(english.title)};`);
  if (englishAvailable && english.description) {
    parts.push(`var m=h.querySelector('meta[name="description"]');if(m)m.content=${jsString(english.description)};`);
  }
  parts.push("}");
  return `<script>(function(){${parts.join("")}})();</script>`;
}
