import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://www.realtrust.ro";
const DEFAULT_IMAGE = `${BASE_URL}/images/hero-optimized-1920w.webp`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return Response.redirect(`${BASE_URL}/`, 302);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to find property by slug or UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    
    let property: any = null;

    if (isUUID) {
      const { data } = await supabase
        .from("properties")
        .select("id, name, description_ro, long_description_ro, location, slug")
        .eq("id", slug)
        .single();
      property = data;
    } else {
      // Try slug column first
      const { data } = await supabase
        .from("properties")
        .select("id, name, description_ro, long_description_ro, location, slug")
        .eq("slug", slug)
        .single();
      property = data;

      // Fallback: try name match for static properties
      if (!property) {
        const { data: nameMatch } = await supabase
          .from("properties")
          .select("id, name, description_ro, long_description_ro, location, slug")
          .ilike("name", `%${slug.replace(/-/g, " ")}%`)
          .limit(1)
          .single();
        property = nameMatch;
      }
    }

    // Get the first published image for this property
    let ogImage = DEFAULT_IMAGE;
    if (property?.id) {
      const { data: images } = await supabase
        .from("property_images")
        .select("image_path")
        .eq("property_id", property.id)
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .limit(1);

      if (images && images.length > 0) {
        const imgPath = images[0].image_path;
        if (imgPath.startsWith("http")) {
          ogImage = imgPath;
        } else {
          const { data: urlData } = supabase.storage
            .from("property-images")
            .getPublicUrl(imgPath);
          ogImage = urlData.publicUrl;
        }
      }
    }

    const canonicalUrl = `${BASE_URL}/proprietate/${slug}`;
    const title = property
      ? `${property.name} | RealTrust Timișoara`
      : "RealTrust & ApArt Hotel Timișoara";

    // Clean description: strip HTML, limit to 150 chars
    const rawDesc = property?.long_description_ro || property?.description_ro || "";
    const cleanDesc = rawDesc
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const description = cleanDesc.length > 150
      ? cleanDesc.slice(0, 147) + "..."
      : cleanDesc || "Cazare premium în Timișoara. Rezervă direct pe RealTrust.";

    const imageAlt = property
      ? `${property.name} — cazare regim hotelier ${property.location || "Timișoara"}`
      : "RealTrust & ApArt Hotel Timișoara";

    // Return a minimal HTML page with correct OG tags + instant redirect for humans
    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:site_name" content="RealTrust & ApArt Hotel">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <!-- Redirect humans to the real SPA page -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  <script>window.location.replace("${canonicalUrl}");</script>
</head>
<body>
  <p>Redirecting to <a href="${canonicalUrl}">${escapeHtml(property?.name || "RealTrust")}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error: any) {
    console.error("[og-property] Error:", error.message);
    // Fallback: redirect to the SPA page
    const slug = new URL(req.url).searchParams.get("slug") || "";
    return Response.redirect(`${BASE_URL}/proprietate/${slug}`, 302);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
