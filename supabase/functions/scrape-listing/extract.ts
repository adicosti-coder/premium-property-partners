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
- contact_name: the name of the property owner, agent, or person posting the listing. Look in sidebars, footers, contact sections, "Publicat de", "Agent", "Proprietar" labels. (string or null)
- contact_phone: the phone number - VERY IMPORTANT! Search thoroughly in: contact section, sidebar, "Detalii contact", "Telefon", "Sună", buttons with phone icons, hidden phone sections, footer contact info. Romanian numbers start with 07xx or +407xx. Return the full number. (string or null)
- contact_email: the email of the owner/agent if available (string or null)

IMPORTANT: Try very hard to find the phone number and contact name. They are often in a sidebar, a "contact" button, or shown after clicking "Arată telefonul". If you see partial phone like "07xx xxx ..." extract whatever is visible.

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

/** Convert raw HTML into clean text + extract <img>/<a> URLs. */
function htmlToTextAndLinks(html: string, baseUrl: string): { text: string; images: string[]; links: string[] } {
  if (!html) return { text: '', images: [], links: [] };

  const images: string[] = [];
  const links: string[] = [];

  const absolutize = (u: string): string | null => {
    try {
      if (!u) return null;
      if (u.startsWith('//')) return `https:${u}`;
      return new URL(u, baseUrl).toString();
    } catch { return null; }
  };

  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch = tag.match(/\b(?:data-src|data-original|src)\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
      const abs = absolutize(srcMatch[1]);
      if (abs) images.push(abs);
    }
    const srcsetMatch = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i);
    if (srcsetMatch) {
      for (const part of srcsetMatch[1].split(',')) {
        const u = part.trim().split(/\s+/)[0];
        const abs = absolutize(u);
        if (abs) images.push(abs);
      }
    }
  }

  const aRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = aRe.exec(html)) !== null) {
    const abs = absolutize(m[1]);
    if (abs) links.push(abs);
  }

  let text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  if (images.length) {
    text += '\n\n' + [...new Set(images)].map((u) => `![](${u})`).join('\n');
  }

  return { text, images: [...new Set(images)], links: [...new Set(links)] };
}

/** Schedule a backoff delay (exposed for tests). */
export function computeBackoffDelay(
  attempt: number,
  opts: { baseMs?: number; capMs?: number; jitterMs?: number; rand?: () => number } = {},
): number {
  const base = opts.baseMs ?? 500;
  const cap = opts.capMs ?? 8000;
  const jitterMs = opts.jitterMs ?? 250;
  const rand = opts.rand ?? Math.random;
  return Math.min(cap, base * 2 ** (attempt - 1)) + Math.floor(rand() * jitterMs);
}

export interface RetryFetchResult {
  response: Response;
  attempts: number;
  delays: number[]; // delays slept between attempts (length = attempts - 1)
}

export interface RetryFetchOptions {
  maxAttempts?: number;
  baseMs?: number;
  capMs?: number;
  jitterMs?: number;
  rand?: () => number;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; status: number | null; delay: number; error?: Error }) => void;
}

/**
 * Fetch with exponential-backoff retry on 429 + 5xx + network errors.
 * Exported separately so unit tests can inject fake fetch/sleep/random.
 */
export async function fetchWithRetry(
  endpoint: string,
  init: RequestInit,
  opts: RetryFetchOptions = {},
): Promise<RetryFetchResult> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const fetchFn = opts.fetchFn ?? fetch;
  const sleepFn = opts.sleepFn ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const delays: number[] = [];
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetchFn(endpoint, init);
      const transient = resp.status === 429 || (resp.status >= 500 && resp.status < 600);
      if (!transient || attempt === maxAttempts) {
        return { response: resp, attempts: attempt, delays };
      }
      const delay = computeBackoffDelay(attempt, opts);
      delays.push(delay);
      opts.onRetry?.({ attempt, status: resp.status, delay });
      await sleepFn(delay);
    } catch (e) {
      lastErr = e;
      if (attempt === maxAttempts) throw e;
      const delay = computeBackoffDelay(attempt, opts);
      delays.push(delay);
      opts.onRetry?.({ attempt, status: null, delay, error: e as Error });
      await sleepFn(delay);
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error('fetchWithRetry: exhausted'));
}

export interface ScrapeDoResult {
  jsonData: Record<string, any>;
  markdown: string;
  pageLinks: string[];
  logs: string[];
  attempts: number;
}

export interface ScrapeDoRequestOptions extends RetryFetchOptions {
  /** Country code for residential proxy geolocation, e.g. "ro", "us". Default: "ro". */
  geoCode?: string;
  /** Extra wait (ms) after page load for JS-heavy sites. Default: 5000. */
  customWait?: number;
  /** Custom request headers forwarded to the target site (requires customHeaders=true). */
  customHeaders?: Record<string, string>;
}

/** Infer a sensible proxy geo code from the URL's TLD. */
function inferGeoCode(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.ro')) return 'ro';
    if (host.endsWith('.hu')) return 'hu';
    if (host.endsWith('.de') || host.endsWith('.at')) return 'de';
    if (host.endsWith('.it')) return 'it';
    if (host.endsWith('.fr')) return 'fr';
    if (host.endsWith('.es')) return 'es';
    if (host.endsWith('.uk') || host.endsWith('.co.uk')) return 'gb';
    if (host.endsWith('.com') || host.endsWith('.net') || host.endsWith('.org')) return 'us';
    return 'ro';
  } catch {
    return 'ro';
  }
}

/** Call Scrape.do to fetch JS-rendered HTML, then convert to text + links. */
export async function scrapeWithScrapeDo(
  url: string,
  scrapeDoKey: string,
  opts: ScrapeDoRequestOptions = {},
): Promise<ScrapeDoResult> {
  const logs: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] [Scrape.do] ${msg}`;
    logs.push(line);
    console.log(line);
  };

  const geoCode = (opts.geoCode ?? inferGeoCode(url)).toLowerCase();
  const customWait = Math.max(0, Math.min(30000, opts.customWait ?? 5000));
  const customHeaders = opts.customHeaders ?? {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'accept-language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
  };
  const hasCustomHeaders = customHeaders && Object.keys(customHeaders).length > 0;

  // Build query string with strict encoding for every parameter.
  const params = new URLSearchParams();
  params.set('token', scrapeDoKey);
  params.set('url', url); // URLSearchParams handles percent-encoding
  params.set('render', 'true');
  params.set('super', 'true');
  params.set('geoCode', geoCode);
  params.set('customWait', String(customWait));
  if (hasCustomHeaders) params.set('customHeaders', 'true');

  const endpoint = `https://api.scrape.do/?${params.toString()}`;

  // When customHeaders=true, Scrape.do forwards request headers verbatim to the target.
  const fetchInit: RequestInit = {
    method: 'GET',
    headers: hasCustomHeaders ? customHeaders : undefined,
  };

  log(`Fetching (render=true, super=true, geoCode=${geoCode}, customWait=${customWait}, customHeaders=${hasCustomHeaders})...`);

  const { response: resp, attempts, delays } = await fetchWithRetry(
    endpoint,
    fetchInit,
    {
      ...opts,
      onRetry: (info) => {
        const reason = info.error ? `network error (${info.error.message})` : `HTTP ${info.status}`;
        log(`Transient ${reason} on attempt ${info.attempt}/${opts.maxAttempts ?? 4}, retrying in ${info.delay}ms (target URL re-sent encoded)`);
        opts.onRetry?.(info);
      },
    },
  );

  if (attempts > 1) log(`Succeeded/finished after ${attempts} attempts (delays=${delays.join(',')}ms)`);
  const bodyText = await resp.text();

  if (!resp.ok) {
    let friendly: string;
    if (resp.status === 401 || resp.status === 403) {
      friendly = `Scrape.do: cheie API invalidă (${resp.status}). Înlocuiește secretul SCRAPE_DO_API_KEY. Detalii: ${bodyText.slice(0, 200)}`;
    } else if (resp.status === 402) {
      friendly = `Scrape.do: credite epuizate sau plan expirat (402). Reîncarcă pe scrape.do/dashboard. Detalii: ${bodyText.slice(0, 200)}`;
    } else if (resp.status === 429) {
      friendly = `Scrape.do: rate-limit atins (429) după ${attempts} încercări. Reîncearcă în câteva secunde.`;
    } else {
      friendly = `Scrape.do error ${resp.status}: ${bodyText.slice(0, 300)}`;
    }
    log(friendly);
    const err = new Error(friendly) as Error & {
      firecrawl_status?: number; firecrawl_raw?: unknown; logs?: string[]; attempts?: number;
    };
    err.firecrawl_status = resp.status;
    err.firecrawl_raw = bodyText.slice(0, 500);
    err.logs = logs;
    err.attempts = attempts;
    throw err;
  }

  const { text, images, links } = htmlToTextAndLinks(bodyText, url);
  log(`HTML length: ${bodyText.length}, text length: ${text.length}, images: ${images.length}, links: ${links.length}`);

  return { jsonData: {}, markdown: text, pageLinks: links, logs, attempts };
}

/** @deprecated kept for backward-compat call sites — now uses Scrape.do. */
export async function scrapeWithFirecrawl(url: string, _key: string) {
  const scrapeDoKey = Deno.env.get('SCRAPE_DO_API_KEY');
  if (!scrapeDoKey) throw new Error('SCRAPE_DO_API_KEY not configured');
  return scrapeWithScrapeDo(url, scrapeDoKey);
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
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

  // Try to find phone numbers (Romanian format)
  const phonePatterns = [
    /(?:telefon|tel|phone|contact|apel|suna)[:\s]*([+]?[0-9][\d\s.\-]{7,14})/i,
    /(?:0[27]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(?:\+40[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3})/,
  ];
  for (const pattern of phonePatterns) {
    const phoneMatch = markdown.match(pattern);
    if (phoneMatch) {
      result.contact_phone = (phoneMatch[1] || phoneMatch[0]).replace(/[\s.-]/g, '').trim();
      break;
    }
  }

  // Try to find contact name patterns
  const namePatterns = [
    /(?:proprietar|agent|contact|publicat de|postat de)[:\s]*([A-ZÀ-Ž][a-zà-ž]+(?:\s+[A-ZÀ-Ž][a-zà-ž]+)+)/i,
    /(?:nume|name)[:\s]*([A-ZÀ-Ž][a-zà-ž]+(?:\s+[A-ZÀ-Ž][a-zà-ž]+)+)/i,
  ];
  for (const pattern of namePatterns) {
    const nameMatch = markdown.match(pattern);
    if (nameMatch) {
      result.contact_name = nameMatch[1].trim();
      break;
    }
  }

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
export function collectImages(jsonData: any, pageLinks: string[], markdown: string, pageUrl?: string): string[] {
  let imageUrls: string[] = [];

  const normalizeImageUrl = (rawUrl: string): string | null => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    try {
      if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      if (pageUrl) {
        return new URL(trimmed, pageUrl).toString();
      }
    } catch {
      return null;
    }

    return null;
  };

  const isApolloImageUrl = (url: string): boolean =>
    /^https?:\/\/[^/]*apollo\.olxcdn\.com(?::443)?\/v1\/files\/[^/]+\/image(?:;|$)/i.test(url);

  const isDirectImageUrl = (url: string): boolean =>
    /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(url) || isApolloImageUrl(url);

  const isPropertyImage = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (!/^https?:\/\//i.test(url)) return false;
    if (/\.(svg|gif)(\?|$)/i.test(url)) return false;
    if (/logo|icon|avatar|thumb|badge|app_store|google_play|static\/media|mapfiles|gstatic/i.test(url)) return false;
    if (url.length < 20) return false;
    return true;
  };

  const dedupeApolloImages = (urls: string[]): string[] => {
    const bestByFile = new Map<string, { url: string; score: number }>();

    for (const url of urls) {
      const match = url.match(/\/v1\/files\/([^/]+)\/image/i);
      const fileKey = match?.[1] || url;
      const sizeMatch = url.match(/;s=(\d+)x(\d+)/i);
      const score = sizeMatch ? Number(sizeMatch[1]) * Number(sizeMatch[2]) : Number.MAX_SAFE_INTEGER;
      const current = bestByFile.get(fileKey);

      if (!current || score > current.score) {
        bestByFile.set(fileKey, { url, score });
      }
    }

    return Array.from(bestByFile.values()).map((entry) => entry.url);
  };

  if (Array.isArray(jsonData.images)) imageUrls.push(...jsonData.images);

  imageUrls = imageUrls
    .map(normalizeImageUrl)
    .filter((url): url is string => Boolean(url))
    .filter((url) => isDirectImageUrl(url) && isPropertyImage(url));

  if (Array.isArray(pageLinks)) {
    const imageFromLinks = pageLinks
      .map((link: string) => normalizeImageUrl(link))
      .filter((link): link is string => Boolean(link))
      .filter((link: string) => isDirectImageUrl(link) && isPropertyImage(link));
    imageUrls.push(...imageFromLinks);
  }

  const mdImageRegex = /!\[.*?\]\(([^\s)]+)\)/g;
  let mdMatch;
  while ((mdMatch = mdImageRegex.exec(markdown)) !== null) {
    const normalized = normalizeImageUrl(mdMatch[1]);
    if (normalized && isDirectImageUrl(normalized) && isPropertyImage(normalized)) imageUrls.push(normalized);
  }

  const rawUrlRegex = /((?:https?:)?\/\/[^\s"'<>]+)/gi;
  while ((mdMatch = rawUrlRegex.exec(markdown)) !== null) {
    const normalized = normalizeImageUrl(mdMatch[1]);
    if (normalized && isDirectImageUrl(normalized) && isPropertyImage(normalized)) imageUrls.push(normalized);
  }

  const uniqueImages = [...new Set(imageUrls)];
  const apolloImages = dedupeApolloImages(uniqueImages.filter(isApolloImageUrl));
  const otherImages = uniqueImages.filter((url) => !isApolloImageUrl(url));

  return [...apolloImages, ...otherImages].slice(0, 30);
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
