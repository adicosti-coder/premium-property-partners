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
        formats: [{ type: 'json', prompt: 'Extract the nightly price or starting price for accommodation. Return as a JSON object with field "price" as a number (just the numeric value, no currency symbol). If multiple prices, return the lowest one.' }],
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    console.log(`Scrape response for ${url}:`, JSON.stringify(data).substring(0, 500));

    const jsonData = data?.data?.json || data?.json;
    if (jsonData?.price) {
      return Number(jsonData.price);
    }

    // Fallback: try to find price in markdown
    const markdown = data?.data?.markdown || data?.markdown || '';
    const priceMatch = markdown.match(/(\d{2,4})\s*(?:€|EUR|lei|RON)/i) 
                    || markdown.match(/(?:€|EUR)\s*(\d{2,4})/i)
                    || markdown.match(/(?:price|preț|tarif)[^\d]*(\d{2,4})/i);
    if (priceMatch) {
      return Number(priceMatch[1]);
    }

    return null;
  } catch (error) {
    console.error(`Error scraping price from ${url}:`, error);
    return null;
  }
}

async function scrapeBookingRating(url: string, firecrawlKey: string): Promise<{ rating: number | null; reviews: number | null }> {
  try {
    if (!url) return { rating: null, reviews: null };
    
    console.log(`Scraping rating from: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', prompt: 'Extract the review score/rating (a number like 9.5 out of 10) and total number of reviews. Return as JSON with fields "rating" (number) and "reviews_count" (number).' }],
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    console.log(`Rating scrape response:`, JSON.stringify(data).substring(0, 500));

    const jsonData = data?.data?.json || data?.json;
    return {
      rating: jsonData?.rating ? Number(jsonData.rating) : null,
      reviews: jsonData?.reviews_count ? Number(jsonData.reviews_count) : null,
    };
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

    // Fetch all properties to scrape
    const { data: properties, error: fetchError } = await supabase
      .from('property_live_data')
      .select('property_slug, booking_url, booking_com_url');

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
          updates.reviews_count = reviews;
          updates.last_rating_update = new Date().toISOString();
        }
      }

      // Also try to get rating from Pynbooking page
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

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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
