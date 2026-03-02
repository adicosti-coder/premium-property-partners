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

/**
 * Resolve Booking.com /Share- short-links to their final URL.
 */
async function resolveShareUrl(url: string): Promise<string> {
  if (!url.includes('/Share-')) return url;
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.url || url;
  } catch {
    return url;
  }
}

/**
 * Parse rating (X.Y / 10) and review count from Booking.com markdown.
 */
function parseRatingFromMarkdown(md: string): { rating: number | null; reviews: number | null } {
  let rating: number | null = null;
  let reviews: number | null = null;

  const ratingPatterns = [
    /(?:Scored|Rating|Score|Nota|Punctaj)[:\s]*(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/\s*10|out of 10)?/i,
    /(\d{1,2}\.\d{1,2})\s*(?:\/\s*10|out of 10)/i,
    /(?:review score|guest review)[^\d]*(\d{1,2}\.\d{1,2})/i,
    /(?:reviews?|evaluări|recenzii)[^\d]{0,30}(\d\.\d)/i,
    /(\d\.\d)[^\d]{0,30}(?:reviews?|evaluări|recenzii)/i,
  ];

  for (const pat of ratingPatterns) {
    const m = md.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0 && val <= 10) {
        rating = Math.round(val * 10) / 10;
        break;
      }
    }
  }

  const reviewPatterns = [
    /(\d[\d,.']*)\s*(?:reviews?|recenzii|evaluări|guest reviews)/i,
    /(?:reviews?|recenzii|evaluări|See|Vezi)\s*[:\-–]?\s*(\d[\d,.']*)/i,
    /(?:Pe baza a|Based on)\s*(\d[\d,.']*)/i,
  ];

  for (const pat of reviewPatterns) {
    const m = md.match(pat);
    if (m) {
      const cleaned = m[1].replace(/[,.']/g, '');
      const val = parseInt(cleaned, 10);
      if (val > 0 && val < 100000) {
        reviews = val;
        break;
      }
    }
  }

  return { rating, reviews };
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
        formats: ['json'],
        jsonOptions: { prompt },
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    const jsonData = data?.data?.json || data?.json;
    console.log(`Extracted JSON for ${url}:`, JSON.stringify(jsonData || null).substring(0, 800));
    return jsonData || null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Scrape Booking.com with markdown first (reliable for rating/reviews),
 * then JSON for detailed metadata.
 */
async function scrapeBookingFull(url: string, firecrawlKey: string) {
  const resolvedUrl = await resolveShareUrl(url);
  console.log(`Full scrape Booking.com: ${resolvedUrl}`);

  // Step 1: Markdown scrape for reliable rating/reviews
  let rating: number | null = null;
  let reviewsCount: number | null = null;

  try {
    const mdResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: resolvedUrl,
        formats: ['markdown'],
        waitFor: 5000,
      }),
    });

    const mdData = await mdResponse.json();
    const markdown = mdData?.data?.markdown || mdData?.markdown || '';
    console.log(`Booking markdown length: ${markdown.length}`);

    const parsed = parseRatingFromMarkdown(markdown);
    rating = parsed.rating;
    reviewsCount = parsed.reviews;
    console.log(`Markdown parsed — rating: ${rating}, reviews: ${reviewsCount}`);
  } catch (err) {
    console.error('Markdown scrape failed:', err);
  }

  await new Promise(r => setTimeout(r, 1000));

  // Step 2: JSON scrape for detailed metadata
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

  const jsonData = await scrapeWithFirecrawl(resolvedUrl, bookingPrompt, firecrawlKey);

  // Use markdown-parsed values as primary (more reliable), JSON as fallback
  if (!rating && jsonData?.rating) {
    const r = Number(jsonData.rating);
    if (r > 0 && r <= 10) rating = Math.round(r * 10) / 10;
  }
  if (!reviewsCount && jsonData?.reviews_count) {
    const rc = Number(jsonData.reviews_count);
    if (rc > 0) reviewsCount = rc;
  }

  return {
    rating,
    reviews_count: reviewsCount,
    capacity: jsonData?.capacity ? Number(jsonData.capacity) : null,
    bedrooms: jsonData?.bedrooms ? Number(jsonData.bedrooms) : null,
    bathrooms: jsonData?.bathrooms ? Number(jsonData.bathrooms) : null,
    size_sqm: jsonData?.size_sqm ? Number(jsonData.size_sqm) : null,
    amenities_en: jsonData?.amenities_en || null,
    description_en: jsonData?.description_en || null,
  };
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

    // Optional: target specific property and source
    let targetSlug: string | null = null;
    let sourceOnly: string | null = null;
    try {
      const body = await req.json();
      targetSlug = body?.property_slug || null;
      sourceOnly = body?.source || null;
    } catch { /* no body */ }

    let query = supabase.from('property_live_data').select('property_slug, booking_url, booking_com_url');
    if (targetSlug) query = query.eq('property_slug', targetSlug);
    const { data: liveData, error: liveErr } = await query;
    if (liveErr) throw liveErr;

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
      if ((!sourceOnly || sourceOnly === 'pynbooking') && ld.booking_url && ld.booking_url.includes('pynbooking.direct')) {
        const pynData = await scrapeWithFirecrawl(ld.booking_url, pynbookingPrompt, firecrawlKey);
        if (pynData) {
          const ronToEur = (ron: number) => Math.round(ron / 5);
          
          if (pynData.price_weekday && Number(pynData.price_weekday) > 0) {
            const priceEur = ronToEur(Number(pynData.price_weekday));
            if (priceEur > 0 && priceEur < 500) {
              liveUpdates.price_per_night = priceEur;
              liveUpdates.last_price_update = new Date().toISOString();
            }
          }
          if (pynData.price_weekend && Number(pynData.price_weekend) > 0 && !prop.weekend_price_per_night) {
            const weekendEur = ronToEur(Number(pynData.price_weekend));
            if (weekendEur > 0) updates.weekend_price_per_night = weekendEur;
          }
          if (pynData.capacity && Number(pynData.capacity) > 0 && (!prop.capacity || prop.capacity === 2)) {
            updates.capacity = Number(pynData.capacity);
          }
          if (pynData.bedrooms && Number(pynData.bedrooms) > 0 && (!prop.bedrooms || prop.bedrooms === 1)) {
            updates.bedrooms = Number(pynData.bedrooms);
          }
          if (pynData.bathrooms && Number(pynData.bathrooms) > 0 && (!prop.bathrooms || prop.bathrooms === 1)) {
            updates.bathrooms = Number(pynData.bathrooms);
          }
          if (pynData.size_sqm && Number(pynData.size_sqm) > 0 && (!prop.size || prop.size === 40)) {
            updates.size = Number(pynData.size_sqm);
          }
          if (pynData.amenities && Array.isArray(pynData.amenities) && pynData.amenities.length > 0) {
            const existing = prop.amenities || [];
            const merged = [...new Set([...existing, ...pynData.amenities])];
            if (merged.length > existing.length) updates.amenities = merged;
          }
          if (pynData.description_ro && (!prop.description_ro || prop.description_ro.length < 50)) {
            updates.description_ro = pynData.description_ro;
          }
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      // 2. Scrape Booking.com with improved method (markdown+regex first, JSON fallback)
      if ((!sourceOnly || sourceOnly === 'booking') && ld.booking_com_url) {
        const bookingResult = await scrapeBookingFull(ld.booking_com_url, firecrawlKey);
        
        if (bookingResult.rating && bookingResult.rating > 0 && bookingResult.rating <= 10) {
          updates.booking_rating = bookingResult.rating;
          liveUpdates.rating = bookingResult.rating;
          liveUpdates.last_rating_update = new Date().toISOString();
        }
        if (bookingResult.reviews_count && bookingResult.reviews_count > 0) {
          updates.booking_review_count = bookingResult.reviews_count;
          liveUpdates.reviews_count = bookingResult.reviews_count;
        }
        if (bookingResult.amenities_en && Array.isArray(bookingResult.amenities_en) && bookingResult.amenities_en.length > 0) {
          const existing = prop.amenities_en || [];
          const merged = [...new Set([...existing, ...bookingResult.amenities_en])];
          if (merged.length > existing.length) updates.amenities_en = merged;
        }
        if (bookingResult.description_en && (!prop.description_en || prop.description_en.length < 50)) {
          updates.description_en = bookingResult.description_en;
        }
        if (bookingResult.capacity && bookingResult.capacity > 0 && !updates.capacity && (!prop.capacity || prop.capacity === 2)) {
          updates.capacity = bookingResult.capacity;
        }
        if (bookingResult.size_sqm && bookingResult.size_sqm > 0 && !updates.size && (!prop.size || prop.size === 40)) {
          updates.size = bookingResult.size_sqm;
        }

        await new Promise(r => setTimeout(r, 1500));
      }

      // Apply updates
      if (Object.keys(updates).length > 1) {
        const { error: updateErr } = await supabase.from('properties').update(updates).eq('id', prop.id);
        if (updateErr) console.error(`Error updating property ${ld.property_slug}:`, updateErr);
      }
      if (Object.keys(liveUpdates).length > 1) {
        const { error: liveUpdateErr } = await supabase.from('property_live_data').update(liveUpdates).eq('property_slug', ld.property_slug);
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
