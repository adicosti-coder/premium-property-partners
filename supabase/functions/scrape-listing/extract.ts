/**
 * Extraction helpers for scrape-listing edge function.
 * Handles Firecrawl API call + AI-based fallback extraction from markdown.
 */

export const EXTRACTION_PROMPT = `Extract ALL property listing details from this real estate page. Return JSON with these exact fields:
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
- contact_name: the name of the property owner or agent posting the listing (string or null)
- contact_phone: the phone number of the owner/agent - look for it in the listing details, sidebar, or contact section (string or null)
- contact_email: the email of the owner/agent if available (string or null)

Be thorough - extract every detail you can find. For missing fields, return null.`;

export interface ExtractedListing {
  title: string | null;
  description_short: string | null;
  description_full: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  size: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  year_built: number | null;
  parking: string | null;
  heating_type: string | null;
  energy_class: string | null;
  furnished: string | null;
  construction_type: string | null;
  compartimentare: string | null;
  features: string[];
  images: string[];
  listing_type_hint: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  source_url: string;
  source_platform: string;
}

/** Call Firecrawl to scrape a URL */
export async function scrapeWithFirecrawl(url: string, firecrawlKey: string) {
  console.log('[Firecrawl] Calling scrape API...');

  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links', 'extract'],
      extract: {
        prompt: EXTRACTION_PROMPT,
      },
      waitFor: 5000,
    }),
  });

  const scrapeData = await scrapeResponse.json();
  
  // Log the response structure for debugging
  const topKeys = Object.keys(scrapeData || {});
  const dataKeys = Object.keys(scrapeData?.data || {});
  console.log(`[Firecrawl] Response status: ${scrapeResponse.status}, top keys: [${topKeys}], data keys: [${dataKeys}]`);
  
  // Extract structured data - try multiple possible paths
  const jsonData = scrapeData?.data?.extract || scrapeData?.data?.json || scrapeData?.extract || scrapeData?.json || {};
  const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
  const pageLinks = scrapeData?.data?.links || scrapeData?.links || [];

  const jsonFieldCount = Object.values(jsonData).filter(v => v !== null && v !== undefined && v !== '').length;
  console.log(`[Firecrawl] Structured fields found: ${jsonFieldCount}, markdown length: ${markdown.length}, links: ${pageLinks.length}`);

  if (markdown.length > 0) {
    console.log(`[Firecrawl] Markdown preview (first 300 chars): ${markdown.substring(0, 300)}`);
  }

  return { jsonData, markdown, pageLinks };
}

/** Extract from markdown using AI (Lovable AI) as fallback */
export async function extractFromMarkdownWithAI(markdown: string, url: string): Promise<Record<string, any>> {
  if (!markdown || markdown.length < 50) {
    console.log('[AI Fallback] Markdown too short, skipping AI extraction');
    return {};
  }

  console.log(`[AI Fallback] Extracting from markdown (${markdown.length} chars) using Lovable AI...`);

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.log('[AI Fallback] LOVABLE_API_KEY not set, trying regex fallback');
    return extractFromMarkdownRegex(markdown);
  }

  try {
    const truncatedMarkdown = markdown.substring(0, 8000);
    
    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract property listing data from the provided text and return ONLY valid JSON, no markdown code blocks. If a field is not found, use null.',
          },
          {
            role: 'user',
            content: `Extract property details from this listing page content. Return JSON with these fields: title, description_short, description_full, price (number), currency ("EUR"/"RON"), location, size (number, sqm), rooms (number), bathrooms (number), floor, year_built (number), parking, heating_type, energy_class, furnished, construction_type, compartimentare, features (string array), images (array of image URLs), listing_type_hint ("vanzare"/"inchiriere"/"cazare"), contact_name (owner/agent name), contact_phone (phone number), contact_email (email if available).\n\nPage URL: ${url}\n\nPage content:\n${truncatedMarkdown}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      console.log(`[AI Fallback] API error: ${aiResponse.status}`);
      return extractFromMarkdownRegex(markdown);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content || '';
    console.log(`[AI Fallback] AI response length: ${content.length}`);

    // Parse JSON from response (strip markdown code blocks if present)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    console.log(`[AI Fallback] Successfully parsed ${Object.keys(parsed).length} fields from AI`);
    return parsed;
  } catch (err) {
    console.error('[AI Fallback] Error:', err);
    return extractFromMarkdownRegex(markdown);
  }
}

/** Simple regex-based extraction from markdown as last resort */
function extractFromMarkdownRegex(markdown: string): Record<string, any> {
  console.log('[Regex Fallback] Attempting regex extraction from markdown');
  const result: Record<string, any> = {};

  // Try to find price
  const priceMatch = markdown.match(/(\d[\d\s.]*)\s*(€|EUR|RON|lei)/i);
  if (priceMatch) {
    result.price = Number(priceMatch[1].replace(/[\s.]/g, ''));
    result.currency = priceMatch[2].match(/€|EUR/i) ? 'EUR' : 'RON';
  }

  // Try to find rooms
  const roomsMatch = markdown.match(/(\d+)\s*camer[eă]/i);
  if (roomsMatch) result.rooms = Number(roomsMatch[1]);

  // Try to find size
  const sizeMatch = markdown.match(/(\d+)\s*m[²p2]/i);
  if (sizeMatch) result.size = Number(sizeMatch[1]);

  // Try to find title (first heading)
  const titleMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/^##\s+(.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Extract images from markdown
  const images: string[] = [];
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = imgRegex.exec(markdown)) !== null) {
    if (!m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('avatar')) {
      images.push(m[1]);
    }
  }
  // Also find raw image URLs
  const rawImgRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?)/gi;
  while ((m = rawImgRegex.exec(markdown)) !== null) {
    if (!m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('avatar') && !m[1].includes('thumb')) {
      images.push(m[1]);
    }
  }
  result.images = [...new Set(images)];

  console.log(`[Regex Fallback] Extracted fields: ${Object.keys(result).join(', ')}`);
  return result;
}

/** Collect image URLs from multiple sources */
export function collectImages(jsonData: any, pageLinks: string[], markdown: string): string[] {
  let imageUrls: string[] = [];

  // From structured data
  if (Array.isArray(jsonData.images)) imageUrls.push(...jsonData.images);

  // Filter out non-property images (SVGs, logos, icons, app store badges, etc.)
  const isPropertyImage = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    // Reject SVGs, icons, logos, app badges, tiny images
    if (/\.(svg|gif)(\?|$)/i.test(url)) return false;
    if (/logo|icon|avatar|thumb|badge|app_store|google_play|static\/media|mapfiles|gstatic/i.test(url)) return false;
    if (url.length < 20) return false;
    return true;
  };

  // Filter structured data images
  imageUrls = imageUrls.filter(isPropertyImage);

  // From page links
  const imageExtensions = /\.(jpg|jpeg|png|webp|avif)(\?|$)/i;
  if (Array.isArray(pageLinks)) {
    const imageFromLinks = pageLinks.filter((link: string) =>
      typeof link === 'string' &&
      imageExtensions.test(link) &&
      isPropertyImage(link)
    );
    imageUrls.push(...imageFromLinks);
  }

  // From markdown
  const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let mdMatch;
  while ((mdMatch = mdImageRegex.exec(markdown)) !== null) {
    if (isPropertyImage(mdMatch[1])) imageUrls.push(mdMatch[1]);
  }

  // Also raw URLs in markdown
  const rawImgRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?)/gi;
  while ((mdMatch = rawImgRegex.exec(markdown)) !== null) {
    if (isPropertyImage(mdMatch[1])) imageUrls.push(mdMatch[1]);
  }

  return [...new Set(imageUrls)].slice(0, 30);
}

/** Build the final extracted data object */
export function buildExtracted(
  jsonData: Record<string, any>,
  imageUrls: string[],
  url: string,
  platform: string
): ExtractedListing {
  return {
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
    contact_name: jsonData.contact_name || null,
    contact_phone: jsonData.contact_phone || null,
    contact_email: jsonData.contact_email || null,
    source_url: url,
    source_platform: platform,
  };
}
