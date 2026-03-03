import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyLiveData {
  property_slug: string;
  booking_url: string;
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
 * Extract rating (X.Y / 10) and review count from Booking.com markdown.
 * Booking.com pages consistently render patterns like:
 *   "Scored 9.7"  /  "9.7 out of 10"  /  "Rating: 9.7"
 *   "28 reviews"  /  "See 28 guest reviews"  /  "· 28 reviews"
 */
function parseRatingFromMarkdown(md: string): { rating: number | null; reviews: number | null } {
  let rating: number | null = null;
  let reviews: number | null = null;

  // --- RATING ---
  // Pattern priority: more specific first
  const ratingPatterns = [
    /(?:Scored|Rating|Score|Nota|Punctaj)[:\s]*(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/\s*10|out of 10)?/i,
    /(\d{1,2}\.\d{1,2})\s*(?:\/\s*10|out of 10)/i,
    /(?:review score|guest review)[^\d]*(\d{1,2}\.\d{1,2})/i,
    // Booking.com badge format: a standalone decimal like "9.7" near review keywords
    /(?:reviews?|evaluări|recenzii)[^\d]{0,30}(\d\.\d)/i,
    /(\d\.\d)[^\d]{0,30}(?:reviews?|evaluări|recenzii)/i,
  ];

  for (const pat of ratingPatterns) {
    const m = md.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0 && val <= 10) {
        rating = Math.round(val * 10) / 10; // keep 1 decimal
        break;
      }
    }
  }

  // --- REVIEWS COUNT ---
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

/** RON to EUR conversion rate */
const RON_TO_EUR = 0.2; // ~5 RON = 1 EUR

/**
 * Scrape price from Pynbooking page using markdown + regex.
 * Detects currency (RON/lei vs EUR) and converts to EUR if needed.
 */
async function scrapePrice(url: string, firecrawlKey: string): Promise<number | null> {
  try {
    console.log(`Scraping price from: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || '';

    // Try to match price WITH currency indicator
    // Pattern 1: number followed by currency symbol/name
    const ronMatch = markdown.match(/(\d{2,5})\s*(?:lei|RON|ron)/i);
    const eurMatch = markdown.match(/(\d{2,4})\s*(?:€|EUR|eur)/i)
                  || markdown.match(/(?:€|EUR)\s*(\d{2,4})/i);

    if (eurMatch) {
      const price = Number(eurMatch[1]);
      console.log(`Found EUR price: ${price}`);
      return price > 0 && price < 1000 ? price : null;
    }

    if (ronMatch) {
      const ronPrice = Number(ronMatch[1]);
      const eurPrice = Math.round(ronPrice * RON_TO_EUR);
      console.log(`Found RON price: ${ronPrice}, converted to EUR: ${eurPrice}`);
      return eurPrice > 0 && eurPrice < 1000 ? eurPrice : null;
    }

    // Fallback: generic price pattern — assume RON if value > 100 (likely RON), EUR if <= 100
    const genericMatch = markdown.match(/(?:price|preț|tarif|pret)[^\d]*(\d{2,5})/i);
    if (genericMatch) {
      const val = Number(genericMatch[1]);
      if (val > 100) {
        // Likely RON
        const eurPrice = Math.round(val * RON_TO_EUR);
        console.log(`Generic price ${val} assumed RON, converted to EUR: ${eurPrice}`);
        return eurPrice > 0 && eurPrice < 1000 ? eurPrice : null;
      } else {
        console.log(`Generic price ${val} assumed EUR`);
        return val > 0 ? val : null;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error scraping price from ${url}:`, error);
    return null;
  }
}

/**
 * Scrape rating & review count from a Booking.com URL using markdown + regex.
 * Much more reliable than LLM JSON extraction for simple numeric values.
 */
async function scrapeBookingRating(url: string, firecrawlKey: string): Promise<{ rating: number | null; reviews: number | null }> {
  try {
    if (!url) return { rating: null, reviews: null };

    const resolvedUrl = await resolveShareUrl(url);
    console.log(`Scraping rating from: ${resolvedUrl}`);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
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

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || '';
    console.log(`Markdown length: ${markdown.length}, first 800 chars:`, markdown.substring(0, 800));

    const result = parseRatingFromMarkdown(markdown);
    console.log(`Parsed rating: ${result.rating}, reviews: ${result.reviews}`);

    // Fallback: also try JSON extraction if markdown parsing failed
    if (!result.rating || !result.reviews) {
      console.log('Markdown parsing incomplete, trying JSON fallback...');
      const jsonResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: resolvedUrl,
          formats: ['json'],
          jsonOptions: {
            prompt: 'Extract ONLY these two values from this Booking.com page: 1) The overall guest review score (a number like 9.7 out of 10) 2) The total number of guest reviews. Return as JSON: {"rating": <number>, "reviews_count": <number>}. Be precise and extract the EXACT numbers shown on the page.'
          },
          waitFor: 5000,
        }),
      });

      const jsonData = await jsonResponse.json();
      const extracted = jsonData?.data?.json || jsonData?.json;
      console.log('JSON fallback result:', JSON.stringify(extracted));

      if (!result.rating && extracted?.rating) {
        const r = Number(extracted.rating);
        if (r > 0 && r <= 10) result.rating = Math.round(r * 10) / 10;
      }
      if (!result.reviews && extracted?.reviews_count) {
        const rc = Number(extracted.reviews_count);
        if (rc > 0) result.reviews = rc;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error scraping rating from ${url}:`, error);
    return { rating: null, reviews: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: scrape only specific property
    let targetSlug: string | null = null;
    try {
      const body = await req.json();
      targetSlug = body?.property_slug || null;
    } catch { /* no body */ }

    // Fetch all properties to scrape
    let query = supabase
      .from('property_live_data')
      .select('property_slug, booking_url, booking_com_url');
    if (targetSlug) query = query.eq('property_slug', targetSlug);

    const { data: properties, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const results: Record<string, any> = {};

    for (const prop of (properties as PropertyLiveData[])) {
      console.log(`\n--- Processing ${prop.property_slug} ---`);
      
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      // Scrape price from Pynbooking
      if (prop.booking_url && prop.booking_url.includes('pynbooking.direct')) {
        const price = await scrapePrice(prop.booking_url, firecrawlKey);
        if (price && price > 0 && price < 1000) {
          updates.price_per_night = price;
          updates.last_price_update = new Date().toISOString();
          updates.scrape_error = null;
        }
      }

      // Scrape rating from Booking.com (if URL exists)
      if (prop.booking_com_url) {
        const { rating, reviews } = await scrapeBookingRating(prop.booking_com_url, firecrawlKey);
        if (rating && rating > 0 && rating <= 10) {
          updates.rating = rating;
          updates.last_rating_update = new Date().toISOString();
        }
        if (reviews && reviews > 0) {
          updates.reviews_count = reviews;
        }
      }

      // Fallback: try to get rating from Pynbooking page if no Booking.com URL
      if (!prop.booking_com_url && prop.booking_url) {
        const { rating, reviews } = await scrapeBookingRating(prop.booking_url, firecrawlKey);
        if (rating && rating > 0 && rating <= 10) {
          updates.rating = rating;
          updates.reviews_count = reviews;
          updates.last_rating_update = new Date().toISOString();
        }
      }

      const { error: updateError } = await supabase
        .from('property_live_data')
        .update(updates)
        .eq('property_slug', prop.property_slug);

      if (updateError) {
        console.error(`Error updating ${prop.property_slug}:`, updateError);
        results[prop.property_slug] = { error: updateError.message };
      } else {
        results[prop.property_slug] = updates;
      }

      // Also sync to properties table
      if (updates.rating || updates.reviews_count) {
        const propUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (updates.rating) propUpdates.booking_rating = updates.rating;
        if (updates.reviews_count) propUpdates.booking_review_count = updates.reviews_count;
        
        await supabase
          .from('properties')
          .update(propUpdates)
          .eq('slug', prop.property_slug);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
