import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Timișoara zones with scoring weights
const PREMIUM_ZONES = ['Centru', 'Iosefin', 'Fabric', 'Elisabetin', 'Circumvalațiunii'];
const GOOD_ZONES = ['Iulius Town', 'Complex Studențesc', 'Dâmbovița', 'Lipovei', 'Soarelui', 'Torontalului'];
const ZONE_KEYWORDS: Record<string, string[]> = {
  'Centru': ['centru', 'piata victoriei', 'piata unirii', 'opera', 'lloyd'],
  'Iosefin': ['iosefin', 'josefin'],
  'Fabric': ['fabric'],
  'Elisabetin': ['elisabetin'],
  'Circumvalațiunii': ['circumvalatiunii', 'circumvalațiunii', 'take ionescu'],
  'Iulius Town': ['iulius', 'openville'],
  'Complex Studențesc': ['complex studentesc', 'studențesc', 'studenti'],
  'Dâmbovița': ['dambovita', 'dâmbovița'],
  'Lipovei': ['lipovei'],
  'Soarelui': ['soarelui'],
  'Torontalului': ['torontalului'],
  'Giroc': ['giroc'],
  'Dumbrăvița': ['dumbravita', 'dumbrăvița'],
  'Ghiroda': ['ghiroda'],
  'Moșnița': ['mosnita', 'moșnița'],
};

function detectZone(text: string): string | null {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [zone, keywords] of Object.entries(ZONE_KEYWORDS)) {
    for (const kw of keywords) {
      const normalKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(normalKw)) return zone;
    }
  }
  return null;
}

/** Score a listing 0-100 based on potential for short-term rental */
function scoreListing(data: {
  zone: string | null;
  size: number | null;
  rooms: number | null;
  price: number | null;
  pricePerSqm: number | null;
  floor: string | null;
  yearBuilt: number | null;
  features: string[];
}): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;

  // Zone score (0-30)
  if (data.zone) {
    if (PREMIUM_ZONES.includes(data.zone)) {
      breakdown.zone = 30;
    } else if (GOOD_ZONES.includes(data.zone)) {
      breakdown.zone = 20;
    } else {
      breakdown.zone = 10;
    }
  } else {
    breakdown.zone = 5;
  }
  score += breakdown.zone;

  // Price/sqm score (0-25) — lower is better for investment
  if (data.pricePerSqm) {
    if (data.pricePerSqm < 1200) breakdown.price = 25;
    else if (data.pricePerSqm < 1500) breakdown.price = 20;
    else if (data.pricePerSqm < 1800) breakdown.price = 15;
    else if (data.pricePerSqm < 2200) breakdown.price = 10;
    else breakdown.price = 5;
  } else {
    breakdown.price = 0;
  }
  score += breakdown.price;

  // Size score (0-15) — studios and 2-room are best for STR
  if (data.rooms) {
    if (data.rooms === 1 || data.rooms === 2) breakdown.rooms = 15;
    else if (data.rooms === 3) breakdown.rooms = 10;
    else breakdown.rooms = 5;
  } else {
    breakdown.rooms = 5;
  }
  score += breakdown.rooms;

  // Year built score (0-15) — newer is better
  if (data.yearBuilt) {
    if (data.yearBuilt >= 2018) breakdown.year = 15;
    else if (data.yearBuilt >= 2010) breakdown.year = 12;
    else if (data.yearBuilt >= 2000) breakdown.year = 8;
    else breakdown.year = 4;
  } else {
    breakdown.year = 5;
  }
  score += breakdown.year;

  // Features bonus (0-15)
  const desirableFeatures = ['centrala', 'aer conditionat', 'parcare', 'balcon', 'lift', 'mobilat', 'utilat'];
  const featureLower = data.features.map(f => f.toLowerCase());
  let featureScore = 0;
  for (const df of desirableFeatures) {
    if (featureLower.some(f => f.includes(df))) featureScore += 2;
  }
  breakdown.features = Math.min(featureScore, 15);
  score += breakdown.features;

  return { score: Math.min(score, 100), breakdown };
}

const DEFAULT_SEARCH_QUERIES = [
  { platform: 'imobiliare.ro', query: 'apartament vanzare timisoara site:imobiliare.ro' },
  { platform: 'OLX', query: 'apartament vanzare timisoara site:olx.ro' },
  { platform: 'Storia.ro', query: 'apartament vanzare timisoara site:storia.ro' },
  { platform: 'Publi24', query: 'apartament vanzare timisoara site:publi24.ro' },
  { platform: 'Facebook Marketplace', query: 'apartament vanzare timisoara site:facebook.com/marketplace' },
  { platform: 'Grupuri Facebook', query: 'apartament vanzare timisoara "facebook.com/groups"' },
  { platform: 'BursaImobiliara.ro', query: 'apartament vanzare timisoara site:bursaimobiliara.ro' },
];

/**
 * Remove diacritics from a string (ă→a, ș→s, ț→t, î→i, â→a).
 */
function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Expand keyword list with diacritics-free variants for fuzzy matching.
 * Deduplicates by normalized form to avoid double-searching.
 */
function expandKeywordsWithoutDiacritics(
  queries: { platform: string; query: string }[]
): { platform: string; query: string }[] {
  const seen = new Set<string>();
  const expanded: { platform: string; query: string }[] = [];

  for (const q of queries) {
    const key = removeDiacritics(q.query).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const clean = removeDiacritics(q.query);
      // Always push diacritics-free version first (broadest match)
      expanded.push({ platform: q.platform, query: clean });
      // If original had diacritics, also keep it for exact-match ranking
      if (clean !== q.query) {
        expanded.push({ platform: q.platform, query: q.query });
      }
    }
  }
  return expanded;
}

const EXTRACTION_PROMPT = `Extract property listing details from this real estate page. Return JSON:
- title: listing title (string)
- price: numeric price, no currency (number or null)
- currency: "EUR" or "RON" (string)
- location: address or neighborhood (string or null)  
- size: sqm number only (number or null)
- rooms: number of rooms (number or null)
- floor: floor text (string or null)
- year_built: construction year (number or null)
- features: array of amenities (string[])
- contact_phone: phone number if visible (string or null)
- contact_name: contact name if visible (string or null)
- images: array of property photo URLs (string[])
For missing fields return null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Parse optional params
    let maxResults = 10;
    let customQuery: string | null = null;
    try {
      const body = await req.json();
      if (body?.max_results) maxResults = Math.min(body.max_results, 30);
      if (body?.custom_query) customQuery = body.custom_query;
    } catch { /* no body */ }

    const results: any[] = [];
    const errors: string[] = [];

    // Load keywords from DB, fallback to hardcoded defaults
    let queries: { platform: string; query: string }[];
    if (customQuery) {
      queries = [{ platform: 'Custom', query: customQuery }];
    } else {
      const { data: dbKeywords } = await supabase
        .from('scraper_search_keywords')
        .select('keyword, platform')
        .eq('is_active', true);
      queries = (dbKeywords && dbKeywords.length > 0)
        ? dbKeywords.map((k: any) => ({ platform: k.platform, query: k.keyword }))
        : DEFAULT_SEARCH_QUERIES;
    }

    // Expand keywords with diacritics-free variants for fuzzy matching
    queries = expandKeywordsWithoutDiacritics(queries);
    console.log(`Expanded to ${queries.length} search queries (with diacritics-free variants)`);

    for (const { platform, query } of queries) {
      console.log(`Searching ${platform}: ${query}`);

      try {
        // Step 1: Search for listings
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: maxResults,
            lang: 'ro',
            country: 'ro',
            scrapeOptions: { formats: ['markdown'] },
          }),
        });

        const searchData = await searchResp.json();
        const searchResults = searchData?.data || [];
        console.log(`Found ${searchResults.length} results from ${platform}`);

        // Step 2: Process each result (extract from markdown, no individual scrape)
        for (const result of searchResults) {
          const url = result.url;
          if (!url) continue;

          // Skip if already in DB
          const { data: existing } = await supabase
            .from('prospect_listings')
            .select('id')
            .eq('source_url', url)
            .maybeSingle();

          if (existing) {
            await supabase.from('prospect_listings')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', existing.id);
            continue;
          }

          // Extract data from search result markdown (no extra API call)
          const markdown = result.markdown || result.description || '';
          const extracted = extractFromMarkdown(markdown, result.title || '', url);

          // Normalize price to EUR
          let price = extracted.price;
          if (price && extracted.currency === 'RON') {
            price = Math.round(price * 0.2);
          }

          const size = extracted.size;
          const pricePerSqm = (price && size && size > 0) ? Math.round(price / size) : null;

          const locationText = extracted.location || result.title || '';
          const zone = detectZone(locationText + ' ' + (result.title || ''));
          const features = extracted.features;

          const { score, breakdown } = scoreListing({
            zone,
            size,
            rooms: extracted.rooms,
            price,
            pricePerSqm,
            floor: extracted.floor,
            yearBuilt: extracted.yearBuilt,
            features,
          });

          const { data: inserted, error: insertErr } = await supabase
            .from('prospect_listings')
            .insert({
              source_platform: platform,
              source_url: url,
              title: extracted.title || result.title || 'Anunț fără titlu',
              description: extracted.description || result.description || null,
              price,
              currency: 'EUR',
              price_per_sqm: pricePerSqm,
              location: extracted.location || null,
              zone,
              size,
              rooms: extracted.rooms,
              floor: extracted.floor,
              year_built: extracted.yearBuilt,
              features,
              images: extracted.images.slice(0, 10),
              contact_phone: extracted.contactPhone,
              contact_name: extracted.contactName,
              score,
              score_breakdown: breakdown,
            })
            .select('id, title, score, zone')
            .single();

          if (insertErr) {
            console.error(`Insert error for ${url}:`, insertErr.message);
            errors.push(`${url}: ${insertErr.message}`);
          } else {
            results.push(inserted);
          }
        }
      } catch (err: any) {
        console.error(`Platform ${platform} error:`, err);
        errors.push(`${platform}: ${err.message}`);
      }

      // Pause between platforms
      await new Promise(r => setTimeout(r, 2000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_listings: results.length,
        listings: results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Scrape prospects error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
