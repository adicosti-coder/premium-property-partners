/**
 * Build-time sitemap generator (runs on `prebuild`, i.e. before every publish).
 *
 * Single source of truth for the sitemap files served from the project domain:
 *   public/sitemap-static.xml   — evergreen marketing/landing routes
 *   public/sitemap-dynamic.xml  — properties, blog articles, complexes,
 *                                 community articles (live from the database)
 *   public/sitemap.xml          — sitemap index referencing the two above
 *
 * The URL data comes from the `generate-sitemap` / `generate-blog-sitemap` edge
 * functions: they already own the DB queries, the RLS-elevated reads and the
 * image/hreflang markup, and they can also be requested directly at runtime
 * (`/functions/v1/generate-sitemap`) for an always-fresh XML response.
 *
 * Canonical hygiene enforced here (nothing else in the pipeline is trusted):
 *   - https only
 *   - apex host `realtrust.ro` (www + function host are rewritten)
 *   - no query strings (utm_*, gclid… are dropped) except `?lang=en` on
 *     translated article pages (src/lib/seoLanguagePolicy.ts), which are
 *     listed only with reciprocal ro/en/x-default alternates
 *   - no trailing slash except the root
 *   - deduplicated by <loc>
 *
 * Failure is non-fatal: if the network is unavailable the previously committed
 * sitemap files are left untouched so a build never ships an empty sitemap.
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { ENGLISH_VERSION_PATTERN } from "../src/lib/seoLanguagePolicy";

const BASE_URL = "https://realtrust.ro";
const HOST = "realtrust.ro";
const FUNCTIONS_ORIGIN = "https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1";

const SOURCES = [
  `${FUNCTIONS_ORIGIN}/generate-sitemap`,
  `${FUNCTIONS_ORIGIN}/generate-blog-sitemap`,
];

/** Path prefixes whose URLs are database-driven → sitemap-dynamic.xml. */
const DYNAMIC_PREFIXES = [
  "/proprietate/",
  "/blog/",
  "/complex/",
  "/complexe/",
  "/comunitate/articol/",
  "/imobiliare-timisoara/",
  "/zona/",
];

/**
 * Neighborhood landing pages (/imobiliare-timisoara/:zona) are driven by
 * src/data/neighborhoods.ts, so read the slugs straight from there — adding a
 * new zone to the app keeps the sitemap in sync automatically.
 * No <lastmod>: there is no authoritative per-page timestamp for these routes.
 */
const neighborhoodBlocks = (): string[] => {
  try {
    const src = readFileSync(resolve("src/data/neighborhoods.ts"), "utf8");
    const slugs = Array.from(src.matchAll(/^\s*slug:\s*['"]([a-z0-9-]+)['"]/gm)).map((m) => m[1]);
    return Array.from(new Set(slugs)).map(
      (slug) =>
        `  <url>\n    <loc>${BASE_URL}/imobiliare-timisoara/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    );
  } catch (err) {
    console.warn("[sitemap] could not read neighborhood slugs:", (err as Error).message);
    return [];
  }
};

/** Slugs with a hand-written landing page at /complexe/<slug>. */
const complexLandingSlugsFromSource = (): string[] => {
  try {
    const src = readFileSync(resolve("src/pages/ComplexLanding.tsx"), "utf8");
    return Array.from(src.matchAll(/^\s*slug:\s*["']([a-z0-9-]+)["']/gm)).map((m) => m[1]);
  } catch (err) {
    console.warn("[sitemap] could not read complex landing slugs:", (err as Error).message);
    return [];
  }
};

/**
 * Canonicalize a single URL: force https + apex host, strip every query string
 * and fragment, strip trailing slashes (root excepted).
 * Returns null when the URL points somewhere that must not be listed.
 */
const canonicalizeUrl = (raw: string, keepEnglish = false): string | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.hostname.toLowerCase().replace(/^www\./, "") !== HOST) {
    // Rewrite the two known internal hosts, reject anything else (no
    // cross-host entries may ever reach Search Console).
    const host = url.hostname.toLowerCase();
    if (host !== "www.realtrust.ro" && host !== "mvzssjyzbwccioqvhjpo.supabase.co") return null;
  }
  const path = (url.pathname.replace(/\/+$/, "") || "/").replace(/^\/complex\//, "/complexe/");
  const english =
    keepEnglish &&
    url.searchParams.get("lang")?.toLowerCase() === "en" &&
    ENGLISH_VERSION_PATTERN.test(path);
  return `${BASE_URL}${path}${english ? "?lang=en" : ""}`;
};

/** Rewrite every <loc>/<xhtml:link href> in a block to its canonical form. */
const canonicalizeBlock = (block: string): string | null => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (!loc) return null;
  const isEnglishLoc = /[?&]lang=en(?:&|$)/i.test(loc);
  const canonicalLoc = canonicalizeUrl(loc, true);
  if (!canonicalLoc) return null;
  // An English loc is listed only for a translated page (with its en alternate).
  if (isEnglishLoc && !canonicalLoc.endsWith("?lang=en")) return null;
  const hasEnglishAlternate = /hreflang="en(?:-[^"]+)?"/.test(block);
  if (isEnglishLoc && !hasEnglishAlternate) return null;

  let out = block.replace(/<loc>[^<]+<\/loc>/, `<loc>${canonicalLoc}</loc>`);
  const roLoc = canonicalLoc.replace(/\?lang=en$/, "");

  out = out.replace(
    /<xhtml:link\b([^>]*?)href="([^"]+)"([^>]*)\/>/g,
    (_m, before: string, href: string, after: string) => {
      const attrs = (before + after).replace(/hreflang="ro-RO"/, 'hreflang="ro"');
      if (/hreflang="en(?:-[^"]+)?"/.test(attrs)) {
        const enHref = canonicalizeUrl(href, true);
        // English alternates must point at this page's own `?lang=en` URL.
        if (!enHref || enHref !== `${roLoc}?lang=en`) return "";
        return `<xhtml:link${attrs.replace(/hreflang="en-[^"]+"/, 'hreflang="en"')}href="${enHref}"/>`;
      }
      return `<xhtml:link${attrs}href="${canonicalizeUrl(href) ?? roLoc}"/>`;
    },
  );

  return out;
};

/**
 * Keeps language clusters reciprocal: an `en` alternate survives only when its
 * `?lang=en` URL is itself listed, and vice versa.
 */
const enforceReciprocalLanguages = (blocks: string[]): string[] => {
  const locOf = (b: string) => b.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
  const locs = new Set(blocks.map(locOf));
  return blocks
    .filter((b) => {
      const loc = locOf(b);
      return !loc.endsWith("?lang=en") || locs.has(loc.replace(/\?lang=en$/, ""));
    })
    .map((b) =>
      b.replace(/\s*<xhtml:link\b[^>]*hreflang="en"[^>]*href="([^"]+)"[^>]*\/>/g, (m, href: string) =>
        locs.has(href) ? m : "",
      ),
    );
};

const extractUrlBlocks = (xml: string): string[] => xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];

const dedupeByLoc = (blocks: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    out.push(block);
  }
  return out;
};

const isDynamic = (block: string): boolean => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
  const path = loc.slice(BASE_URL.length).split("?")[0];
  return DYNAMIC_PREFIXES.some((p) => path.startsWith(p) && path.length > p.length);
};

const SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

/**
 * Premium articles are readable only by authenticated members, so they are not
 * public documents and must never be listed. Their pages ship `noindex`.
 */
const fetchPublicArticleSlugs = async (): Promise<Set<string> | null> => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_articles?is_published=eq.true&is_premium=eq.false&select=slug`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    if (!res.ok) {
      console.warn(`[sitemap] public slug lookup responded ${res.status}`);
      return null;
    }
    const rows = (await res.json()) as Array<{ slug: string | null }>;
    return new Set(rows.map((r) => r.slug).filter((s): s is string => Boolean(s)));
  } catch (err) {
    console.warn("[sitemap] public slug lookup failed:", (err as Error).message);
    return null;
  }
};

/** Path segments that mean "this record has no usable slug/id". */
const INVALID_SEGMENTS = new Set(["null", "undefined", "nan", "false", "0"]);

/** Routes that only ever redirect, so they must not be listed as canonical. */
const REDIRECT_ONLY_PATHS = new Set([
  "/oaspeti",
  "/pentru-oaspeti",
  "/complexe",
  "/proprietati",
]);

/**
 * Rejects any URL that is not a valid, public, canonical page: missing or
 * placeholder slugs, legacy redirect-only routes and gated premium articles.
 */
const isListable = (block: string, publicSlugs: Set<string> | null): boolean => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "";
  const path = loc.slice(BASE_URL.length).split("?")[0] || "/";

  if (REDIRECT_ONLY_PATHS.has(path)) return false;

  const segments = path.split("/").filter(Boolean);
  if (segments.some((s) => INVALID_SEGMENTS.has(s.toLowerCase()))) {
    console.warn(`[sitemap] dropped invalid URL: ${loc}`);
    return false;
  }
  // A detail route whose final segment is missing entirely (e.g. "/blog/").
  for (const prefix of DYNAMIC_PREFIXES) {
    if (path === prefix.replace(/\/$/, "") + "/") return false;
  }

  const articleSlug = path.match(/^\/blog\/([^/]+)$/)?.[1];
  // Only articles a visitor can actually read may be listed. The gated
  // (member-only) list is not readable at build time by design, so the check is
  // an allowlist of public slugs rather than a blocklist of premium ones.
  if (articleSlug && publicSlugs && !publicSlugs.has(articleSlug)) return false;

  return true;
};


const wrapUrlset = (blocks: string[]): string =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- Generated by scripts/generate-sitemap.ts (prebuild). Canonical apex URLs only. -->`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...blocks,
    `</urlset>`,
    "",
  ].join("\n");

const SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.ts (prebuild). All entries are served
     from the canonical apex domain so Search Console never sees a cross-host
     or www sitemap entry. -->
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-dynamic.xml</loc>
  </sitemap>
</sitemapindex>
`;

const writeIfNotEmpty = (file: string, blocks: string[], label: string) => {
  const target = resolve(`public/${file}`);
  if (blocks.length === 0) {
    console.warn(
      existsSync(target)
        ? `[sitemap] no ${label} entries fetched — keeping existing ${file}`
        : `[sitemap] no ${label} entries fetched and no previous file — ${file} not written`,
    );
    return;
  }
  writeFileSync(target, wrapUrlset(blocks));
  console.log(`[sitemap] ${file} written (${blocks.length} URLs)`);
};

const main = async () => {
  const raw: string[] = [...neighborhoodBlocks()];

  for (const source of SOURCES) {
    try {
      const res = await fetch(source);
      if (!res.ok) {
        console.warn(`[sitemap] ${source} responded ${res.status} — skipped`);
        continue;
      }
      raw.push(...extractUrlBlocks(await res.text()));
    } catch (err) {
      console.warn(`[sitemap] failed to fetch ${source}:`, (err as Error).message);
    }
  }

  const publicSlugs = await fetchPublicArticleSlugs();

  const canonical = raw
    .map(canonicalizeBlock)
    .filter((b): b is string => Boolean(b));
  const unique = dedupeByLoc(canonical);

  // Only valid, public, canonical URLs may reach Search Console.
  const listable = unique.filter((b) => isListable(b, publicSlugs));

  // Drop /complex/<slug> when the same complex also has a /complexe/<slug>
  // landing page: those two URLs share one canonical (/complexe/<slug>). The
  // landing slugs come both from the fetched URLs and from the landing page
  // source, so a missing sitemap entry can't resurrect a duplicate URL.
  const landingSlugs = new Set<string>([
    ...listable
      .map((b) => b.match(/<loc>[^<]*\/complexe\/([a-z0-9-]+)<\/loc>/)?.[1])
      .filter((s): s is string => Boolean(s)),
    ...complexLandingSlugsFromSource(),
  ]);
  const deduped = listable.filter((b) => {
    const legacy = b.match(/<loc>[^<]*\/complex\/([a-z0-9-]+)<\/loc>/)?.[1];
    return !(legacy && landingSlugs.has(legacy));
  });
  console.log(
    `[sitemap] ${unique.length - deduped.length} URLs dropped (invalid, redirect-only or gated); ${publicSlugs ? `${publicSlugs.size} public articles allowed` : "article gating check skipped"}`,
  );

  const clustered = enforceReciprocalLanguages(deduped);
  const dynamicBlocks = clustered.filter(isDynamic);
  const staticBlocks = clustered.filter((b) => !isDynamic(b));

  writeIfNotEmpty("sitemap-static.xml", staticBlocks, "static");
  writeIfNotEmpty("sitemap-dynamic.xml", dynamicBlocks, "dynamic");

  writeFileSync(resolve("public/sitemap.xml"), SITEMAP_INDEX);
  console.log("[sitemap] sitemap.xml index written");
};

void main();
