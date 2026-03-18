import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find all property_images with data: URIs
    const { data: images, error: fetchError } = await supabase
      .from("property_images")
      .select("id, property_id, image_path")
      .like("image_path", "data:%")
      .limit(50);

    if (fetchError) throw fetchError;
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ migrated: 0, message: "No data URI images found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const img of images) {
      try {
        const dataUri = img.image_path as string;
        const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          errors.push(`${img.id}: Invalid data URI format`);
          continue;
        }

        const contentType = match[1];
        const base64Data = match[2];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType });

        const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
        const fileName = `${img.property_id}/${Date.now()}-migrated-${img.id.slice(0, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, blob, { contentType, upsert: true });

        if (uploadError) {
          errors.push(`${img.id}: Upload failed - ${uploadError.message}`);
          continue;
        }

        // Update the record with storage path
        const { error: updateError } = await supabase
          .from("property_images")
          .update({ image_path: fileName })
          .eq("id", img.id);

        if (updateError) {
          errors.push(`${img.id}: DB update failed - ${updateError.message}`);
          continue;
        }

        migrated++;
      } catch (e) {
        errors.push(`${img.id}: ${e.message}`);
      }
    }

    // Also update the properties.images arrays for affected properties
    const propertyIds = [...new Set(images.map(i => i.property_id))];
    for (const propId of propertyIds) {
      // Check if there are any published images
      const { data: publishedImages } = await supabase
        .from("property_images")
        .select("id, image_path, display_order")
        .eq("property_id", propId)
        .eq("is_published", true)
        .order("display_order");

      // If no published images, auto-publish all migrated ones
      if (!publishedImages || publishedImages.length === 0) {
        await supabase
          .from("property_images")
          .update({ is_published: true })
          .eq("property_id", propId)
          .not("image_path", "like", "data:%");
      }

      // Re-fetch after potential publish
      const { data: finalImages } = await supabase
        .from("property_images")
        .select("image_path, display_order")
        .eq("property_id", propId)
        .eq("is_published", true)
        .order("display_order");

      if (finalImages && finalImages.length > 0) {
        await supabase.from("properties").update({
          images: finalImages.map(i => i.image_path),
          image_path: finalImages[0].image_path,
        }).eq("id", propId);
      }
    }

    return new Response(
      JSON.stringify({ migrated, total: images.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
