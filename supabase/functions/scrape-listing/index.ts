import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapedListing {
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  size: number | null;
  rooms: number | null;
  bathrooms: number | null;
  features: string[];
  images: string[];
  source_url: string;
}

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
      .upload(filePath, uint8, {
        contentType,
        upsert: true,
      });

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, listing_type } = await req.json();

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

    console.log(`Scraping listing from: ${url}`);

    // Step 1: Scrape the page with Firecrawl - get markdown + images
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links', { type: 'json', prompt: `Extract property listing details from this real estate page. Return JSON with these fields:
- title: property name/title
- description: full description text
- price: numeric price (just the number, no currency)
- currency: "EUR" or "RON" 
- location: full address or area
- size: property size in sqm (just number)
- rooms: number of rooms/bedrooms (just number)
- bathrooms: number of bathrooms (just number)
- features: array of amenities/features as strings
- images: array of ALL property photo URLs found on the page (full URLs, not thumbnails - look for the largest resolution available)
- listing_type_hint: "vanzare" if for sale, "inchiriere" if for rent, "cazare" if short-term rental` }],
        waitFor: 5000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape response status:', scrapeResponse.status);

    const jsonData = scrapeData?.data?.json || scrapeData?.json || {};
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
    const pageLinks = scrapeData?.data?.links || scrapeData?.links || [];

    // Collect images from JSON extraction + page links
    let imageUrls: string[] = [];

    // From JSON extraction
    if (Array.isArray(jsonData.images)) {
      imageUrls.push(...jsonData.images);
    }

    // From page links - filter for image URLs
    const imageExtensions = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i;
    const imageFromLinks = pageLinks.filter((link: string) =>
      imageExtensions.test(link) &&
      !link.includes('logo') &&
      !link.includes('icon') &&
      !link.includes('avatar') &&
      !link.includes('thumb') &&
      link.length > 20
    );
    imageUrls.push(...imageFromLinks);

    // Also extract image URLs from markdown
    const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let mdMatch;
    while ((mdMatch = mdImageRegex.exec(markdown)) !== null) {
      imageUrls.push(mdMatch[1]);
    }

    // Deduplicate images
    imageUrls = [...new Set(imageUrls)].slice(0, 30); // Max 30 images

    console.log(`Found ${imageUrls.length} images`);

    // Build the listing data
    const listing: ScrapedListing = {
      title: jsonData.title || null,
      description: jsonData.description || null,
      price: jsonData.price ? Number(jsonData.price) : null,
      currency: jsonData.currency || null,
      location: jsonData.location || null,
      size: jsonData.size ? Number(jsonData.size) : null,
      rooms: jsonData.rooms ? Number(jsonData.rooms) : null,
      bathrooms: jsonData.bathrooms ? Number(jsonData.bathrooms) : null,
      features: Array.isArray(jsonData.features) ? jsonData.features : [],
      images: imageUrls,
      source_url: url,
    };

    // Determine listing type
    const finalListingType = listing_type || jsonData.listing_type_hint || 'vanzare';

    // Generate slug from title
    const slug = listing.title
      ? listing.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 80)
      : `import-${Date.now()}`;

    // Step 2: Create property in database
    const propertyData: Record<string, any> = {
      name: listing.title || 'Imported Listing',
      location: listing.location || 'Timișoara',
      description_ro: listing.description || '',
      description_en: '',
      features: listing.features,
      booking_url: url,
      tag: finalListingType === 'vanzare' ? 'De Vânzare' : finalListingType === 'inchiriere' ? 'De Închiriat' : 'Disponibil',
      listing_type: finalListingType,
      slug,
      is_active: false, // Start inactive until admin reviews
      capacity: listing.rooms ? listing.rooms * 2 : 2,
      bedrooms: listing.rooms || 1,
      bathrooms: listing.bathrooms || 1,
      size: listing.size || 40,
      base_price_per_night: listing.price || null,
      capital_necesar: finalListingType === 'vanzare' || finalListingType === 'investitie' ? listing.price : null,
    };

    const { data: newProperty, error: insertError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select('id, slug, name')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create property: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created property: ${newProperty.id}`);

    // Step 3: Download and upload images
    const uploadedImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const uploaded = await downloadAndUploadImage(imageUrls[i], supabase, newProperty.id, i);
      if (uploaded) {
        uploadedImages.push(uploaded);
      }
      // Small delay between downloads
      if (i < imageUrls.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`Uploaded ${uploadedImages.length}/${imageUrls.length} images`);

    // Step 4: Update property with uploaded image paths
    if (uploadedImages.length > 0) {
      // Set first image as main image_path, rest in images array
      await supabase
        .from('properties')
        .update({
          image_path: uploadedImages[0],
          images: uploadedImages,
        })
        .eq('id', newProperty.id);

      // Also create property_images entries
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
        property: {
          id: newProperty.id,
          slug: newProperty.slug,
          name: newProperty.name,
        },
        scraped: {
          title: listing.title,
          location: listing.location,
          price: listing.price,
          currency: listing.currency,
          size: listing.size,
          rooms: listing.rooms,
          features_count: listing.features.length,
          images_found: imageUrls.length,
          images_uploaded: uploadedImages.length,
        },
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
