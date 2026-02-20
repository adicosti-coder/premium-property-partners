import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
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
      { url: "/complexe", priority: "0.9", changefreq: "weekly" },
      { url: "/blog", priority: "0.8", changefreq: "daily" },
      { url: "/despre-noi", priority: "0.7", changefreq: "monthly" },
      { url: "/imobiliare", priority: "0.8", changefreq: "weekly" },
      { url: "/investitii", priority: "0.8", changefreq: "weekly" },
      { url: "/rezerva-direct", priority: "0.7", changefreq: "monthly" },
      { url: "/recomanda-proprietar", priority: "0.6", changefreq: "monthly" },
      { url: "/comunitate", priority: "0.6", changefreq: "weekly" },
      { url: "/pentru-oaspeti", priority: "0.7", changefreq: "weekly" },
    ];

    // Fetch published blog articles (with image for image sitemap)
    const { data: blogArticles, error: blogError } = await supabase
      .from("blog_articles")
      .select("slug, title, published_at, created_at, cover_image")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (blogError) {
      console.error("Error fetching blog articles:", blogError);
    }

    // Fetch active properties (with image for image sitemap)
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("id, slug, name, updated_at, created_at, image_path")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (propError) {
      console.error("Error fetching properties:", propError);
    }

    // Fetch active residential complexes
    const { data: complexes, error: complexError } = await supabase
      .from("residential_complexes")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
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

    const today = new Date().toISOString().split("T")[0];

    // Build XML sitemap with hreflang
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Helper to generate hreflang alternates
    const hreflang = (path: string) => `    <xhtml:link rel="alternate" hreflang="ro" href="${BASE_URL}${path}" />
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}${path}${path.includes('?') ? '&' : '?'}lang=en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
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

    // Add residential complexes
    if (complexes && complexes.length > 0) {
      for (const complex of complexes as Property[]) {
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
      headers: corsHeaders,
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
