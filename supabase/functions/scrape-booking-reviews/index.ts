import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  property_slug: string;
  booking_com_url: string;
}

interface ScrapedReview {
  guest_name: string;
  guest_country?: string;
  rating: number;
  title?: string;
  content?: string;
  date?: string;
  host_reply?: string;
}

async function scrapeReviews(url: string, firecrawlKey: string): Promise<ScrapedReview[]> {
  try {
    // Resolve share URLs to actual booking.com URLs first
    let resolvedUrl = url;
    if (url.includes('/Share-')) {
      try {
        const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        resolvedUrl = headRes.url || url;
      } catch {
        resolvedUrl = url;
      }
    }

    // Navigate to reviews tab
    const reviewsUrl = resolvedUrl.includes('#tab-reviews')
      ? resolvedUrl
      : resolvedUrl.split('#')[0] + '#tab-reviews';

    console.log(`Scraping reviews from: ${reviewsUrl}`);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: reviewsUrl,
        formats: ['json'],
        jsonOptions: {
        prompt: `Extract ALL guest reviews from this Booking.com property page EXACTLY as they appear — do NOT rephrase, summarize, or translate any text. For each review, extract:
- "guest_name": the reviewer's name exactly as displayed
- "guest_country": the reviewer's country/nationality exactly as shown
- "rating": numeric score (out of 10) — keep original scale, do NOT convert
- "title": review title/headline if any, VERBATIM
- "positive": the positive/liked comment text VERBATIM (often after a "+" or "Liked" label)
- "negative": the negative/disliked comment text VERBATIM (often after a "-" or "Disliked" label)
- "date": review date in YYYY-MM-DD format
- "host_reply": the property owner/host/manager response text VERBATIM — copy it character by character. Look for text labeled "Response from the property", "Răspunsul proprietății", "Host reply", or similar. It usually appears below each review. Extract the COMPLETE original reply text without any modification. If there is no reply, set to null.

CRITICAL: All text fields must be copied EXACTLY as they appear on the page. Do NOT paraphrase, translate, or summarize. Return as JSON array under key "reviews". Include ALL visible reviews, up to 25.`
        },
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    console.log(`Scrape raw response:`, JSON.stringify(data).substring(0, 600));
    console.log(`Response keys:`, Object.keys(data || {}));
    console.log(`Data keys:`, Object.keys(data?.data || {}));

    const jsonData = data?.data?.json || data?.json;
    console.log(`JSON data preview:`, JSON.stringify(jsonData || null).substring(0, 500));
    const reviews: ScrapedReview[] = [];

    if (jsonData?.reviews && Array.isArray(jsonData.reviews)) {
      for (const r of jsonData.reviews) {
        const content = [r.positive, r.negative]
          .filter(Boolean)
          .join('\n\n')
          .trim();

        const rating = Number(r.rating);
        if (!r.guest_name || isNaN(rating)) continue;

        reviews.push({
          guest_name: r.guest_name,
          guest_country: r.guest_country || null,
          rating: rating, // Keep original 10-scale from Booking.com
          title: r.title || null,
          content: content || null,
          date: r.date || null,
          host_reply: r.host_reply || null,
        });
      }
    }

    console.log(`Extracted ${reviews.length} reviews`);
    return reviews;
  } catch (error) {
    console.error(`Error scraping reviews from ${url}:`, error);
    return [];
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

    // Get properties with booking.com URLs
    let query = supabase
      .from('property_live_data')
      .select('property_slug, booking_com_url')
      .not('booking_com_url', 'is', null);

    if (targetSlug) {
      query = query.eq('property_slug', targetSlug);
    }

    const { data: properties, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Get slug -> property id mapping
    const { data: propMap, error: propError } = await supabase
      .from('properties')
      .select('id, slug')
      .not('slug', 'is', null);

    if (propError) throw propError;

    const slugToId: Record<string, string> = {};
    for (const p of propMap || []) {
      if (p.slug) slugToId[p.slug] = p.id;
    }

    const results: Record<string, any> = {};

    for (const prop of (properties as PropertyData[])) {
      const propertyId = slugToId[prop.property_slug];
      if (!propertyId) {
        console.log(`No property ID found for slug: ${prop.property_slug}`);
        results[prop.property_slug] = { error: 'No property ID mapping' };
        continue;
      }

      console.log(`\n--- Scraping reviews for ${prop.property_slug} ---`);
      const reviews = await scrapeReviews(prop.booking_com_url, firecrawlKey);

      let inserted = 0;
      let skipped = 0;

      for (const review of reviews) {
        // Create a deterministic booking_review_id from guest + country + date + rating + content snippet
        const contentSnippet = (review.content || review.title || '').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '');
        const country = (review.guest_country || 'unknown').replace(/[^a-zA-Z]/g, '').substring(0, 10);
        const reviewId = `${review.guest_name}-${country}-${review.date || 'nodate'}-${review.rating}-${contentSnippet}`;

        const { error: upsertError } = await supabase
          .from('property_reviews')
          .upsert({
            property_id: propertyId,
            guest_name: review.guest_name,
            guest_country: review.guest_country,
            rating: review.rating,
            title: review.title,
            content: review.content,
            admin_reply: review.host_reply,
            admin_reply_at: review.host_reply ? new Date().toISOString() : null,
            is_published: true,
            source: 'booking.com',
            booking_review_id: reviewId,
            review_date: review.date,
            created_at: review.date ? new Date(review.date).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'property_id,booking_review_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Error upserting review:`, upsertError);
          skipped++;
        } else {
          inserted++;
        }
      }

      results[prop.property_slug] = { scraped: reviews.length, inserted, skipped };

      // Delay between properties to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Review scrape error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
