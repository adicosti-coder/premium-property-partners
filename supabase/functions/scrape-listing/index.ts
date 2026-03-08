import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Download an image from URL and upload to Supabase Storage */
async function downloadAndUploadImage(
  imageUrl: string,
  supabase: any,
  propertyId: string,
  index: number
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RealTrust/1.0)' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const filePath = `${propertyId}/imported-${index}.${ext}`;

    const { error } = await supabase.storage
      .from('property-images')
      .upload(filePath, uint8, { contentType, upsert: true });

    if (error) {
      console.error(`Upload error for image ${index}:`, error.message);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return publicUrl?.publicUrl || null;
  } catch (err) {
    console.error(`Failed to download/upload image ${index}:`, err);
    return null;
  }
}

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

const EXTRACTION_PROMPT = `Extract ALL property listing details from this real estate page. Return JSON with these exact fields:
- title: property name/title (string)
- description_short: a 1-2 sentence summary (string)
- description_full: the complete detailed description text (string)
- price: numeric price value only, no currency symbol (number)
- currency: "EUR" or "RON" (string)
- location: full address or neighborhood + city (string)
- size: property size in sqm, number only (number)
- rooms: number of rooms/bedrooms, number only (number)
- bathrooms: number of bathrooms, number only (number)
- floor: floor number or "parter"/"mansarda"/"demisol" (string or null)
- year_built: construction year (number or null)
- parking: parking info like "garaj", "loc parcare", "nu" (string or null)
- heating_type: heating type like "centrala proprie", "termoficare", "pardoseala" (string or null)
- energy_class: energy efficiency class like "A", "B", "C" (string or null)
- furnished: "mobilat", "partial mobilat", "nemobilat" (string or null)
- construction_type: "bloc", "casa", "vila", "duplex", "penthouse" (string or null)
- compartimentare: "decomandat", "semidecomandat", "nedecomandat", "circular" (string or null)
- features: array of ALL amenities/features mentioned (e.g. "aer conditionat", "balcon", "centrala", "parcare", "lift") (string[])
- images: array of ALL property photo URLs found on the page - use full-resolution URLs, not thumbnails (string[])
- listing_type_hint: "vanzare" if for sale, "inchiriere" if for rent, "cazare" if short-term rental (string)

Be thorough - extract every detail you can find. For missing fields, return null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, listing_type, mode } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const platform = detectPlatform(url);
    console.log(`Scraping listing from ${platform}: ${url}`);

    // Step 1: Scrape with Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links', { type: 'json', prompt: EXTRACTION_PROMPT }],
        waitFor: 5000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    const jsonData = scrapeData?.data?.json || scrapeData?.json || {};
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
    const pageLinks = scrapeData?.data?.links || scrapeData?.links || [];

    // Collect images
    let imageUrls: string[] = [];
    if (Array.isArray(jsonData.images)) imageUrls.push(...jsonData.images);

    const imageExtensions = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i;
    const imageFromLinks = pageLinks.filter((link: string) =>
      imageExtensions.test(link) &&
      !link.includes('logo') && !link.includes('icon') &&
      !link.includes('avatar') && !link.includes('thumb') &&
      link.length > 20
    );
    imageUrls.push(...imageFromLinks);

    const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let mdMatch;
    while ((mdMatch = mdImageRegex.exec(markdown)) !== null) {
      imageUrls.push(mdMatch[1]);
    }
    imageUrls = [...new Set(imageUrls)].slice(0, 30);

    // Build extracted data
    const extracted = {
      title: jsonData.title || null,
      description_short: jsonData.description_short || null,
      description_full: jsonData.description_full || jsonData.description || null,
      price: jsonData.price ? Number(jsonData.price) : null,
      currency: jsonData.currency || null,
      location: jsonData.location || null,
      size: jsonData.size ? Number(jsonData.size) : null,
      rooms: jsonData.rooms ? Number(jsonData.rooms) : null,
      bathrooms: jsonData.bathrooms ? Number(jsonData.bathrooms) : null,
      floor: jsonData.floor || null,
      year_built: jsonData.year_built ? Number(jsonData.year_built) : null,
      parking: jsonData.parking || null,
      heating_type: jsonData.heating_type || null,
      energy_class: jsonData.energy_class || null,
      furnished: jsonData.furnished || null,
      construction_type: jsonData.construction_type || null,
      compartimentare: jsonData.compartimentare || null,
      features: Array.isArray(jsonData.features) ? jsonData.features : [],
      images: imageUrls,
      listing_type_hint: jsonData.listing_type_hint || null,
      source_url: url,
      source_platform: platform,
    };

    // If mode is "preview", return extracted data without saving
    if (mode === 'preview') {
      return new Response(
        JSON.stringify({ success: true, extracted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: "save" - create property in DB
    const finalListingType = listing_type || extracted.listing_type_hint || 'vanzare';

    const slug = extracted.title
      ? extracted.title.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          .substring(0, 80)
      : `import-${Date.now()}`;

    const propertyData: Record<string, any> = {
      name: extracted.title || 'Anunț Importat',
      location: extracted.location || 'Timișoara',
      description_ro: extracted.description_short || extracted.description_full || '',
      description_en: '',
      long_description_ro: extracted.description_full || '',
      long_description_en: '',
      features: extracted.features,
      booking_url: url,
      tag: finalListingType === 'vanzare' ? 'De Vânzare' : finalListingType === 'inchiriere' ? 'De Închiriat' : 'Disponibil',
      listing_type: finalListingType,
      slug,
      is_active: false,
      capacity: extracted.rooms ? extracted.rooms * 2 : 2,
      bedrooms: extracted.rooms || 1,
      bathrooms: extracted.bathrooms || 1,
      size: extracted.size || 40,
      base_price_per_night: extracted.price || null,
      capital_necesar: (finalListingType === 'vanzare' || finalListingType === 'investitie') ? extracted.price : null,
      floor: extracted.floor,
      year_built: extracted.year_built,
      parking: extracted.parking,
      heating_type: extracted.heating_type,
      energy_class: extracted.energy_class,
      furnished: extracted.furnished,
      construction_type: extracted.construction_type,
      compartimentare: extracted.compartimentare,
      source_url: url,
      source_platform: platform,
    };

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

    // Upload images
    const uploadedImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const uploaded = await downloadAndUploadImage(imageUrls[i], supabase, newProperty.id, i);
      if (uploaded) uploadedImages.push(uploaded);
      if (i < imageUrls.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    if (uploadedImages.length > 0) {
      await supabase.from('properties').update({
        image_path: uploadedImages[0],
        images: uploadedImages,
      }).eq('id', newProperty.id);

      const imageEntries = uploadedImages.map((imgPath, idx) => ({
        property_id: newProperty.id,
        image_path: imgPath,
        display_order: idx,
        is_primary: idx === 0,
      }));
      await supabase.from('property_images').insert(imageEntries);
    }

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
    console.error('Scrape listing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
