import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  scrapeWithFirecrawl,
  extractFromMarkdownWithAI,
  collectImages,
  buildExtracted,
} from "./extract.ts";
import { uploadImagesForProperty } from "./storage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Detect platform from URL */
function detectPlatform(url: string): string {
  if (url.includes('olx.ro')) return 'OLX';
  if (url.includes('imobiliare.ro')) return 'Imobiliare.ro';
  if (url.includes('storia.ro')) return 'Storia';
  if (url.includes('publi24.ro')) return 'Publi24';
  if (url.includes('anuntul.ro')) return 'Anuntul.ro';
  if (url.includes('booking.com')) return 'Booking.com';
  if (url.includes('airbnb.')) return 'Airbnb';
  return 'Altă sursă';
}

/** Build property data for insert */
function buildPropertyData(
  data: Record<string, any>,
  url: string,
  platform: string,
  listingType: string
): Record<string, any> {
  const slug = data.title
    ? data.title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        .substring(0, 80)
    : `import-${Date.now()}`;

  return {
    name: data.title || 'Anunț Importat',
    location: data.location || 'Timișoara',
    description_ro: data.description_short || data.description_full || '',
    description_en: '',
    long_description_ro: data.description_full || '',
    long_description_en: '',
    features: data.features || [],
    booking_url: url,
    tag: listingType === 'vanzare' ? 'De Vânzare' : listingType === 'inchiriere' ? 'De Închiriat' : 'Disponibil',
    listing_type: listingType,
    slug,
    is_active: false,
    capacity: data.rooms ? Number(data.rooms) * 2 : 2,
    bedrooms: data.rooms ? Number(data.rooms) : 1,
    bathrooms: data.bathrooms ? Number(data.bathrooms) : 1,
    size: data.size ? Number(data.size) : 40,
    base_price_per_night: data.price ? Number(data.price) : null,
    capital_necesar: (listingType === 'vanzare' || listingType === 'investitie') ? (data.price ? Number(data.price) : null) : null,
    floor: data.floor || null,
    year_built: data.year_built ? Number(data.year_built) : null,
    parking: data.parking || null,
    heating_type: data.heating_type || null,
    energy_class: data.energy_class || null,
    furnished: data.furnished || null,
    construction_type: data.construction_type || null,
    compartimentare: data.compartimentare || null,
    source_url: url,
    source_platform: platform,
    contact_name: data.contact_name || null,
    contact_phone: data.contact_phone || null,
    contact_email: data.contact_email || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, listing_type, mode, editedData } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const platform = detectPlatform(url);

    // ── MODE: SAVE with pre-edited data ──
    if (mode === 'save' && editedData) {
      console.log(`[Save] Saving edited listing from ${platform}: ${url}`);

      const finalListingType = listing_type || editedData.listing_type_hint || 'vanzare';
      const propertyData = buildPropertyData(editedData, url, platform, finalListingType);

      const { data: newProperty, error: insertError } = await supabase
        .from('properties')
        .insert(propertyData)
        .select('id, slug, name')
        .single();

      if (insertError) {
        console.error('[Save] Insert error:', insertError.message);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upload images
      const imageUrls = Array.isArray(editedData.images) ? editedData.images : [];
      console.log(`[Save] Uploading ${imageUrls.length} images...`);
      const uploadedImages = await uploadImagesForProperty(imageUrls, supabase, newProperty.id);

      console.log(`[Save] Done. Property: ${newProperty.name}, images uploaded: ${uploadedImages.length}`);
      return new Response(
        JSON.stringify({
          success: true,
          property: newProperty,
          extracted: editedData,
          images_uploaded: uploadedImages.length,
          listing_type: finalListingType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── MODE: PREVIEW ──
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Preview] Scraping listing from ${platform}: ${url}`);

    // Step 1: Scrape with Firecrawl
    const { jsonData, markdown, pageLinks } = await scrapeWithFirecrawl(url, firecrawlKey);

    // Step 2: Check if structured extraction returned data
    const hasStructuredData = Object.values(jsonData).some(v => v !== null && v !== undefined && v !== '');
    let finalJsonData = jsonData;

    if (!hasStructuredData && markdown.length > 50) {
      console.log('[Preview] Structured extraction empty — falling back to AI extraction from markdown');
      const aiExtracted = await extractFromMarkdownWithAI(markdown, url);
      finalJsonData = { ...jsonData, ...aiExtracted };
    } else if (!hasStructuredData) {
      console.log('[Preview] Both structured and markdown extraction empty. The page may be blocked or require JS.');
    }

    // Step 3: Collect images from all sources
    const imageUrls = collectImages(finalJsonData, pageLinks, markdown);
    console.log(`[Preview] Total images collected: ${imageUrls.length}`);

    // Build result
    const extracted = buildExtracted(finalJsonData, imageUrls, url, platform);

    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, extracted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy save mode (without editedData)
    const finalListingType = listing_type || extracted.listing_type_hint || 'vanzare';
    const propertyData = buildPropertyData(extracted, url, platform, finalListingType);

    const { data: newProperty, error: insertError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select('id, slug, name')
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadedImages = await uploadImagesForProperty(imageUrls, supabase, newProperty.id);

    return new Response(
      JSON.stringify({
        success: true,
        property: newProperty,
        extracted,
        images_uploaded: uploadedImages.length,
        listing_type: finalListingType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Error] Scrape listing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
