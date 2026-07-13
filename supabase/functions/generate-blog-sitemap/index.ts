import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const BASE_URL = "https://www.realtrust.ro";

const escapeXml = (str: string) =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const CATEGORY_SLUGS = [
  "ghid-turistic-timisoara",
  "investitii-imobiliare",
  "sfaturi-proprietari",
  "taxe-legislatie",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: articles } = await supabase
      .from("blog_articles")
      .select("slug, title, published_at, updated_at, created_at, cover_image, main_image_url, geo_location")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    const STORAGE_BASE = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/blog-images`;
    const today = new Date().toISOString().split("T")[0];

    const slugifyLocation = (input: string): string =>
      input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Distinct location slugs with their most recent article date.
    const locationLastmod = new Map<string, string>();
    for (const a of articles ?? []) {
      if (!a.geo_location) continue;
      const s = slugifyLocation(a.geo_location);
      if (!s) continue;
      const d = (a.updated_at || a.published_at || a.created_at || today).split("T")[0];
      const prev = locationLastmod.get(s);
      if (!prev || d > prev) locationLastmod.set(s, d);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Blog hub
    xml += `  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Category hubs
    for (const slug of CATEGORY_SLUGS) {
      xml += `  <url>
    <loc>${BASE_URL}/blog/categorie/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Location archive hubs (auto-generated from geo_location)
    for (const [slug, lastmod] of locationLastmod) {
      xml += `  <url>
    <loc>${BASE_URL}/blog/locatie/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
`;
    }


    // Articles
    for (const a of articles ?? []) {
      const lastmod = (a.updated_at || a.published_at || a.created_at || new Date().toISOString()).split("T")[0];
      let imageTag = "";
      const rawImage = (a as { main_image_url?: string | null }).main_image_url || a.cover_image;
      if (rawImage) {
        const imgUrl = rawImage.startsWith("http") ? rawImage : `${STORAGE_BASE}/${rawImage}`;
        imageTag = `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(a.title)}</image:title>
    </image:image>`;
      }
      xml += `  <url>
    <loc>${BASE_URL}/blog/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>
`;
    }

    xml += `</urlset>`;
    return new Response(xml, { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(`<?xml version="1.0"?><error>${(e as Error).message}</error>`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
