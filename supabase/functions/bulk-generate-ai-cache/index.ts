import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);
    const { type, language } = await req.json();
    const lang = language || "ro";

    // Fetch all active properties
    const { data: properties } = await sb
      .from("properties")
      .select("id, slug, name, location, size, bedrooms, bathrooms, capacity, floor, base_price_per_night, amenities, listing_type, year_built, energy_class, roi_percentage, images")
      .eq("is_active", true)
      .order("name");

    if (!properties?.length) {
      return new Response(JSON.stringify({ generated: 0, errors: 0, message: "No properties found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    if (type === "advisor" || type === "all") {
      // Find properties missing advisor cache
      const { data: cachedAdvisor } = await sb
        .from("advisor_cache")
        .select("property_slug")
        .eq("language", lang);

      const cachedSlugs = new Set((cachedAdvisor || []).map((c: any) => c.property_slug));
      const missingAdvisor = properties.filter(p => p.slug && !cachedSlugs.has(p.slug));

      for (const prop of missingAdvisor) {
        try {
          // Call the existing generate-advisor-content function logic inline
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-advisor-content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              propertyName: prop.name,
              propertySlug: prop.slug,
              location: prop.location,
              size: prop.size,
              bedrooms: prop.bedrooms,
              bathrooms: prop.bathrooms,
              capacity: prop.capacity,
              floor: prop.floor,
              pricePerNight: prop.base_price_per_night,
              amenities: prop.amenities,
              listingType: prop.listing_type,
              yearBuilt: prop.year_built,
              energyClass: prop.energy_class,
              roi: prop.roi_percentage,
              language: lang,
            }),
          });

          if (response.ok) {
            generated++;
            console.log(`✅ Advisor generated for: ${prop.name}`);
          } else {
            const errText = await response.text();
            errors++;
            errorDetails.push(`Advisor ${prop.name}: ${response.status} - ${errText.substring(0, 100)}`);
            console.error(`❌ Advisor failed for ${prop.name}: ${response.status}`);
          }

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          errors++;
          errorDetails.push(`Advisor ${prop.name}: ${e.message}`);
        }
      }
    }

    if (type === "captions" || type === "all") {
      // Find images missing captions
      const { data: cachedCaptions } = await sb
        .from("image_caption_cache")
        .select("image_url")
        .eq("language", lang);

      const cachedUrls = new Set((cachedCaptions || []).map((c: any) => c.image_url));

      for (const prop of properties) {
        const images = Array.isArray(prop.images) ? prop.images : [];
        const missingImages = images.filter((img: string) => !cachedUrls.has(img));

        for (const imageUrl of missingImages) {
          try {
            const normalizedImageUrl = imageUrl.startsWith("http")
              ? imageUrl
              : `${supabaseUrl}/storage/v1/object/public/property-images/${imageUrl}`;

            const response = await fetch(`${supabaseUrl}/functions/v1/generate-image-caption`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                imageUrl: normalizedImageUrl,
                propertyName: prop.name,
                language: lang,
              }),
            });

            if (response.ok) {
              generated++;
              console.log(`✅ Caption generated for image of: ${prop.name}`);
            } else {
              errors++;
              const errText = await response.text();
              errorDetails.push(`Caption ${prop.name}: ${response.status} - ${errText.substring(0, 100)}`);
            }

            // Delay between caption requests
            await new Promise(r => setTimeout(r, 1500));
          } catch (e) {
            errors++;
            errorDetails.push(`Caption ${prop.name}: ${e.message}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      generated, 
      errors, 
      errorDetails: errorDetails.slice(0, 10),
      message: `Generated ${generated} items with ${errors} errors` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Bulk generate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
