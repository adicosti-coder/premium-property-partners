import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LiveData {
  property_slug: string;
  booking_url: string | null;
  booking_com_url: string | null;
}

async function scrapeWithFirecrawl(url: string, prompt: string, firecrawlKey: string): Promise<Record<string, any> | null> {
  try {
    console.log(`Scraping: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', prompt }],
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    const jsonData = data?.data?.json || data?.json;
    console.log(`Result for ${url}:`, JSON.stringify(jsonData).substring(0, 800));
    return jsonData || null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

const pynbookingPrompt = `Extract ALL available property details from this accommodation booking page. Return as JSON with these fields:
- "price_weekday": numeric nightly price for weekdays (just the number, no currency)
- "price_weekend": numeric nightly price for weekends/Friday-Saturday (just the number, no currency)  
- "capacity": maximum number of guests (number)
- "bedrooms": number of bedrooms (number)
- "bathrooms": number of bathrooms (number)
- "size_sqm": apartment size in square meters (number)
- "amenities": array of amenity names in Romanian (e.g. ["WiFi", "Aer condiționat", "Parcare gratuită"])
- "description_ro": main property description text in Romanian
- "check_in_time": check-in time (e.g. "15:00")
- "check_out_time": check-out time (e.g. "11:00")
- "address": full address of the property
Return only the fields you can find. Use null for missing values.`;

const bookingPrompt = `Extract ALL available property details from this Booking.com page. Return as JSON with these fields:
- "rating": overall review score (number out of 10, e.g. 9.5)
- "reviews_count": total number of reviews (number)
- "capacity": maximum number of guests (number)
- "bedrooms": number of bedrooms or sleeping areas (number)
- "bathrooms": number of bathrooms (number)  
- "size_sqm": apartment size in square meters (number)
- "amenities_en": array of amenity/facility names in English (e.g. ["Free WiFi", "Air conditioning", "Free parking"])
- "description_en": main property description in English
- "address": full address of the property
- "price_per_night": starting price per night (number, no currency)
Return only the fields you can find. Use null for missing values.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: target specific property
    let targetSlug: string | null = null;
    try {
      const body = await req.json();
      targetSlug = body?.property_slug || null;
    } catch { /* no body */ }

    // Get live data with URLs
    let query = supabase.from('property_live_data').select('property_slug, booking_url, booking_com_url');
    if (targetSlug) query = query.eq('property_slug', targetSlug);
    const { data: liveData, error: liveErr } = await query;
    if (liveErr) throw liveErr;

    // Get current properties
    const { data: properties, error: propErr } = await supabase
      .from('properties')
      .select('id, slug, name, capacity, bedrooms, bathrooms, size, base_price_per_night, weekend_price_per_night, booking_rating, booking_review_count, amenities, amenities_en, description_ro, description_en, check_in_time, check_out_time, location');
    if (propErr) throw propErr;

    const propBySlug: Record<string, any> = {};
    for (const p of properties || []) {
      if (p.slug) propBySlug[p.slug] = p;
    }

    const results: Record<string, any> = {};

    for (const ld of (liveData as LiveData[])) {
      const prop = propBySlug[ld.property_slug];
      if (!prop) {
        results[ld.property_slug] = { error: 'No property found' };
        continue;
      }

      console.log(`\n=== Processing ${ld.property_slug} (${prop.name}) ===`);
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const liveUpdates: Record<string, any> = { updated_at: new Date().toISOString() };

      // 1. Scrape Pynbooking
      if (ld.booking_url && ld.booking_url.includes('pynbooking.direct')) {
        const pynData = await scrapeWithFirecrawl(ld.booking_url, pynbookingPrompt, firecrawlKey);
        if (pynData) {
          // Fill missing weekday price
          if (pynData.price_weekday && Number(pynData.price_weekday) > 0 && Number(pynData.price_weekday) < 500) {
            liveUpdates.price_per_night = Number(pynData.price_weekday);
            liveUpdates.last_price_update = new Date().toISOString();
            if (!prop.base_price_per_night) {
              updates.base_price_per_night = Number(pynData.price_weekday);
            }
          }
          // Fill missing weekend price
          if (pynData.price_weekend && Number(pynData.price_weekend) > 0 && !prop.weekend_price_per_night) {
            updates.weekend_price_per_night = Number(pynData.price_weekend);
          }
          // Fill missing capacity
          if (pynData.capacity && Number(pynData.capacity) > 0 && (!prop.capacity || prop.capacity === 2)) {
            updates.capacity = Number(pynData.capacity);
          }
          // Fill missing bedrooms
          if (pynData.bedrooms && Number(pynData.bedrooms) > 0 && (!prop.bedrooms || prop.bedrooms === 1)) {
            updates.bedrooms = Number(pynData.bedrooms);
          }
          // Fill missing bathrooms
          if (pynData.bathrooms && Number(pynData.bathrooms) > 0 && (!prop.bathrooms || prop.bathrooms === 1)) {
            updates.bathrooms = Number(pynData.bathrooms);
          }
          // Fill missing size
          if (pynData.size_sqm && Number(pynData.size_sqm) > 0 && (!prop.size || prop.size === 40)) {
            updates.size = Number(pynData.size_sqm);
          }
          // Fill missing Romanian amenities
          if (pynData.amenities && Array.isArray(pynData.amenities) && pynData.amenities.length > 0) {
            // Merge with existing, don't overwrite
            const existing = prop.amenities || [];
            const merged = [...new Set([...existing, ...pynData.amenities])];
            if (merged.length > existing.length) {
              updates.amenities = merged;
            }
          }
          // Fill missing Romanian description
          if (pynData.description_ro && (!prop.description_ro || prop.description_ro.length < 50)) {
            updates.description_ro = pynData.description_ro;
          }
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      // 2. Scrape Booking.com
      if (ld.booking_com_url) {
        // Resolve share URLs
        let resolvedUrl = ld.booking_com_url;
        if (resolvedUrl.includes('/Share-')) {
          try {
            const headRes = await fetch(resolvedUrl, { method: 'HEAD', redirect: 'follow' });
            resolvedUrl = headRes.url || resolvedUrl;
          } catch { /* keep original */ }
        }

        const bookingData = await scrapeWithFirecrawl(resolvedUrl, bookingPrompt, firecrawlKey);
        if (bookingData) {
          // Update rating
          if (bookingData.rating && Number(bookingData.rating) > 0 && Number(bookingData.rating) <= 10) {
            updates.booking_rating = Number(bookingData.rating);
            liveUpdates.rating = Number(bookingData.rating);
            liveUpdates.last_rating_update = new Date().toISOString();
          }
          // Update reviews count
          if (bookingData.reviews_count && Number(bookingData.reviews_count) > 0) {
            updates.booking_review_count = Number(bookingData.reviews_count);
            liveUpdates.reviews_count = Number(bookingData.reviews_count);
          }
          // Fill missing English amenities
          if (bookingData.amenities_en && Array.isArray(bookingData.amenities_en) && bookingData.amenities_en.length > 0) {
            const existing = prop.amenities_en || [];
            const merged = [...new Set([...existing, ...bookingData.amenities_en])];
            if (merged.length > existing.length) {
              updates.amenities_en = merged;
            }
          }
          // Fill missing English description  
          if (bookingData.description_en && (!prop.description_en || prop.description_en.length < 50)) {
            updates.description_en = bookingData.description_en;
          }
          // Fill missing capacity from Booking
          if (bookingData.capacity && Number(bookingData.capacity) > 0 && !updates.capacity && (!prop.capacity || prop.capacity === 2)) {
            updates.capacity = Number(bookingData.capacity);
          }
          // Fill missing size from Booking
          if (bookingData.size_sqm && Number(bookingData.size_sqm) > 0 && !updates.size && (!prop.size || prop.size === 40)) {
            updates.size = Number(bookingData.size_sqm);
          }
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      // Apply updates to properties table
      if (Object.keys(updates).length > 1) {
        const { error: updateErr } = await supabase
          .from('properties')
          .update(updates)
          .eq('id', prop.id);
        if (updateErr) console.error(`Error updating property ${ld.property_slug}:`, updateErr);
      }

      // Apply updates to live data table
      if (Object.keys(liveUpdates).length > 1) {
        const { error: liveUpdateErr } = await supabase
          .from('property_live_data')
          .update(liveUpdates)
          .eq('property_slug', ld.property_slug);
        if (liveUpdateErr) console.error(`Error updating live data ${ld.property_slug}:`, liveUpdateErr);
      }

      results[ld.property_slug] = { property_updates: updates, live_updates: liveUpdates };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Detail scrape error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
