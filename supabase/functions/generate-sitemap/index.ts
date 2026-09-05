import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "content-type": "application/xml; charset=utf-8",
};

const escapeXml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const BASE_URL = "https://realtrust.ro";

interface BlogArticle {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
  cover_image: string | null;
}

interface Property {
  id: string;
  slug: string;
  name: string;
  updated_at: string | null;
  created_at: string;
  image_path: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating sitemap...");

    // Static pages with priorities
    const staticPages = [
      { url: "", priority: "1.0", changefreq: "daily" },
      { url: "/oaspeti", priority: "0.9", changefreq: "daily" },
      { url: "/pentru-proprietari", priority: "0.9", changefreq: "weekly" },
      { url: "/ansambluri-rezidentiale", priority: "0.9", changefreq: "weekly" },
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
      { url: "/cazare", priority: "0.7", changefreq: "weekly" },
      { url: "/preturi", priority: "0.7", changefreq: "weekly" },
      { url: "/hostscan-ai", priority: "0.8", changefreq: "weekly" },
      { url: "/catalog-investitii", priority: "0.7", changefreq: "weekly" },
      { url: "/contact", priority: "0.7", changefreq: "monthly" },
      { url: "/adauga-anunt", priority: "0.6", changefreq: "monthly" },
      { url: "/calculator-roi", priority: "0.8", changefreq: "weekly" },
      { url: "/evaluare-gratuita", priority: "0.7", changefreq: "monthly" },
      
      { url: "/piata-imobiliara-timisoara", priority: "0.7", changefreq: "weekly" },
      { url: "/cartiere", priority: "0.9", changefreq: "daily" },
      { url: "/zone-investitii-timisoara", priority: "0.8", changefreq: "weekly" },
      { url: "/ghid-evaluare-apartament-timisoara", priority: "0.8", changefreq: "monthly" },
      { url: "/autor/adrian-costi", priority: "0.5", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/zona-girocului", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/zona-aradului", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/circumvalatiunii", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/sagului", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/complex-studentesc", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/calea-lipovei", priority: "0.8", changefreq: "monthly" },
      { url: "/imobiliare-timisoara/isho", priority: "0.8", changefreq: "monthly" },
      // Zone landing pages
      { url: "/zona/centru", priority: "0.7", changefreq: "weekly" },
      { url: "/zona/iulius-town", priority: "0.7", changefreq: "weekly" },
      { url: "/zona/fabric", priority: "0.7", changefreq: "weekly" },
      // Complex landing pages (SEO)
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

    // Fetch published blog articles (with image for image sitemap)
    const { data: blogArticles, error: blogError } = await supabase
      .from("blog_articles")
      .select("slug, title, published_at, created_at, cover_image")
      .eq("is_published", true)
      // Members-only articles are not public pages — keep them out.
      .eq("is_premium", false)
      .not("slug", "is", null)
      .order("published_at", { ascending: false });

    if (blogError) {
      console.error("Error fetching blog articles:", blogError);
    }

    // Fetch active properties (with image for image sitemap)
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("id, slug, name, updated_at, created_at, image_path")
      .eq("is_active", true)
      // A property without a slug has no public URL (it used to emit
      // /proprietate/null), so exclude it at the source.
      .not("slug", "is", null)
      .neq("slug", "")
      .order("display_order", { ascending: true });

    if (propError) {
      console.error("Error fetching properties:", propError);
    }

    // Fetch active residential complexes
    const { data: complexes, error: complexError } = await supabase
      .from("residential_complexes")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("display_order", { ascending: true });

    if (complexError) {
      console.error("Error fetching complexes:", complexError);
    }

    // Fetch approved community articles
    const { data: communityArticles, error: commError } = await supabase
      .from("user_article_submissions")
      .select("id, updated_at, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (commError) {
      console.error("Error fetching community articles:", commError);
    }


    // Build XML sitemap with hreflang
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Helper to generate hreflang alternates — RO and EN share the same canonical URL
    // (language is a client-side state, not a URL segment). This prevents GSC from reporting
    // duplicate "alternative page with canonical tag" pages for ?lang=en variants.
    const hreflang = (path: string) => `    <xhtml:link rel="alternate" hreflang="ro" href="${BASE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`;

    // Add static pages — no <lastmod>: these pages have no per-page timestamp,
    // and emitting the current date on every request is a meaningless signal.
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflang(page.url)}
  </url>
`;
    }


    // Add blog articles (with image sitemap)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/blog-images`;

    if (blogArticles && blogArticles.length > 0) {
      for (const article of blogArticles as BlogArticle[]) {
        const lastmod = article.published_at
          ? new Date(article.published_at).toISOString().split("T")[0]
          : new Date(article.created_at).toISOString().split("T")[0];

        // Resolve cover image URL
        let imageTag = "";
        if (article.cover_image) {
          const imgUrl = article.cover_image.startsWith("http")
            ? article.cover_image
            : `${STORAGE_BASE}/${article.cover_image}`;
          imageTag = `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
    </image:image>`;
        }

        xml += `  <url>
    <loc>${BASE_URL}/blog/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageTag}
${hreflang(`/blog/${article.slug}`)}
  </url>
`;
      }
    }

    // Add properties (with image sitemap)
    const PROPERTY_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/property-images`;
    if (properties && properties.length > 0) {
      for (const property of properties as Property[]) {
        const lastmod = property.updated_at
          ? new Date(property.updated_at).toISOString().split("T")[0]
          : new Date(property.created_at).toISOString().split("T")[0];

        let imageTag = "";
        if (property.image_path) {
          const imgUrl = property.image_path.startsWith("http")
            ? property.image_path
            : `${PROPERTY_STORAGE_BASE}/${property.image_path}`;
          imageTag = `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(property.name)} - ApArt Hotel Timișoara</image:title>
    </image:image>`;
        }

        xml += `  <url>
    <loc>${BASE_URL}/proprietate/${property.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageTag}
${hreflang(`/proprietate/${property.slug}`)}
  </url>
`;
      }
    }

    // Add community articles
    if (communityArticles && communityArticles.length > 0) {
      for (const article of communityArticles) {
        const lastmod = article.updated_at
          ? new Date(article.updated_at).toISOString().split("T")[0]
          : new Date(article.created_at).toISOString().split("T")[0];

        xml += `  <url>
    <loc>${BASE_URL}/comunitate/articol/${article.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add residential complexes. Slugs with a dedicated landing page are
    // already in the static list as /complexe/<slug>; the rest are served by
    // the generic detail route /complex/<slug>, which is their canonical form.
    const LANDING_SLUGS = new Set([
      "isho", "paltim", "ateneo", "green-forest", "helios", "fructus-plaza",
      "city-of-mara", "vivalia", "nord-one", "xcity-towers", "denya-forest",
    ]);
    if (complexes && complexes.length > 0) {
      for (const complex of complexes as Property[]) {
        if (!complex.slug || LANDING_SLUGS.has(complex.slug)) continue;
        const lastmod = complex.updated_at
          ? new Date(complex.updated_at).toISOString().split("T")[0]
          : new Date(complex.created_at).toISOString().split("T")[0];

        xml += `  <url>
    <loc>${BASE_URL}/complex/${complex.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`Sitemap generated with ${staticPages.length + (blogArticles?.length || 0) + (properties?.length || 0) + (communityArticles?.length || 0) + (complexes?.length || 0)} URLs`);

    return new Response(xml, {
      status: 200,
      headers: new Headers({
        ...corsHeaders,
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      }),
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate sitemap" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
