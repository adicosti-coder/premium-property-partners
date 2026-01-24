import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const BASE_URL = "https://realtrustaparthotel.lovable.app";

interface BlogArticle {
  slug: string;
  published_at: string | null;
  created_at: string;
}

interface Property {
  slug: string;
  updated_at: string | null;
  created_at: string;
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
      { url: "/blog", priority: "0.8", changefreq: "daily" },
      { url: "/despre-noi", priority: "0.7", changefreq: "monthly" },
      { url: "/imobiliare", priority: "0.8", changefreq: "weekly" },
      { url: "/de-ce-rezervare-directa", priority: "0.7", changefreq: "monthly" },
      { url: "/program-referral", priority: "0.6", changefreq: "monthly" },
      { url: "/articole-comunitate", priority: "0.6", changefreq: "weekly" },
    ];

    // Fetch published blog articles
    const { data: blogArticles, error: blogError } = await supabase
      .from("blog_articles")
      .select("slug, published_at, created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (blogError) {
      console.error("Error fetching blog articles:", blogError);
    }

    // Fetch active properties
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("slug, updated_at, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (propError) {
      console.error("Error fetching properties:", propError);
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

    // Build XML sitemap
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog articles
    if (blogArticles && blogArticles.length > 0) {
      for (const article of blogArticles as BlogArticle[]) {
        const lastmod = article.published_at
          ? new Date(article.published_at).toISOString().split("T")[0]
          : new Date(article.created_at).toISOString().split("T")[0];

        xml += `  <url>
    <loc>${BASE_URL}/blog/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add properties
    if (properties && properties.length > 0) {
      for (const property of properties as Property[]) {
        const lastmod = property.updated_at
          ? new Date(property.updated_at).toISOString().split("T")[0]
          : new Date(property.created_at).toISOString().split("T")[0];

        xml += `  <url>
    <loc>${BASE_URL}/proprietate/${property.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
    <loc>${BASE_URL}/articol-comunitate/${article.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`Sitemap generated with ${staticPages.length + (blogArticles?.length || 0) + (properties?.length || 0) + (communityArticles?.length || 0)} URLs`);

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
