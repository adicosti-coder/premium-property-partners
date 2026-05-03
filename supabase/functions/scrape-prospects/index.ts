import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function requireAdminOr401(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response(JSON.stringify({ error: "Auth required" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: u } = await userClient.auth.getUser(token);
  if (!u?.user) return new Response(JSON.stringify({ error: "Invalid token" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await admin.from("user_roles").select("role")
    .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return new Response(JSON.stringify({ error: "Admin required" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return null;
}


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
 * GLOBAL RULE — "Doar Proprietari"
 * Aplicăm pe TOATE căutările (default + custom + DB) un set de filtre care
 * forțează rezultate de la persoane fizice / proprietari și exclud agențiile.
 *
 * Două straturi:
 *  1) `OWNER_TEXT_FILTER` — textul Google-style care se concatenează la query
 *     (cuvinte „proprietar/persoană fizică” + excludere „agenție/imobiliare/comision”).
 *  2) `OWNER_URL_FILTERS` — query string specific platformei (ex. OLX
 *     `?search[private_business]=private`, Storia `?ownerTypeSingleSelect=PRIVATE`),
 *     adăugat ca parte a operatorului `inurl:` ca să forțeze pagini-listă filtrate.
 */
const OWNER_TEXT_FILTER =
  ' (proprietar OR "persoana fizica" OR "persoană fizică" OR "fara comision" OR "fără comision" OR "direct proprietar")' +
  ' -agentie -agenție -agency -"comision agentie" -"comision 2%" -"comision agenție" -broker';

const OWNER_URL_FILTERS: Record<string, string> = {
  'OLX': 'inurl:search%5Bprivate_business%5D=private OR inurl:search[private_business]=private',
  'Storia.ro': 'inurl:ownerTypeSingleSelect=PRIVATE',
  'imobiliare.ro': 'inurl:persoane-fizice OR inurl:proprietari',
  'Publi24': 'inurl:tip-anunt-persoane-fizice OR inurl:proprietari',
  'BursaImobiliara.ro': 'inurl:proprietar OR inurl:persoane-fizice',
};

/** Detect platform name from a free-text query (best-effort). */
function detectPlatformFromQuery(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes('olx.ro')) return 'OLX';
  if (q.includes('storia.ro')) return 'Storia.ro';
  if (q.includes('imobiliare.ro')) return 'imobiliare.ro';
  if (q.includes('publi24.ro')) return 'Publi24';
  if (q.includes('bursaimobiliara.ro')) return 'BursaImobiliara.ro';
  if (q.includes('facebook.com')) return 'Facebook Marketplace';
  return null;
}

/**
 * Native platform filter toggles. Mirror of `PLATFORM_FILTERS` in
 * src/pages/ScraperLeads.tsx — keep them in sync. Each toggle id maps to a
 * Google operator fragment that is appended to the query when the toggle is
 * enabled for a given keyword.
 */
type PlatformFilterDef = { id: string; hint: string; defaultOn: boolean };

const PLATFORM_FILTER_TOGGLES: Record<string, PlatformFilterDef[]> = {
  'OLX': [
    { id: 'private',       hint: 'inurl:search%5Bprivate_business%5D=private OR inurl:search[private_business]=private', defaultOn: true },
    { id: 'exclude_firma', hint: '-inurl:business -"de la firma" -"de la companie"', defaultOn: true },
  ],
  'Storia.ro': [
    { id: 'private',        hint: 'inurl:ownerTypeSingleSelect=PRIVATE', defaultOn: true },
    { id: 'exclude_agency', hint: '-inurl:ownerTypeSingleSelect=AGENCY -inurl:by=agency', defaultOn: true },
  ],
  'imobiliare.ro': [
    { id: 'owners',    hint: 'inurl:persoane-fizice OR inurl:proprietari', defaultOn: true },
    { id: 'no_agency', hint: '-inurl:agentii -inurl:agency', defaultOn: true },
    { id: 'no_dev',    hint: '-inurl:dezvoltatori -inurl:developer', defaultOn: false },
  ],
  'Publi24': [
    { id: 'private',  hint: 'inurl:tip-anunt-persoane-fizice OR inurl:proprietari', defaultOn: true },
    { id: 'no_firms', hint: '-inurl:tip-anunt-firma -inurl:agentie', defaultOn: true },
  ],
  'BursaImobiliara.ro': [
    { id: 'private',   hint: 'inurl:proprietar OR inurl:persoane-fizice', defaultOn: true },
    { id: 'no_agency', hint: '-inurl:agentie -inurl:agency', defaultOn: true },
  ],
  'Facebook Marketplace': [
    { id: 'owner_kw',  hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: 'no_agency', hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  'Grupuri Facebook': [
    { id: 'owner_kw',  hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: 'no_agency', hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  'General': [
    { id: 'owner_kw',  hint: '("proprietar" OR "persoana fizica" OR "persoană fizică" OR "fara comision" OR "fără comision" OR "direct proprietar")', defaultOn: true },
    { id: 'no_agency', hint: '-agentie -agenție -agency -"comision agentie" -"comision 2%" -"comision agenție" -broker', defaultOn: true },
  ],
};

function getToggleDefs(platform: string): PlatformFilterDef[] {
  return PLATFORM_FILTER_TOGGLES[platform] ?? PLATFORM_FILTER_TOGGLES['General'];
}

/** Apply the per-keyword owner-only filter toggles, idempotent.
 *  If `override.toggles` is provided we honor exactly that list (admin choice
 *  from the UI). If not, we use the platform's `defaultOn` toggles. */
function applyOwnerOnlyFilter(
  platform: string,
  query: string,
  override?: { toggles?: string[]; text?: string; url_hint?: string },
): string {
  const lower = query.toLowerCase();
  let result = query.trim();

  const defs = getToggleDefs(platform);
  const enabledIds: string[] = Array.isArray(override?.toggles)
    ? override!.toggles!
    : defs.filter((d) => d.defaultOn).map((d) => d.id);

  for (const def of defs) {
    if (!enabledIds.includes(def.id)) continue;
    // Idempotent: skip if the hint's first significant token already appears.
    const firstToken = def.hint.split(/\s+/)[0]?.toLowerCase() ?? '';
    if (firstToken && lower.includes(firstToken)) continue;
    result = `${result} ${def.hint}`;
  }

  // Legacy free-text override (kept for backward compatibility).
  if (override?.text && override.text.trim().length > 0) {
    result = `${result} ${override.text.trim()}`;
  }
  if (override?.url_hint && override.url_hint.trim().length > 0) {
    result = `${result} (${override.url_hint.trim()})`;
  }

  return result;
}

/**
 * Remove diacritics from a string (ă→a, ș→s, ț→t, î→i, â→a).
 */
function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeRoPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('40')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+4${cleaned}`;
  return `+40${cleaned}`;
}

function extractUrlDomain(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return String(rawUrl).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || null;
  }
}

const OWNER_SIGNALS = [
  'proprietar', 'direct proprietar', 'de la proprietar',
  'fara intermediar', 'persoana privata', 'persoană privată',
  'privat', 'privati', 'privați', 'persoana fizica', 'persoană fizică', 'persoane fizice',
];

const AGENCY_SIGNALS = [
  'agentie', 'agenție', 'agency', 'agent imobiliar', 'consultant imobiliar',
  'broker', 'brokeraj', 'reprezentant vanzari', 'reprezentant vânzări',
  'dezvoltator', 'developer', 'ansamblu rezidential', 'ansamblu rezidențial',
  'imobiliare srl', 'real estate srl',
];

const GENERIC_LISTING_TITLE_SIGNALS = [
  'anunturi gratuite', 'anunturi imobiliare', 'anunturi olx', 'imobiliare olx',
  'second hand si noi', 'apartamente de vanzare in', 'apartamente de vânzare în',
  'apartamente 1 camera de', 'apartamente 1 cameră de', 'apartamente 2 camere de',
  'apartamente 3 camere de', 'apartamente 4 camere de',
  'apartamente noi de vanzare', 'apartamente noi de vânzare', 'apartamente de inchiriat',
  'apartamente de închiriat', 'garsoniere de vanzare', 'garsoniere de vânzare',
  'proprietati noi', 'proprietăți noi', 'pagina ', 'rezultate vanzare', 'rezultate vânzare',
];

function isGenericSearchPage(url: string | null | undefined, title: string | null | undefined): boolean {
  const u = String(url || '').toLowerCase().split('?')[0];
  const t = removeDiacritics(String(title || '').toLowerCase());
  const isIndividualAd =
    u.includes('/d/oferta/') ||
    /storia\.ro\/ro\/oferta\//.test(u) ||
    /imobiliare\.ro\/oferta-/.test(u) ||
    /imobiliare\.ro\/[^/]+\/[^/]+\/[a-z0-9]{6,}/i.test(String(url || ''));
  if (isIndividualAd) return false;
  return u.includes('/q-') || /\/q-[^/]+\/?$/.test(u) ||
    /olx\.ro\/imobiliare(\/|$)/.test(u) ||
    /imobiliare\.ro\/(vanzare|inchirieri)-[^/]+\/?$/.test(u) ||
    /storia\.ro\/ro\/rezultate\//.test(u) ||
    /imoradar24\.ro\/(apartamente|garsoniere|case|terenuri)-de-(vanzare|inchiriat)\//.test(u) ||
    /renaissanceestate\.ro\/apartamente-de-vanzare\//.test(u) ||
    (/\/(apartamente|garsoniere|case)-de-(vanzare|inchiriat)(\/|$)/.test(u) && !/\/anunt\//.test(u)) ||
    GENERIC_LISTING_TITLE_SIGNALS.some((signal) => t.includes(removeDiacritics(signal.toLowerCase()))) ||
    t.endsWith('- olx.ro') ||
    t.endsWith('• olx.ro') ||
    t.endsWith(' storia.ro');
}

function hasExplicitOwnerSignal(title: string | null | undefined, url: string | null | undefined, markdown: string | null | undefined): boolean {
  const blob = removeDiacritics(`${title || ''} ${markdown || ''}`.toLowerCase());
  return OWNER_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

function hasAgencySignal(title: string | null | undefined, url: string | null | undefined, markdown: string | null | undefined): boolean {
  const blob = removeDiacritics(`${title || ''} ${url || ''} ${markdown || ''}`.toLowerCase());
  return AGENCY_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

function hasOwnerFilterIntent(query: string | null | undefined, url: string | null | undefined): boolean {
  const blob = removeDiacritics(`${query || ''} ${url || ''}`.toLowerCase());
  return [
    'proprietar', 'proprietari', 'persoana fizica', 'persoane fizice', 'persoana privata',
    'private_business', 'ownerTypeSingleSelect=PRIVATE', 'tip-anunt-persoane-fizice',
    'fara comision', 'direct proprietar',
  ].some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

/**
 * Expand keyword list with diacritics-free variants for fuzzy matching.
 * Deduplicates by normalized form to avoid double-searching.
 */
function expandKeywordsWithoutDiacritics<T extends { platform: string; query: string }>(
  queries: T[]
): T[] {
  const seen = new Set<string>();
  const expanded: T[] = [];

  for (const q of queries) {
    const key = removeDiacritics(q.query).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const clean = removeDiacritics(q.query);
      // Always push diacritics-free version first (broadest match)
      expanded.push({ ...q, query: clean });
      // If original had diacritics, also keep it for exact-match ranking
      if (clean !== q.query) {
        expanded.push({ ...q, query: q.query });
      }
    }
  }
  return expanded;
}

/** Extract property data from markdown text using regex patterns */
function extractFromMarkdown(markdown: string, title: string, _url: string): {
  title: string; description: string | null; price: number | null; currency: string;
  location: string | null; size: number | null; rooms: number | null;
  floor: string | null; yearBuilt: number | null; features: string[];
  contactPhone: string | null; contactName: string | null; images: string[];
} {
  const text = markdown || '';
  
  // Price extraction
  let price: number | null = null;
  let currency = 'EUR';
  const priceMatch = text.match(/(\d[\d\s.,]*)\s*€/) || text.match(/preț[:\s]*(\d[\d\s.,]*)/i);
  const ronMatch = text.match(/(\d[\d\s.,]*)\s*(?:RON|lei)/i);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(/[\s.]/g, '').replace(',', '.'));
  } else if (ronMatch) {
    price = parseFloat(ronMatch[1].replace(/[\s.]/g, '').replace(',', '.'));
    currency = 'RON';
  }

  // Size extraction
  let size: number | null = null;
  const sizeMatch = text.match(/(\d+)\s*mp/i) || text.match(/(\d+)\s*m²/i) || text.match(/suprafață[:\s]*(\d+)/i);
  if (sizeMatch) size = parseInt(sizeMatch[1]);

  // Rooms
  let rooms: number | null = null;
  const roomsMatch = text.match(/(\d+)\s*camer/i) || text.match(/(\d+)\s*room/i);
  if (roomsMatch) rooms = parseInt(roomsMatch[1]);
  if (!rooms && /garsonier/i.test(text)) rooms = 1;

  // Floor
  let floor: string | null = null;
  const floorMatch = text.match(/etaj[:\s]*(\d+)/i) || text.match(/etajul?\s+(\d+)/i);
  if (floorMatch) floor = floorMatch[1];

  // Year built
  let yearBuilt: number | null = null;
  const yearMatch = text.match(/an\s*(?:construc[tț]ie|constru[iî]re)?[:\s]*(\d{4})/i) ||
    text.match(/constru(?:it|cție)[:\s]*(?:în\s*)?(\d{4})/i);
  if (yearMatch) {
    const y = parseInt(yearMatch[1]);
    if (y >= 1900 && y <= 2030) yearBuilt = y;
  }

  // Features
  const features: string[] = [];
  const featurePatterns = [
    'centrală', 'aer condiționat', 'parcare', 'balcon', 'lift', 'mobilat', 'utilat',
    'terasă', 'garaj', 'boxa', 'pod', 'piscină', 'grădină',
  ];
  for (const f of featurePatterns) {
    const clean = removeDiacritics(f);
    if (removeDiacritics(text.toLowerCase()).includes(clean)) features.push(f);
  }

  // Contact
  let contactPhone: string | null = null;
  const phoneMatch = text.match(/(?:tel|telefon|contact)[.:\s]*([\d\s+()-]{7,})/i) ||
    text.match(/(07\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/);
  if (phoneMatch) contactPhone = phoneMatch[1].trim();

  // Images from markdown
  const images: string[] = [];
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = imgRegex.exec(text)) !== null) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  // Location
  let location: string | null = null;
  const locMatch = text.match(/(?:locație|adresă|zonă|zona|cartier)[:\s]*([^\n,]{3,40})/i);
  if (locMatch) location = locMatch[1].trim();

  // Description: first 300 chars
  const desc = text.replace(/[#*\[\]()!]/g, '').trim().substring(0, 300) || null;

  return {
    title: title || 'Anunț fără titlu',
    description: desc,
    price, currency, location, size, rooms, floor, yearBuilt,
    features, contactPhone, contactName: null, images,
  };
}

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
    let onlyNewSources = false;
    let preserveAgencyFilter = true;
    try {
      const body = await req.json();
      if (body?.max_results) maxResults = Math.min(body.max_results, 30);
      if (body?.custom_query) customQuery = body.custom_query;
      onlyNewSources = body?.only_new_sources === true;
      preserveAgencyFilter = body?.preserve_agency_filter !== false;
    } catch { /* no body */ }

    const results: any[] = [];
    const errors: string[] = [];
    let blacklistedSkipped = 0;
    let archivedSkipped = 0;
    let duplicateSkipped = 0;
    const existingUrls = new Set<string>();
    const blockedPhones = new Set<string>();
    const blockedDomains = new Set<string>();
    const whitelistedPhones = new Set<string>();
    const whitelistedDomains = new Set<string>();

    // Load keywords from DB, fallback to hardcoded defaults
    let queries: { platform: string; query: string; ownerFilters?: { toggles?: string[]; text?: string; url_hint?: string } }[];
    if (customQuery) {
      queries = [{ platform: 'Custom', query: customQuery }];
    } else {
      const { data: dbKeywords } = await supabase
        .from('scraper_search_keywords')
        .select('keyword, platform, owner_filters')
        .eq('is_active', true);
      queries = (dbKeywords && dbKeywords.length > 0)
        ? dbKeywords.map((k: any) => ({
            platform: k.platform,
            query: k.keyword,
            ownerFilters: (k.owner_filters && typeof k.owner_filters === 'object') ? k.owner_filters : undefined,
          }))
        : DEFAULT_SEARCH_QUERIES;
    }

    // Expand keywords with diacritics-free variants for fuzzy matching
    queries = expandKeywordsWithoutDiacritics(queries);

    // GLOBAL RULE: force "Doar Proprietari" filter on every single query
    queries = queries.map((q) => ({
      platform: q.platform,
      query: applyOwnerOnlyFilter(q.platform, q.query, q.ownerFilters),
    }));
    console.log(`Expanded to ${queries.length} owner-only search queries`);

    if (onlyNewSources || preserveAgencyFilter) {
      const [{ data: archiveRows }, { data: prospectRows }, { data: blockRows }, { data: whitelistRows }] = await Promise.all([
        supabase.from('scraper_leads_archive_2026').select('url, phone, prospect_category, status'),
        supabase.from('prospect_listings').select('source_url, phone_normalized, contact_phone, prospect_type, is_active'),
        supabase.from('agency_blocklist').select('phone_normalized, domain'),
        supabase.from('agency_whitelist').select('phone_normalized, domain'),
      ]);

      for (const row of archiveRows || []) {
        if (row.url) existingUrls.add(row.url);
        if (row.prospect_category === 'agentie' || row.status === 'archived') {
          const phone = normalizeRoPhone(row.phone);
          const domain = extractUrlDomain(row.url);
          if (phone) blockedPhones.add(phone);
          if (domain) blockedDomains.add(domain);
        }
      }
      for (const row of prospectRows || []) {
        if (row.source_url) existingUrls.add(row.source_url);
        if (row.prospect_type === 'agentie' || row.is_active === false) {
          const phone = normalizeRoPhone(row.phone_normalized || row.contact_phone);
          const domain = extractUrlDomain(row.source_url);
          if (phone) blockedPhones.add(phone);
          if (domain) blockedDomains.add(domain);
        }
      }
      for (const row of blockRows || []) {
        const phone = normalizeRoPhone(row.phone_normalized);
        if (phone) blockedPhones.add(phone);
        if (row.domain) blockedDomains.add(row.domain);
      }
      for (const row of whitelistRows || []) {
        const phone = normalizeRoPhone(row.phone_normalized);
        if (phone) whitelistedPhones.add(phone);
        if (row.domain) whitelistedDomains.add(row.domain);
      }
    }

    // Process queries in parallel batches of 5 to avoid timeout
    const BATCH_SIZE = 5;
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      const batch = queries.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async ({ platform, query }) => {
        console.log(`Searching ${platform}: ${query}`);
        try {
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

          for (const result of searchResults) {
            const url = result.url;
            if (!url) continue;

            const markdown = result.markdown || result.description || '';
            if (isGenericSearchPage(url, result.title || '')) {
              archivedSkipped++;
              continue;
            }

            const explicitOwnerSignal = hasExplicitOwnerSignal(result.title || '', url, markdown);
            const ownerFilterIntent = hasOwnerFilterIntent(query, url);
            if (!explicitOwnerSignal && !ownerFilterIntent) {
              archivedSkipped++;
              continue;
            }

            if (hasAgencySignal(result.title || '', url, markdown)) {
              blacklistedSkipped++;
              continue;
            }

            const resultDomain = extractUrlDomain(url);
            if (onlyNewSources && existingUrls.has(url)) {
              duplicateSkipped++;
              continue;
            }
            if (preserveAgencyFilter && resultDomain && blockedDomains.has(resultDomain) && !whitelistedDomains.has(resultDomain)) {
              blacklistedSkipped++;
              continue;
            }

            const extracted = extractFromMarkdown(markdown, result.title || '', url);

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
              zone, size, rooms: extracted.rooms, price, pricePerSqm,
              floor: extracted.floor, yearBuilt: extracted.yearBuilt, features,
            });

            // Compute profit estimates
            const isRental = /inchiriere|chirie/i.test(extracted.title || result.title || '');
            let monthlyExtra: number | null = null;
            let extraProfit3Y: number | null = null;
            
            if (isRental && price) {
              // For rentals, price is monthly rent; estimate STR uplift ~70%
              monthlyExtra = Math.round(price * 0.7);
              extraProfit3Y = monthlyExtra * 36;
            } else if (!isRental && price && size) {
              // For sales, estimate monthly rental income based on price/sqm
              const estimatedMonthlyRent = Math.round(price * 0.004); // ~0.4% of price
              monthlyExtra = Math.round(estimatedMonthlyRent * 0.7);
              extraProfit3Y = monthlyExtra * 36;
            }

            // Check phone blacklist
            let skipBlacklist = false;
            if (extracted.contactPhone) {
              const normalizedPhone = normalizeRoPhone(extracted.contactPhone);
              if (preserveAgencyFilter && normalizedPhone && blockedPhones.has(normalizedPhone) && !whitelistedPhones.has(normalizedPhone)) {
                skipBlacklist = true;
              }
              const { data: phoneData } = await supabase
                .from('phone_intelligence')
                .select('is_blacklisted')
                .eq('phone_number', extracted.contactPhone)
                .maybeSingle();
              if (phoneData?.is_blacklisted) {
                skipBlacklist = true;
              }
            }

            if (skipBlacklist) {
              blacklistedSkipped++;
              continue;
            }

            const { data: inserted, error: insertErr } = await supabase
              .from('prospect_listings')
              .upsert({
                source_platform: platform,
                source_url: url,
                title: extracted.title || result.title || 'Anunț fără titlu',
                description: extracted.description || markdown.substring(0, 500) || null,
                price,
                currency: 'EUR',
                location: extracted.location || 'Timișoara',
                zone,
                rooms: extracted.rooms,
                size,
                floor: extracted.floor,
                year_built: extracted.yearBuilt,
                features,
                images: extracted.images,
                contact_name: extracted.contactName,
                contact_phone: extracted.contactPhone,
                phone_normalized: normalizeRoPhone(extracted.contactPhone),
                score,
                lead_score: score,
                score_breakdown: breakdown,
                ai_score_breakdown: {
                  source: 'scrape-prospects',
                  owner_filter_intent: ownerFilterIntent,
                  explicit_owner_signal: explicitOwnerSignal,
                  estimated_monthly_extra: monthlyExtra,
                  estimated_extra_profit_3y: extraProfit3Y,
                },
                status: 'new',
                prospect_type: 'proprietar',
                category: isRental ? 'inchiriere' : 'vanzare',
                lifecycle_status: 'new',
                is_active: true,
                search_keywords: [query],
                tags: ['scrape-prospects', 'auto-import', explicitOwnerSignal ? 'semnal-proprietar' : 'filtru-proprietari'].filter(Boolean),
                admin_notes: explicitOwnerSignal
                  ? 'Import automat: semnal explicit proprietar/persoană fizică.'
                  : 'Import automat: rezultat din query filtrat pe proprietari/persoane fizice; necesită verificare rapidă.',
                scraped_at: new Date().toISOString(),
                last_seen_at: new Date().toISOString(),
              }, { onConflict: 'source_url', ignoreDuplicates: true })
              .select('id, title, lead_score, source_url')
              .maybeSingle();

            if (insertErr) {
              console.error(`Insert error for ${url}:`, insertErr.message);
              errors.push(`${url}: ${insertErr.message}`);
            } else if (inserted) {
              results.push(inserted);
              existingUrls.add(url);
            } else {
              duplicateSkipped++;
            }
          }
        } catch (err: any) {
          console.error(`Platform ${platform} error:`, err);
          errors.push(`${platform}: ${err.message}`);
        }
      });

      await Promise.all(batchPromises);
      // Brief pause between batches
      if (i + BATCH_SIZE < queries.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_listings: results.length,
        count: results.length,
        blacklisted_skipped: blacklistedSkipped,
        archived_skipped: archivedSkipped,
        duplicate_skipped: duplicateSkipped,
        existing_sources_checked: existingUrls.size,
        agency_filter: {
          blocked_phones: blockedPhones.size,
          blocked_domains: blockedDomains.size,
          whitelisted_phones: whitelistedPhones.size,
          whitelisted_domains: whitelistedDomains.size,
        },
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
