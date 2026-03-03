import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapedReview {
  guest_name: string;
  guest_country?: string;
  rating: number;
  title?: string;
  content?: string;
  date?: string;
  host_reply?: string;
}

/**
 * Convert a Booking.com property URL to the dedicated reviews page URL.
 * Example:
 *   https://www.booking.com/hotel/ro/ring-2-rooms-deluxe-spacious-big-terrace-plus-underground-parking.html
 *   → https://www.booking.com/reviews/ro/hotel/ring-2-rooms-deluxe-spacious-big-terrace-plus-underground-parking.html
 */
function toReviewsUrl(propertyUrl: string): string {
  // Pattern: /hotel/<country>/<slug>.html → /reviews/<country>/hotel/<slug>.html
  const match = propertyUrl.match(/booking\.com\/hotel\/([a-z]{2})\/([^?#]+)/);
  if (match) {
    return `https://www.booking.com/reviews/${match[1]}/hotel/${match[2]}`;
  }
  return propertyUrl;
}

/**
 * Resolve Booking.com share URLs (e.g., /Share-XXXX) to actual property URLs.
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
 * Parse reviews from Booking.com reviews page markdown.
 * The reviews page has a structured format we can parse reliably.
 */
function parseReviewsFromMarkdown(markdown: string): ScrapedReview[] {
  const reviews: ScrapedReview[] = [];
  if (!markdown) return reviews;

  // Split by review markers: "- Reviewed: <date>"
  const reviewBlocks = markdown.split(/- Reviewed:\s*/i);

  for (let i = 1; i < reviewBlocks.length; i++) {
    const block = reviewBlocks[i];
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    try {
      // First line should be the date (e.g., "September 10, 2025")
      const dateLine = lines[0];
      const dateMatch = dateLine?.match(/^([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
      let reviewDate: string | undefined;
      if (dateMatch) {
        try {
          const d = new Date(dateMatch[1]);
          if (!isNaN(d.getTime())) {
            reviewDate = d.toISOString().split('T')[0];
          }
        } catch { /* ignore */ }
      }

      // Find guest name - usually appears after the date block
      let guestName = '';
      let guestCountry = '';
      let rating = 0;
      let title = '';
      let positiveContent = '';
      let negativeContent = '';

      // Scan through lines to find structured data
      for (let j = 0; j < lines.length && j < 60; j++) {
        const line = lines[j];

        // Rating: standalone number like "9.0" or "10"
        if (!rating && /^\d{1,2}(\.\d)?$/.test(line)) {
          const r = parseFloat(line);
          if (r >= 1 && r <= 10) rating = r;
        }

        // Guest name: appears right after date section, before review count
        // Usually a single name on a line, followed by country
        if (!guestName && j > 0 && line.length > 1 && line.length < 40 && 
            !line.includes('Reviews') && !line.includes('helpful') &&
            !line.match(/^\d/) && !line.match(/^[•\-]/) &&
            !line.match(/Exceptional|Wonderful|Very Good|Good|Superb|Passable/) &&
            !line.includes('Stayed') && !line.includes('trip') &&
            !line.includes('Apartment') && !line.includes('Submitted') &&
            !line.includes('children') && !line.includes('night') &&
            !line.includes('Read more') && !line.includes('Show translation') &&
            !line.includes('available for this review') &&
            !line.startsWith('![') && !line.startsWith('[')) {
          // Check if next line looks like a country
          const nextLine = lines[j + 1] || '';
          const prevLine = j > 0 ? lines[j - 1] : '';
          if (nextLine.match(/^[A-Z][a-z]/) && nextLine.length < 30 && !nextLine.includes('Reviews')) {
            guestName = line;
            guestCountry = nextLine.replace(/^!\[.*?\]\(.*?\)/, '').trim();
          } else if (prevLine.match(/^!\[/) || prevLine === '' || j <= 3) {
            // Name might be standalone
            guestName = line;
          }
        }

        // Country detection after name
        if (guestName && !guestCountry && j > 0) {
          const countryMatch = line.match(/^!\[[^\]]*\]\([^)]*flags[^)]*\)(.+)/);
          if (countryMatch) {
            guestCountry = countryMatch[1].trim();
          } else if (lines[j - 1] === guestName && line.length < 30 && 
                     line.match(/^[A-Z]/) && !line.includes('Review')) {
            guestCountry = line;
          }
        }

        // Title in quotes
        if (line.startsWith('"') && line.endsWith('"') && line.length > 3) {
          title = line.slice(1, -1);
        }

        // Stayed month marker - content appears before this
        if (line.startsWith('Stayed in ')) break;
      }

      // Extract content: everything between the metadata and "Stayed in"
      const blockText = block.substring(0, block.indexOf('Stayed in') > -1 ? block.indexOf('Stayed in') : block.length);
      
      // Find content paragraphs (longer lines that aren't metadata)
      const contentLines = blockText.split('\n').filter(l => {
        const t = l.trim();
        return t.length > 30 && 
               !t.startsWith('![') && !t.startsWith('[') &&
               !t.startsWith('- •') && !t.startsWith('"') &&
               !t.includes('Reviews') && !t.includes('helpful vote') &&
               !t.match(/^\d{1,2}(\.\d)?$/) &&
               !t.includes('_There are no comments');
      });

      const content = contentLines.map(l => l.trim()).join('\n\n').trim();

      if (!guestName || !rating) continue;

      reviews.push({
        guest_name: guestName,
        guest_country: guestCountry || undefined,
        rating,
        title: title || undefined,
        content: content || undefined,
        date: reviewDate,
        host_reply: undefined, // Host replies are JS-rendered, not in static HTML
      });
    } catch (err) {
      console.error('Error parsing review block:', err);
    }
  }

  return reviews;
}

/**
 * Scrape reviews using Firecrawl with both JSON (for structured data) and
 * Markdown (for fallback parsing). Uses the dedicated reviews URL.
 */
async function scrapeReviews(bookingUrl: string, firecrawlKey: string): Promise<ScrapedReview[]> {
  try {
    const resolvedUrl = await resolveShareUrl(bookingUrl);
    const reviewsUrl = toReviewsUrl(resolvedUrl);
    console.log(`Scraping reviews from: ${reviewsUrl}`);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: reviewsUrl,
        formats: ['markdown', 'json'],
        jsonOptions: {
          prompt: `Extract ALL guest reviews visible on this page. For each review extract:
- "guest_name": reviewer's name EXACTLY
- "guest_country": country EXACTLY  
- "rating": numeric score out of 10
- "title": review title in quotes if any, VERBATIM
- "positive": liked/positive text VERBATIM
- "negative": disliked/negative text VERBATIM
- "date": review date as YYYY-MM-DD
- "host_reply": if there is a "Response from the property" text, copy it VERBATIM. If none visible, set null.
Return as {"reviews": [...]}`
        },
        waitFor: 5000,
      }),
    });

    const data = await response.json();
    const jsonData = data?.data?.json || data?.json;
    const markdown = data?.data?.markdown || data?.markdown || '';

    console.log(`Markdown length: ${markdown.length}`);

    // Strategy 1: Parse from markdown (most reliable for dates and structure)
    const mdReviews = parseReviewsFromMarkdown(markdown);
    console.log(`Parsed ${mdReviews.length} reviews from markdown`);

    // Strategy 2: JSON extraction (may have better host reply capture)
    const jsonReviews: ScrapedReview[] = [];
    if (jsonData?.reviews && Array.isArray(jsonData.reviews)) {
      for (const r of jsonData.reviews) {
        const content = [r.positive, r.negative]
          .filter(Boolean)
          .map((s: string) => String(s).replace(/\bNone\.?\b/gi, '').trim())
          .filter((s: string) => s.length > 0)
          .join('\n\n')
          .trim();

        const rt = Number(r.rating);
        if (!r.guest_name || isNaN(rt)) continue;

        let hostReply = r.host_reply || null;
        if (hostReply) {
          hostReply = String(hostReply).replace(/^(Response from the property|Răspunsul proprietății)\s*:\s*/i, '').trim();
          if (!hostReply || hostReply.toLowerCase() === 'none') hostReply = null;
        }

        jsonReviews.push({
          guest_name: r.guest_name,
          guest_country: r.guest_country || undefined,
          rating: rt,
          title: r.title || undefined,
          content: content || undefined,
          date: r.date || undefined,
          host_reply: hostReply || undefined,
        });
      }
    }
    console.log(`Parsed ${jsonReviews.length} reviews from JSON`);

    // Merge: prefer markdown for dates (more accurate), JSON for host replies
    const mergedReviews: ScrapedReview[] = [];
    const usedJsonNames = new Set<string>();

    for (const mdReview of mdReviews) {
      // Find matching JSON review by name
      const jsonMatch = jsonReviews.find(
        j => j.guest_name.toLowerCase() === mdReview.guest_name.toLowerCase() && !usedJsonNames.has(j.guest_name)
      );
      if (jsonMatch) usedJsonNames.add(jsonMatch.guest_name);

      mergedReviews.push({
        ...mdReview,
        // Use JSON host_reply if markdown doesn't have one
        host_reply: mdReview.host_reply || jsonMatch?.host_reply || undefined,
        // Use JSON content if markdown content is empty
        content: mdReview.content || jsonMatch?.content || undefined,
        title: mdReview.title || jsonMatch?.title || undefined,
      });
    }

    // Add any JSON-only reviews not found in markdown
    for (const jr of jsonReviews) {
      if (!usedJsonNames.has(jr.guest_name)) {
        mergedReviews.push(jr);
      }
    }

    console.log(`Final merged: ${mergedReviews.length} reviews`);
    return mergedReviews;
  } catch (error) {
    console.error(`Error scraping reviews:`, error);
    return [];
  }
}

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

    if (targetSlug) query = query.eq('property_slug', targetSlug);

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

    for (const prop of (properties || [])) {
      const propertyId = slugToId[prop.property_slug];
      if (!propertyId) {
        results[prop.property_slug] = { error: 'No property ID mapping' };
        continue;
      }

      console.log(`\n--- Scraping reviews for ${prop.property_slug} ---`);
      const reviews = await scrapeReviews(prop.booking_com_url, firecrawlKey);

      let inserted = 0;
      let skipped = 0;

      for (const review of reviews) {
        const contentSnippet = (review.content || review.title || '').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '');
        const country = (review.guest_country || 'unknown').replace(/[^a-zA-Z]/g, '').substring(0, 10);
        const reviewId = `${review.guest_name}-${country}-${review.date || 'nodate'}-${review.rating}-${contentSnippet}`;

        // Safe date handling
        let createdAt = new Date().toISOString();
        if (review.date) {
          try {
            const d = new Date(review.date);
            if (!isNaN(d.getTime())) createdAt = d.toISOString();
          } catch { /* use current date */ }
        }

        const { error: upsertError } = await supabase
          .from('property_reviews')
          .upsert({
            property_id: propertyId,
            guest_name: review.guest_name,
            guest_country: review.guest_country || null,
            rating: review.rating,
            title: review.title || null,
            content: review.content || null,
            admin_reply: review.host_reply || null,
            admin_reply_at: review.host_reply ? new Date().toISOString() : null,
            is_published: true,
            source: 'booking.com',
            booking_review_id: reviewId,
            review_date: review.date || null,
            created_at: createdAt,
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

      // Delay between properties
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
