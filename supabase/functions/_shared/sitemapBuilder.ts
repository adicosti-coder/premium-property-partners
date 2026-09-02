// Shared sitemap builders used by the public `sitemap` edge function (and any
// build-time generator). Everything is emitted on the canonical apex domain
// (https://realtrust.ro), without query parameters, so Search Console never
// sees a cross-host, www or parameterised URL.

export const BASE_URL = "https://realtrust.ro";

export const XML_HEADERS: Record<string, string> = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=3600, s-maxage=3600",
  "x-content-type-options": "nosniff",
  "access-control-allow-origin": "*",
};

export const escapeXml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** URL-safe anchor slug for a POI name — mirrors `poiSlug` in the frontend. */
export const poiSlug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const hreflang = (path: string) =>
  `    <xhtml:link rel="alternate" hreflang="ro" href="${BASE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`;

const URLSET_OPEN = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

export const STATIC_PAGES: { url: string; priority: string; changefreq: string }[] = [
  { url: "", priority: "1.0", changefreq: "daily" },
  { url: "/oaspeti", priority: "0.9", changefreq: "daily" },
  { url: "/pentru-proprietari", priority: "0.9", changefreq: "weekly" },
  { url: "/complexe", priority: "0.9", changefreq: "weekly" },
  { url: "/blog", priority: "0.8", changefreq: "daily" },
  { url: "/blog/categorie/ghid-turistic-timisoara", priority: "0.8", changefreq: "weekly" },
  { url: "/blog/categorie/investitii-imobiliare", priority: "0.8", changefreq: "weekly" },
  { url: "/blog/categorie/sfaturi-proprietari", priority: "0.8", changefreq: "weekly" },
  { url: "/blog/categorie/taxe-legislatie", priority: "0.8", changefreq: "weekly" },
  { url: "/despre-noi", priority: "0.7", changefreq: "monthly" },
  { url: "/imobiliare", priority: "0.8", changefreq: "weekly" },
  { url: "/investitii", priority: "0.8", changefreq: "weekly" },
  { url: "/rezerva-direct", priority: "0.7", changefreq: "monthly" },
  { url: "/recomanda-proprietar", priority: "0.6", changefreq: "monthly" },
  { url: "/comunitate", priority: "0.6", changefreq: "weekly" },
  { url: "/pentru-oaspeti", priority: "0.7", changefreq: "weekly" },
  { url: "/preturi", priority: "0.7", changefreq: "weekly" },
  { url: "/analiza-proprietate", priority: "0.8", changefreq: "weekly" },
  { url: "/catalog-investitii", priority: "0.7", changefreq: "weekly" },
  { url: "/contact", priority: "0.7", changefreq: "monthly" },
  { url: "/adauga-anunt", priority: "0.6", changefreq: "monthly" },
  { url: "/calculator-roi", priority: "0.8", changefreq: "weekly" },
  { url: "/evaluare-gratuita", priority: "0.7", changefreq: "monthly" },
  { url: "/piata-imobiliara-timisoara", priority: "0.7", changefreq: "weekly" },
  { url: "/imobiliare-timisoara", priority: "0.9", changefreq: "daily" },
  { url: "/imobiliare-timisoara/zona-girocului", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/zona-aradului", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/circumvalatiunii", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/sagului", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/complex-studentesc", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/calea-lipovei", priority: "0.8", changefreq: "monthly" },
  { url: "/imobiliare-timisoara/isho", priority: "0.8", changefreq: "monthly" },
  { url: "/zona/centru", priority: "0.7", changefreq: "weekly" },
  { url: "/zona/iulius-town", priority: "0.7", changefreq: "weekly" },
  { url: "/zona/fabric", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/isho", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/ateneo", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/green-forest", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/helios", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/fructus-plaza", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/city-of-mara", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/vivalia", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/nord-one", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/xcity-towers", priority: "0.7", changefreq: "weekly" },
  { url: "/complexe/denya-forest", priority: "0.7", changefreq: "weekly" },
];

export function buildSitemapIndex(): string {
  const now = new Date().toISOString().split("T")[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-dynamic.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
}

// Apartamentele de oaspeți definite static în `src/data/properties.ts` (nu
// există rânduri în `public.properties`). Sunt emise pe canonical-ul
// /proprietate/<slug>, identic cu prerender-ul SEO. Ține lista sincronizată
// când adaugi un apartament nou.
export const GUEST_APARTMENTS: { slug: string; name: string; image?: string }[] = [
  { slug: "fullview-studio-deluxe", name: "Cross Square House by RealTrust", image: "https://d3hj7i5wny7p5d.cloudfront.net/upload/hotel/97/7773/73271-m.jpg" },
  { slug: "sunset-da-ra-studio-deluxe", name: "Sunset Da Ra Studio DeLuxe", image: "https://d3hj7i5wny7p5d.cloudfront.net/upload/hotel/15/7388/63154-m.jpg" },
  { slug: "moonlight-emerald-suite", name: "Moonlight Emerald Suite by RealTrust", image: "https://d3hj7i5wny7p5d.cloudfront.net/upload/hotel/22/7799/73158-m.jpg" },
  { slug: "xcity-3-apart-hotel", name: "XCity 3 ApArt Hotel by RealTrust", image: "https://d3hj7i5wny7p5d.cloudfront.net/upload/hotel/42/7718/69009-m.jpg" },
  { slug: "ring-residence-apart-hotel", name: "Ring Residence ApArt Hotel by RealTrust", image: "https://d3hj7i5wny7p5d.cloudfront.net/upload/hotel/1/7778/73005-m.jpg" },
];

export function buildStaticSitemap(): string {

  let xml = URLSET_OPEN;
  for (const page of STATIC_PAGES) {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflang(page.url)}
  </url>
`;
  }
  return xml + `</urlset>`;
}

const day = (primary: string | null, fallback: string) =>
  new Date(primary ?? fallback).toISOString().split("T")[0];

// deno-lint-ignore no-explicit-any
export async function buildDynamicSitemap(supabase: any): Promise<string> {
  const storageBase = `${Deno.env.get("SUPABASE_URL") ?? ""}/storage/v1/object/public`;

  const [blog, properties, complexes, community, pois] = await Promise.all([
    supabase
      .from("blog_articles")
      .select("slug, title, published_at, created_at, cover_image")
      .eq("is_published", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("properties")
      .select("slug, name, updated_at, created_at, image_path")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("residential_complexes")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("user_article_submissions")
      .select("id, updated_at, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("points_of_interest")
      .select("id, name, category, updated_at, created_at, image_url")
      .in("category", ["restaurant", "cafe"])
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  let xml = URLSET_OPEN;

  const imageTag = (raw: string | null, bucket: string, title: string) => {
    if (!raw) return "";
    const url = raw.startsWith("http") ? raw : `${storageBase}/${bucket}/${raw}`;
    return `
    <image:image>
      <image:loc>${escapeXml(url)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
  };

  for (const a of blog.data ?? []) {
    if (!a.slug) continue;
    xml += `  <url>
    <loc>${BASE_URL}/blog/${a.slug}</loc>
    <lastmod>${day(a.published_at, a.created_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageTag(a.cover_image, "blog-images", a.title ?? "")}
${hreflang(`/blog/${a.slug}`)}
  </url>
`;
  }

  const emittedProperties = new Set<string>();
  for (const p of properties.data ?? []) {
    if (!p.slug) continue;
    emittedProperties.add(p.slug);
    xml += `  <url>
    <loc>${BASE_URL}/proprietate/${p.slug}</loc>
    <lastmod>${day(p.updated_at, p.created_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageTag(p.image_path, "property-images", `${p.name ?? ""} - ApArt Hotel Timișoara`)}
${hreflang(`/proprietate/${p.slug}`)}
  </url>
`;
  }

  const today = new Date().toISOString().split("T")[0];
  for (const g of GUEST_APARTMENTS) {
    if (emittedProperties.has(g.slug)) continue;
    xml += `  <url>
    <loc>${BASE_URL}/proprietate/${g.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageTag(g.image ?? null, "property-images", `${g.name} - cazare regim hotelier Timișoara`)}
${hreflang(`/proprietate/${g.slug}`)}
  </url>
`;
  }


  for (const c of complexes.data ?? []) {
    if (!c.slug) continue;
    xml += `  <url>
    <loc>${BASE_URL}/complex/${c.slug}</loc>
    <lastmod>${day(c.updated_at, c.created_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  for (const a of community.data ?? []) {
    xml += `  <url>
    <loc>${BASE_URL}/comunitate/articol/${a.id}</loc>
    <lastmod>${day(a.updated_at, a.created_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
  }

  // POI deep-links (restaurants & cafes) inside the interactive guide article.
  // Emitted as `?poi=<slug>` — an indexable, parameterised URL (Google ignores
  // pure `#fragment` variants), one per venue.
  const guideArticle = (blog.data ?? []).find(
    // deno-lint-ignore no-explicit-any
    (a: any) => typeof a.slug === "string" && /restaurant/i.test(a.slug),
  );
  if (guideArticle?.slug) {
    for (const poi of pois.data ?? []) {
      if (!poi.name) continue;
      const slug = poiSlug(poi.name);
      if (!slug) continue;
      const path = `/blog/${guideArticle.slug}?poi=${slug}`;
      xml += `  <url>
    <loc>${escapeXml(`${BASE_URL}${path}`)}</loc>
    <lastmod>${day(poi.updated_at, poi.created_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>${imageTag(poi.image_url, "poi-images", poi.name)}
  </url>
`;
    }
  }

  return xml + `</urlset>`;
}

