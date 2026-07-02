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

const PHONE_PATTERN = /(?:(?:\+|00)\s*40|0)\s*[237](?:[\s().\/-]*\d){8}\b/g;
const CONTEXT_PHONE_PATTERN = /(?:telefon|tel\.?|mobil|mobile|whatsapp|contact|num[ăa]r|phone)\D{0,24}((?:(?:\+|00)\s*40|0)?\s*[237](?:[\s().\/-]*\d){8})/gi;

function normalizeRoPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = String(phone);
  if (/[xX*•]{2,}|\.{3,}/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0040')) digits = digits.slice(2);
  if (digits.startsWith('40') && digits.length === 11) return /^40[237]\d{8}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith('0') && digits.length === 10) return /^0[237]\d{8}$/.test(digits) ? `+4${digits}` : null;
  if (/^[237]\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

function decodePhoneText(text: string): string {
  return text
    .replace(/%2B/gi, '+')
    .replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u00([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;|&thinsp;|&ensp;|&emsp;/gi, ' ');
}

function extractPhonesFromText(text: string | null | undefined): string[] {
  const out = new Set<string>();
  const decoded = decodePhoneText(text ?? '');
  const matches = decoded.match(PHONE_PATTERN) ?? [];
  for (const match of matches) {
    const normalized = normalizeRoPhone(match);
    if (normalized) out.add(normalized);
  }
  for (const match of decoded.matchAll(CONTEXT_PHONE_PATTERN)) {
    const normalized = normalizeRoPhone(match[1]);
    if (normalized) out.add(normalized);
  }
  return [...out].sort((a, b) => Number(!a.startsWith('+407')) - Number(!b.startsWith('+407')));
}

const PHONE_HYDRATION_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function buildPhoneRevealJavascript(phoneSelectors: string[]): string {
  return `
    try {
      var selectors = ${JSON.stringify(phoneSelectors)};
      var safeClick = function (sel) {
        try {
          document.querySelectorAll(sel).forEach(function (el) {
            try { el.click(); } catch (e) {}
          });
        } catch (e) {}
      };
      [
        '#onetrust-accept-btn-handler',
        'button[data-testid="cookie-policy-banner-accept"]',
        'button[id*="cookie" i][id*="accept" i]',
        'button[class*="cookie" i][class*="accept" i]',
        'button[aria-label*="accept" i]',
        'button[aria-label*="acceptă" i]'
      ].forEach(safeClick);
      try { window.scrollTo(0, Math.max(400, Math.floor(document.body.scrollHeight * 0.35))); } catch (e) {}
      selectors.forEach(safeClick);
      try {
        var textRe = /(afi[șs]eaz[ăa]|arat[ăa]|vezi|apeleaz[ăa]|sun[ăa]|show|reveal|contact)\\b[\\s\\S]{0,44}?(telefon|num[ăa]r|phone|mobile|contact)|^(telefon|tel\\.?|phone)$/i;
        document.querySelectorAll('button, a, [role="button"], [onclick], div, span').forEach(function (el) {
          try {
            var txt = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.textContent || '')).trim();
            if (textRe.test(txt)) el.click();
          } catch (e) {}
        });
      } catch (e) {}
    } catch (e) {}
  `;
}

function getPhoneSelectorsForUrl(url: string): string[] {
  const u = url.toLowerCase();
  const generic = [
    'a[href^="tel:"]',
    'button[aria-label*="telefon" i]',
    'button[aria-label*="phone" i]',
    'button[class*="phone" i]',
    'button[id*="phone" i]',
    'button[data-testid*="phone" i]',
    'button[data-cy*="phone" i]',
    '[role="button"][aria-label*="telefon" i]',
  ];
  if (u.includes('olx.ro')) return [
    'button[data-testid="show-phone"]', 'button[data-cy="show-phone"]', 'a[data-testid="contact-phone"]',
    'button[data-testid*="phone" i]', 'a[href^="tel:"]', ...generic,
  ];
  if (u.includes('storia.ro') || u.includes('imobiliare.ro')) return [
    'button[data-cy="phoneButton"]', 'button[data-cy="show-phone-number"]', 'button[data-testid="reveal-phone-button"]',
    'button[data-testid*="phone" i]', 'button[data-cy*="phone" i]', 'a[href^="tel:"]', ...generic,
  ];
  if (u.includes('publi24.ro') || u.includes('anuntul.ro')) return [
    'a.phone-link', 'a[href^="tel:"]', 'button[class*="phone" i]', 'button[id*="phone" i]', ...generic,
  ];
  return generic;
}

function extractPhonesFromPayload(markdown: string, html: string, rawHtml = '', jsonPayload: unknown = null): string[] {
  const telLinks = `${html}\n${rawHtml}`.match(/(?:tel:|callto:|whatsapp:\/\/send\?phone=)[^"'<>\s]+/gi)?.join(' ') ?? '';
  const jsonPhones = `${html}\n${rawHtml}`.match(/"(?:phone|telephone|phoneNumber|contactPhone|mobile|sellerPhone)"\s*:\s*"([^"]+)"/gi)?.join(' ') ?? '';
  return extractPhonesFromText(`${telLinks}\n${jsonPhones}\n${markdown}\n${html}\n${rawHtml}\n${JSON.stringify(jsonPayload ?? '')}`);
}

function legacyPhoneHydrationActions(url: string): any[] {
  const selectors = getPhoneSelectorsForUrl(url);
  const js = buildPhoneRevealJavascript(selectors);
  return [
    { type: 'wait', milliseconds: 2200 },
    { type: 'executeJavascript', script: js },
    { type: 'wait', milliseconds: 2200 },
    { type: 'scroll', direction: 'down', amount: 500 },
    { type: 'executeJavascript', script: js },
    { type: 'wait', milliseconds: 1600 },
  ];
}

function nativeClickPhoneHydrationActions(url: string): any[] {
  const actions: any[] = [
    { type: 'wait', milliseconds: 1800 },
    { type: 'click', selector: '#onetrust-accept-btn-handler' },
    { type: 'click', selector: 'button[data-testid="cookie-policy-banner-accept"]' },
    { type: 'wait', milliseconds: 500 },
    { type: 'scroll', direction: 'down', amount: 800 },
  ];
  for (const selector of getPhoneSelectorsForUrl(url).slice(0, 8)) actions.push({ type: 'click', selector });
  actions.push({ type: 'wait', milliseconds: 1600 });
  return actions;
}

function buildPhoneHydrationActions(url: string, mode: 'js' | 'native' = 'js') {
  return mode === 'native' ? nativeClickPhoneHydrationActions(url) : legacyPhoneHydrationActions(url);
}

function normalizeFirecrawlDoc(data: any) {
  const doc = data?.data ?? data;
  return {
    markdown: doc?.markdown ?? '',
    html: doc?.html ?? '',
    rawHtml: doc?.rawHtml ?? doc?.raw_html ?? '',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// FREE SCRAPING PATH — zero external API cost.
// Direct site search on OLX + DuckDuckGo + Bing HTML fallbacks. Phone
// hydration via plain fetch + regex. Firecrawl path stays opt-in only via
// SCRAPER_USE_FIRECRAWL=true.
// ────────────────────────────────────────────────────────────────────────────
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': BROWSER_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.6,en;q=0.4',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

async function fetchHtml(url: string, timeoutMs = 9000, referer?: string): Promise<{ ok: boolean; status: number; html: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { ...BROWSER_HEADERS };
    if (referer) headers['Referer'] = referer;
    const resp = await fetch(url, { signal: ctrl.signal, headers, redirect: 'follow' });
    const html = resp.ok ? await resp.text() : '';
    return { ok: resp.ok, status: resp.status, html };
  } catch (_e) {
    return { ok: false, status: 0, html: '' };
  } finally {
    clearTimeout(t);
  }
}

function stripQueryOperators(q: string): string {
  return q
    .replace(/site:\S+/gi, '')
    .replace(/inurl:\S+/gi, '')
    .replace(/intitle:\S+/gi, '')
    .replace(/-\S+/g, '')                 // -agentie, -inurl:...
    .replace(/[()"']+/g, ' ')             // strip parens & quotes
    .replace(/\bOR\b/gi, ' ')             // boolean OR
    .replace(/\s+/g, ' ')
    .trim();
}

// For free engines — short, simple keyword form. Long boolean queries return
// 0 hits on DDG/Bing/OLX-direct, so we trim to the most meaningful tokens.
function simplifyForFreeEngine(q: string, maxWords = 6): string {
  const cleaned = stripQueryOperators(q);
  const stop = new Set(['de', 'la', 'cu', 'in', 'în', 'pe', 'si', 'și', 'sau', 'a', 'al', 'ale']);
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1 && !stop.has(w.toLowerCase()));
  return words.slice(0, maxWords).join(' ').trim();
}

// For DDG/Bing we keep `site:` so results stay on-portal, but drop the noise.
function simplifyForWebEngine(q: string, maxWords = 6): string {
  const siteMatch = q.match(/site:\S+/i);
  const base = simplifyForFreeEngine(q, maxWords);
  return siteMatch ? `${base} ${siteMatch[0]}`.trim() : base;
}

function extractDomainFromSiteOperator(q: string): string | null {
  const m = q.match(/site:([a-z0-9.\-]+(?:\/[a-z0-9._\-/]*)?)/i);
  return m ? m[1].toLowerCase() : null;
}

function platformToDomain(platform: string, query: string): string | null {
  const fromQuery = extractDomainFromSiteOperator(query);
  if (fromQuery) return fromQuery;
  const p = (platform || '').toLowerCase();
  if (p.includes('olx')) return 'olx.ro';
  if (p.includes('storia')) return 'storia.ro';
  if (p.includes('imobiliare')) return 'imobiliare.ro';
  if (p.includes('publi24')) return 'publi24.ro';
  if (p.includes('bursa')) return 'bursaimobiliara.ro';
  if (p.includes('facebook')) return 'facebook.com';
  return null;
}

interface FreeResult { url: string; title?: string; markdown?: string; description?: string }

async function directOlxSearch(query: string, max: number): Promise<FreeResult[]> {
  const clean = simplifyForFreeEngine(query, 5);
  if (!clean) return [];
  const slug = clean.replace(/\s+/g, '-').toLowerCase();
  // private_business=1 filtrează direct anunțurile proprietarilor (fără agenții)
  // Probăm 2 pattern-uri URL OLX (categorie imobiliare + cautare globală) ca să prindem mai multe rezultate.
  const urls = [
    `https://www.olx.ro/d/imobiliare/q-${encodeURIComponent(slug)}/?search%5Bprivate_business%5D=1&search%5Border%5D=created_at:desc`,
    `https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/timisoara/q-${encodeURIComponent(slug)}/?search%5Bprivate_business%5D=1`,
  ];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    if (out.length >= max) break;
    const { ok, html } = await fetchHtml(url, 9000, 'https://www.olx.ro/');
    if (!ok || !html) continue;
    const re = /<a[^>]+href="(\/d\/oferta\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < max) {
      const href = `https://www.olx.ro${m[1]}`;
      if (seen.has(href)) continue;
      seen.add(href);
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (title) out.push({ url: href, title, markdown: title });
    }
  }
  return out;
}

// ── Direct scrapers pentru portalele mari (fără Google/DDG intermediar) ────
async function directStoriaSearch(query: string, max: number): Promise<FreeResult[]> {
  const clean = simplifyForFreeEngine(query, 5);
  if (!clean) return [];
  const slug = encodeURIComponent(clean.replace(/\s+/g, '-').toLowerCase());
  // ownerTypeSingleSelect=PRIVATE = anunțuri doar de la proprietari
  const url = `https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara?ownerTypeSingleSelect=PRIVATE&viewType=listing&searchingCriteria=${slug}`;
  const { ok, html } = await fetchHtml(url, 9000, 'https://www.storia.ro/');
  if (!ok || !html) return [];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="(\/ro\/oferta\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const href = `https://www.storia.ro${m[1]}`;
    if (seen.has(href)) continue;
    seen.add(href);
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    out.push({ url: href, title, markdown: title });
  }
  return out;
}

async function directImobiliareSearch(query: string, max: number): Promise<FreeResult[]> {
  const clean = simplifyForFreeEngine(query, 5);
  if (!clean) return [];
  // imobiliare.ro nu permite query params arbitrari pe URL public; folosim categoriile + persoane-fizice.
  const urls = [
    'https://www.imobiliare.ro/vanzare-apartamente/timisoara?id=88&tip_proprietar=persoana-fizica',
    'https://www.imobiliare.ro/inchirieri-apartamente/timisoara?id=88&tip_proprietar=persoana-fizica',
  ];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    if (out.length >= max) break;
    const { ok, html } = await fetchHtml(url, 9000, 'https://www.imobiliare.ro/');
    if (!ok || !html) continue;
    const re = /<a[^>]+href="(https?:\/\/www\.imobiliare\.ro\/[^"#?]*?-X[0-9A-Z]{6,12})"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < max) {
      const href = m[1];
      if (seen.has(href)) continue;
      seen.add(href);
      out.push({ url: href, title: 'imobiliare.ro listing', markdown: '' });
    }
  }
  return out;
}

async function directPubli24Search(query: string, max: number): Promise<FreeResult[]> {
  const clean = simplifyForFreeEngine(query, 4);
  if (!clean) return [];
  const slug = encodeURIComponent(clean.replace(/\s+/g, '+'));
  const url = `https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/timis/timisoara/?q=${slug}&tip_proprietar=proprietar`;
  const { ok, html } = await fetchHtml(url, 9000, 'https://www.publi24.ro/');
  if (!ok || !html) return [];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="(https?:\/\/www\.publi24\.ro\/anunturi\/[^"#?]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const href = m[1];
    if (seen.has(href) || !/\/[a-z0-9-]+-id\d+\.html/i.test(href)) continue;
    seen.add(href);
    out.push({ url: href, title: 'publi24 listing', markdown: '' });
  }
  return out;
}

async function duckduckgoSearch(query: string, max: number): Promise<FreeResult[]> {
  const simple = simplifyForWebEngine(query, 6) || query;
  const { ok, html } = await fetchHtml(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(simple)}`, 10000);
  if (!ok || !html) return [];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    let href = m[1];
    const wrap = href.match(/[?&]uddg=([^&]+)/);
    if (wrap) { try { href = decodeURIComponent(wrap[1]); } catch { /* keep */ } }
    if (seen.has(href) || !/^https?:\/\//i.test(href)) continue;
    seen.add(href);
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({ url: href, title, markdown: title });
  }
  return out;
}

async function bingSearch(query: string, max: number): Promise<FreeResult[]> {
  const simple = simplifyForWebEngine(query, 6) || query;
  const { ok, html } = await fetchHtml(`https://www.bing.com/search?q=${encodeURIComponent(simple)}&setlang=ro&cc=RO`, 10000);
  if (!ok || !html) return [];
  const out: FreeResult[] = [];
  const seen = new Set<string>();
  const re = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const href = m[1];
    if (seen.has(href) || !/^https?:\/\//i.test(href)) continue;
    seen.add(href);
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    out.push({ url: href, title, markdown: title });
  }
  return out;
}

export interface EngineStat { hits: number; urls: number; ms: number; errors: number; blocked: number }
export type EngineStats = Record<'olx_direct' | 'duckduckgo' | 'bing' | 'firecrawl', EngineStat>;
export interface BlockedAlert { platform: string; engine: string; reason: string; keyword: string }

export function emptyEngineStats(): EngineStats {
  return {
    olx_direct: { hits: 0, urls: 0, ms: 0, errors: 0, blocked: 0 },
    duckduckgo: { hits: 0, urls: 0, ms: 0, errors: 0, blocked: 0 },
    bing: { hits: 0, urls: 0, ms: 0, errors: 0, blocked: 0 },
    firecrawl: { hits: 0, urls: 0, ms: 0, errors: 0, blocked: 0 },
  };
}

async function freeSearchWithRetry(
  platform: string, query: string, maxResults: number,
  opts: {
    logger?: (ev: Record<string, unknown>) => void;
    stats?: EngineStats;
    blockedAlerts?: BlockedAlert[];
    skipBing?: boolean;  // circuit-breaker: caller disables Bing after N consecutive empties
  } = {},
): Promise<FcSearchOutcome> {
  const domain = platformToDomain(platform, query);
  const aggregated: FreeResult[] = [];
  const seen = new Set<string>();
  const pushAll = (arr: FreeResult[]) => {
    for (const r of arr) { if (r.url && !seen.has(r.url)) { seen.add(r.url); aggregated.push(r); } }
  };
  const stats = opts.stats;
  const blocked = opts.blockedAlerts;
  const kwShort = query.slice(0, 80);

  let attempts = 0;
  let primarySource: FcSearchOutcome['source'] = 'none';

  // ── Direct portal scrapers (no Google intermediary). Mapăm domeniul → scraperul potrivit.
  const directScrapers: { name: string; key: keyof EngineStats; match: (d: string) => boolean; run: () => Promise<FreeResult[]> }[] = [
    { name: 'olx_direct',         key: 'olx_direct', match: (d) => d.includes('olx.ro'),        run: () => directOlxSearch(query, maxResults) },
    { name: 'storia_direct',      key: 'olx_direct', match: (d) => d.includes('storia.ro'),     run: () => directStoriaSearch(query, maxResults) },
    { name: 'imobiliare_direct',  key: 'olx_direct', match: (d) => d.includes('imobiliare.ro'), run: () => directImobiliareSearch(query, maxResults) },
    { name: 'publi24_direct',     key: 'olx_direct', match: (d) => d.includes('publi24.ro'),    run: () => directPubli24Search(query, maxResults) },
  ];
  const directHit = domain ? directScrapers.find((s) => s.match(domain)) : null;
  if (directHit) {
    attempts++;
    const t0 = Date.now();
    try {
      const direct = await directHit.run();
      const dt = Date.now() - t0;
      if (stats) { stats.olx_direct.hits++; stats.olx_direct.ms += dt; stats.olx_direct.urls += direct.length; }
      opts.logger?.({ kind: `free_${directHit.name}`, platform, results: direct.length, ms: dt });
      if (direct.length > 0) { pushAll(direct); primarySource = 'free_direct'; }
      else if (stats && blocked) {
        stats.olx_direct.blocked++;
        blocked.push({ platform, engine: directHit.name, reason: '0 carduri (probabil anti-bot/HTML schimbat)', keyword: kwShort });
      }
    } catch (e) {
      if (stats) { stats.olx_direct.hits++; stats.olx_direct.errors++; stats.olx_direct.ms += Date.now() - t0; }
      opts.logger?.({ kind: `free_${directHit.name}_error`, platform, message: (e as Error).message });
    }
  }

  if (aggregated.length < maxResults) {
    attempts++;
    const t0 = Date.now();
    try {
      const ddg = await duckduckgoSearch(query, maxResults);
      const dt = Date.now() - t0;
      if (stats) { stats.duckduckgo.hits++; stats.duckduckgo.ms += dt; stats.duckduckgo.urls += ddg.length; }
      opts.logger?.({ kind: 'free_ddg', platform, results: ddg.length, ms: dt });
      pushAll(ddg);
      if (primarySource === 'none' && ddg.length > 0) primarySource = 'fallback_duckduckgo';
      else if (ddg.length === 0 && stats && blocked) {
        stats.duckduckgo.blocked++;
      }
    } catch (e) {
      if (stats) { stats.duckduckgo.hits++; stats.duckduckgo.errors++; stats.duckduckgo.ms += Date.now() - t0; }
      opts.logger?.({ kind: 'free_ddg_error', platform, message: (e as Error).message });
    }
  }

  if (!opts.skipBing && aggregated.length < Math.min(3, maxResults)) {
    attempts++;
    const t0 = Date.now();
    try {
      const bing = await bingSearch(query, maxResults);
      const dt = Date.now() - t0;
      if (stats) { stats.bing.hits++; stats.bing.ms += dt; stats.bing.urls += bing.length; }
      opts.logger?.({ kind: 'free_bing', platform, results: bing.length, ms: dt });
      pushAll(bing);
      if (primarySource === 'none' && bing.length > 0) primarySource = 'fallback_bing';
      else if (bing.length === 0 && stats) { stats.bing.blocked++; }
    } catch (e) {
      if (stats) { stats.bing.hits++; stats.bing.errors++; stats.bing.ms += Date.now() - t0; }
      opts.logger?.({ kind: 'free_bing_error', platform, message: (e as Error).message });
    }
  }

  let filtered = aggregated;
  if (domain) {
    const host = domain.split('/')[0];
    const matches = aggregated.filter((r) => {
      try { return new URL(r.url).hostname.toLowerCase().endsWith(host); } catch { return false; }
    });
    if (matches.length > 0) filtered = matches;
  }

  return {
    ok: filtered.length > 0,
    results: filtered.slice(0, maxResults),
    attempts,
    source: filtered.length > 0 ? primarySource : 'none',
    errorMessage: filtered.length === 0 ? 'no results across free engines (ddg/bing/olx-direct)' : undefined,
  };
}

async function freeHydratePhoneFromUrl(url: string): Promise<string | null> {
  try {
    const referer = (() => { try { return new URL(url).origin + '/'; } catch { return undefined; } })();
    const { ok, html } = await fetchHtml(url, 9000, referer);
    if (!ok || !html) return null;
    const phones = extractPhonesFromPayload('', html, html, null);
    return phones[0] ?? null;
  } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────────────
// Firecrawl search with exponential backoff + basic DuckDuckGo fallback.
// Opt-in only via SCRAPER_USE_FIRECRAWL=true. Retries only on transient
// signals (network/408/429/5xx); hard errors (401/402/400) return immediately.
// ────────────────────────────────────────────────────────────────────────────
const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

interface FcSearchResult { url: string; title?: string; markdown?: string; description?: string }
interface FcSearchOutcome {
  ok: boolean;
  results: FcSearchResult[];
  status?: number;
  errorBody?: string;
  errorMessage?: string;
  attempts: number;
  source: 'firecrawl' | 'fallback_duckduckgo' | 'fallback_bing' | 'free_direct' | 'none';
}

async function firecrawlSearchOnce(query: string, key: string, maxResults: number, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query, limit: maxResults, lang: 'ro', country: 'ro',
        scrapeOptions: { formats: ['markdown'] },
      }),
    });
    return resp;
  } finally { clearTimeout(timer); }
}

async function basicFallbackSearch(query: string, maxResults: number): Promise<FcSearchResult[]> {
  // DuckDuckGo HTML endpoint — no JS, no API key. Best-effort: returns plain URLs/titles.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.5',
      },
    });
    clearTimeout(t);
    if (!resp.ok) return [];
    const html = await resp.text();
    const out: FcSearchResult[] = [];
    // Capture result anchors: <a class="result__a" href="...">Title</a>
    const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < maxResults) {
      let href = m[1];
      // DuckDuckGo wraps in /l/?uddg=ENCODED
      const wrap = href.match(/[?&]uddg=([^&]+)/);
      if (wrap) { try { href = decodeURIComponent(wrap[1]); } catch { /* keep */ } }
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      if (/^https?:\/\//i.test(href)) out.push({ url: href, title, markdown: title });
    }
    return out;
  } catch (e) {
    console.warn(JSON.stringify({ kind: 'fallback_search_error', message: (e as Error).message }));
    return [];
  }
}

async function firecrawlSearchWithRetry(
  query: string, key: string, maxResults: number,
  opts: { maxAttempts?: number; timeoutMs?: number; logger?: (ev: Record<string, unknown>) => void } = {},
): Promise<FcSearchOutcome> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const timeoutMs = opts.timeoutMs ?? 35000;
  let lastStatus: number | undefined;
  let lastBody = '';
  let lastMsg = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await firecrawlSearchOnce(query, key, maxResults, timeoutMs);
      lastStatus = resp.status;
      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        return {
          ok: true,
          results: (json?.data || []) as FcSearchResult[],
          attempts: attempt,
          source: 'firecrawl',
        };
      }
      lastBody = await resp.text().catch(() => '');
      lastMsg = `Firecrawl HTTP ${resp.status}`;
      opts.logger?.({ kind: 'firecrawl_attempt_failed', attempt, status: resp.status, body: lastBody.slice(0, 200), query: query.slice(0, 120) });
      // Hard failures — break immediately, hand off to fallback / surface error
      if (!TRANSIENT_HTTP.has(resp.status)) break;
    } catch (e) {
      lastMsg = (e as Error)?.message || String(e);
      opts.logger?.({ kind: 'firecrawl_attempt_exception', attempt, message: lastMsg, query: query.slice(0, 120) });
      // network / abort — treat as transient
    }
    if (attempt < maxAttempts) {
      const delay = Math.min(9000, 1000 * Math.pow(3, attempt - 1)) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Attempt fallback when Firecrawl is fully unusable (key/quota/persistent failure)
  const shouldFallback = lastStatus === 401 || lastStatus === 402 || lastStatus === undefined ||
    (typeof lastStatus === 'number' && TRANSIENT_HTTP.has(lastStatus));
  if (shouldFallback) {
    opts.logger?.({ kind: 'firecrawl_fallback_invoked', last_status: lastStatus, query: query.slice(0, 120) });
    const fallback = await basicFallbackSearch(query, maxResults);
    if (fallback.length > 0) {
      return { ok: true, results: fallback, attempts: maxAttempts, source: 'fallback_duckduckgo', status: lastStatus, errorMessage: lastMsg };
    }
  }

  return {
    ok: false, results: [], attempts: maxAttempts, source: 'none',
    status: lastStatus, errorBody: lastBody, errorMessage: lastMsg,
  };
}

async function scrapePhoneHydrationOnce(url: string, firecrawlKey: string, mode: 'js' | 'native'): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), mode === 'native' ? 7000 : 9000);
  try {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html', 'rawHtml'],
        onlyMainContent: false,
        waitFor: mode === 'native' ? 1200 : 1800,
        timeout: mode === 'native' ? 6500 : 8500,
        maxAge: 0,
        proxy: 'stealth',
        actions: buildPhoneHydrationActions(url, mode),
        location: { country: 'RO', languages: ['ro'] },
        headers: {
          'User-Agent': PHONE_HYDRATION_USER_AGENT,
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.5',
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn(`Phone hydration ${mode} failed for ${url}: ${data?.error || res.status}`);
      return [];
    }
    const { markdown, html, rawHtml } = normalizeFirecrawlDoc(data);
    return extractPhonesFromPayload(markdown, html, rawHtml, data);
  } catch (e) {
    console.warn(`Phone hydration ${mode} exception for ${url}:`, e instanceof Error ? e.message : String(e));
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function hydratePhoneFromListingUrl(url: string, firecrawlKey: string): Promise<string | null> {
  for (const mode of ['js', 'native'] as const) {
    const phones = await scrapePhoneHydrationOnce(url, firecrawlKey, mode);
    if (phones.length > 0) return phones[0];
  }
  return null;
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
  'agentie imobiliara', 'agenție imobiliară', 'agent imobiliar', 'consultant imobiliar',
  'broker imobiliar', 'brokeraj imobiliar', 'reprezentant vanzari', 'reprezentant vânzări',
  'comision agentie', 'comision agenție', 'comision cumparator', 'comision cumpărător',
  'imobiliare srl', 'real estate srl',
];

const MARKETPLACE_DOMAINS = new Set([
  'olx.ro', 'www.olx.ro', 'storia.ro', 'www.storia.ro', 'imobiliare.ro', 'www.imobiliare.ro',
  'publi24.ro', 'www.publi24.ro', 'bursaimobiliara.ro', 'www.bursaimobiliara.ro',
]);

const GENERIC_LISTING_TITLE_SIGNALS = [
  'anunturi gratuite', 'anunturi imobiliare', 'anunturi olx', 'imobiliare olx',
  'second hand si noi', 'apartamente de vanzare in', 'apartamente de vânzare în',
  'apartamente 1 camera de', 'apartamente 1 cameră de', 'apartamente 2 camere de',
  'apartamente 3 camere de', 'apartamente 4 camere de',
  'apartamente noi de vanzare', 'apartamente noi de vânzare', 'apartamente de inchiriat',
  'apartamente de închiriat', 'garsoniere de vanzare', 'garsoniere de vânzare',
  'proprietati noi', 'proprietăți noi', 'pagina ', 'rezultate vanzare', 'rezultate vânzare',
  'wikipedia', 'archives', 'tag:', '- forum', 'pdf', '[pdf]', 'hotararea', 'hcl ',
  'lista de', 'arhiva', 'top ', 'guide', 'ghid ', 'știri', 'stiri ', 'news',
];

// Domains that NEVER contain individual real-estate offers — instant reject.
const FORBIDDEN_DOMAINS = [
  'wikipedia.org', 'wikimedia.org',
  // News / blogs / portals (no individual ads)
  'tion.ro', 'libertatea.ro', 'opiniatimisoarei.ro', 'ziuadevest.ro',
  'stiridetimisoara.ro', 'tucamaria.ro', 'pressalert.ro', 'renasterea.ro',
  'banatulazi.ro', 'expressdebanat.ro', 'timisplus.ro', 'expressdetimisoara.ro',
  'agerpres.ro', 'digi24.ro', 'adevarul.ro', 'gandul.ro', 'hotnews.ro',
  'g4media.ro', 'mediafax.ro', 'prahova-online.ro', 'monitorulexpres.ro',
  // Official / institutional
  'hcl.civicul.ro', 'civicul.ro', 'gov.ro', 'just.ro', 'monitoruloficial.ro',
  'primariatm.ro', 'cjtimis.ro',
  // Generic aggregators / SEO spam / dating spam
  'casaldaritanatura.pt', 'flatspotter.com', 'timisoreni.ro',
  'saint-gobain.ro', 'infinity-skyline.ro', 'ateneo.ro',
  // Facebook group / marketplace INDEX pages (individual posts have /posts/ or /permalink/)
  // We allow /marketplace/item/ and /groups/*/posts/ but block index/landing pages
];

function isGenericSearchPage(url: string | null | undefined, title: string | null | undefined): boolean {
  const rawUrl = String(url || '');
  const u = rawUrl.toLowerCase().split('?')[0];
  const t = removeDiacritics(String(title || '').toLowerCase());

  // 0. Reject by file extension (PDFs, docs, archives are never live ads)
  if (/\.(pdf|docx?|xlsx?|zip|rar)(\?|$)/i.test(u)) return true;

  // 1. Reject forbidden domains outright
  const host = extractUrlDomain(rawUrl) || '';
  if (FORBIDDEN_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) return true;

  // 2. Facebook group/marketplace INDEX (no specific post/item ID) → reject
  if (/facebook\.com\/(groups\/\d+\/?$|marketplace\/\d+\/?$|marketplace\/[a-z]+\/?$)/i.test(u)) return true;
  if (/facebook\.com\/groups\/[^/]+\/?$/i.test(u)) return true;
  if (/facebook\.com\/marketplace\/[^/]+\/(propertyforsale|propertyforrent)\/?$/i.test(u)) return true;

  // 3. Allow recognized individual-ad URL patterns
  const isIndividualAd =
    u.includes('/d/oferta/') ||
    /storia\.ro\/ro\/oferta\//.test(u) ||
    /imobiliare\.ro\/oferta-/.test(u) ||
    /imobiliare\.ro\/[^/]+\/[^/]+\/[a-z0-9]{6,}/i.test(rawUrl) ||
    /publi24\.ro\/anunturi\//.test(u) ||
    /bursaimobiliara\.ro\/.+\/[a-z0-9-]+-\d+\.html/.test(u) ||
    /lajumate\.ro\/ad\//.test(u) ||
    /facebook\.com\/marketplace\/item\/\d+/i.test(u) ||
    /facebook\.com\/groups\/[^/]+\/(posts|permalink)\/\d+/i.test(u);
  if (isIndividualAd) return false;

  // 4. Reject only when URL/title *actively* signals a category/search page.
  //    (Previously we default-rejected any unknown-shape URL — that killed
  //    ~50% of real leads from small platforms & FB posts. Owner-signal +
  //    phone hydration downstream will filter false-positives.)
  const hasCategoryShape =
    u.includes('/q-') || /\/q-[^/]+\/?$/.test(u) ||
    /olx\.ro\/imobiliare(\/|$)/.test(u) ||
    /imobiliare\.ro\/(vanzare|inchirieri)-[^/]+\/?$/.test(u) ||
    /storia\.ro\/ro\/rezultate\//.test(u) ||
    /imoradar24\.ro\/(apartamente|garsoniere|case|terenuri)-de-(vanzare|inchiriat)\//.test(u) ||
    /renaissanceestate\.ro\/apartamente-de-vanzare\//.test(u) ||
    (/\/(apartamente|garsoniere|case)-de-(vanzare|inchiriat)(\/|$)/.test(u) && !/\/anunt\//.test(u));
  const hasGenericTitle =
    GENERIC_LISTING_TITLE_SIGNALS.some((signal) => t.includes(removeDiacritics(signal.toLowerCase()))) ||
    t.endsWith('- olx.ro') ||
    t.endsWith('• olx.ro') ||
    t.endsWith(' storia.ro');
  return hasCategoryShape || hasGenericTitle;
}

function hasExplicitOwnerSignal(title: string | null | undefined, url: string | null | undefined, markdown: string | null | undefined): boolean {
  const blob = removeDiacritics(`${title || ''} ${markdown || ''}`.toLowerCase());
  return OWNER_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

function hasAgencySignal(title: string | null | undefined, url: string | null | undefined, markdown: string | null | undefined): boolean {
  const host = extractUrlDomain(url);
  const blob = removeDiacritics(`${title || ''} ${(markdown || '').substring(0, 2500)}`.toLowerCase());
  if (host && MARKETPLACE_DOMAINS.has(host)) return AGENCY_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
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

  // Contact — scan the whole scraped body, not only explicit "telefon:" labels.
  const contactPhone = extractPhonesFromText(text)[0] ?? null;

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
    // FREE MODE by default — zero external API cost. Firecrawl is opt-in
    // and only used if SCRAPER_USE_FIRECRAWL=true AND a key is configured,
    // OR if the caller explicitly passes scan_mode='firecrawl'/'auto'.
    const envUseFirecrawl = (Deno.env.get('SCRAPER_USE_FIRECRAWL') || '').toLowerCase() === 'true';
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional params
    let maxResults = 10;
    let customQuery: string | null = null;
    let onlyNewSources = false;
    let preserveAgencyFilter = true;
    let discoveryMode = false;
    // Cap queries per invocation — 78 active keywords × ~15s/Firecrawl >> 150s
    // edge budget, which caused "Scanează acum" to hang silently. Manual scans
    // process a rotated slice; full coverage comes from repeated cron runs.
    let queryLimit = 25;
    let jobId: string | null = null;
    let asyncMode = false;
    let retryBatches: Array<{ platform: string; query: string }> | null = null;
    let scanModeOverride: 'free' | 'firecrawl' | 'auto' | null = null;
    let autoFallbackOpt = true;
    let autoFallbackThreshold = 1; // min URLs to consider "enough" — below this, escalate to Firecrawl
    try {
      const body = await req.json();
      if (body?.max_results) maxResults = Math.min(body.max_results, 30);
      if (body?.custom_query) customQuery = body.custom_query;
      onlyNewSources = body?.only_new_sources === true;
      preserveAgencyFilter = body?.preserve_agency_filter !== false;
      discoveryMode = body?.discovery_mode === true;
      if (typeof body?.query_limit === 'number') {
        queryLimit = Math.min(Math.max(1, Math.floor(body.query_limit)), 100);
      }
      if (typeof body?.job_id === 'string' && body.job_id.length > 0) jobId = body.job_id;
      if (body?.async_mode === true) asyncMode = true;
      if (Array.isArray(body?.retry_batches)) {
        retryBatches = body.retry_batches
          .filter((b: any) => b && typeof b.platform === 'string' && typeof b.query === 'string')
          .slice(0, 30);
      }
      if (body?.scan_mode === 'free' || body?.scan_mode === 'firecrawl' || body?.scan_mode === 'auto') {
        scanModeOverride = body.scan_mode;
      }
      if (body?.auto_fallback === false) autoFallbackOpt = false;
      if (typeof body?.auto_fallback_threshold === 'number') {
        autoFallbackThreshold = Math.min(Math.max(0, Math.floor(body.auto_fallback_threshold)), 20);
      }
    } catch { /* no body */ }


    // Resolve effective scan mode (UI override > env default > free)
    const scanMode: 'free' | 'firecrawl' =
      scanModeOverride === 'firecrawl' && firecrawlKey ? 'firecrawl'
      : scanModeOverride === 'free' ? 'free'
      : scanModeOverride === 'auto' ? 'free'  // 'auto' = start free, escalate per-query
      : envUseFirecrawl && firecrawlKey ? 'firecrawl' : 'free';
    const enableAutoFallback =
      autoFallbackOpt && !!firecrawlKey && scanMode === 'free' &&
      (scanModeOverride === 'auto' || scanModeOverride === 'free' || !scanModeOverride);
    console.log(`🔎 scrape-prospects scan_mode=${scanMode} override=${scanModeOverride ?? 'none'} auto_fallback=${enableAutoFallback}`);

    // Per-scan engine telemetry + alerts + in-session keyword dedupe
    const engineStats = emptyEngineStats();
    const blockedAlerts: BlockedAlert[] = [];
    const sessionSeen = new Set<string>();
    let sessionDedupedSkipped = 0;
    // Auto-disable Firecrawl for the rest of the scan when it returns 402
    // (insufficient credits) or other hard-fail codes — saves seconds per query.
    let firecrawlDisabled = false;


    // ── Structured logging helpers (Sentry-friendly) ─────────────────────
    function logScrapeError(
      where: string,
      err: unknown,
      ctx: Record<string, unknown> = {},
    ) {
      const e = err instanceof Error ? err : new Error(String(err));
      // Structured single-line log → easy to forward to Sentry/Logflare.
      console.error(JSON.stringify({
        kind: 'scrape_prospects_error',
        where,
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 5).join(' | '),
        job_id: jobId,
        ...ctx,
      }));
    }

    const jobErrors: Array<Record<string, unknown>> = [];
    async function updateJob(patch: Record<string, unknown>) {
      if (!jobId) return;
      try {
        await supabase.from('prospect_scan_jobs').update(patch).eq('id', jobId);
      } catch (e) {
        console.warn('updateJob failed', (e as Error).message);
      }
    }

    const results: any[] = [];
    const errors: string[] = [];
    let blacklistedSkipped = 0;
    let blacklistedReviewed = 0;
    let archivedSkipped = 0;
    // ── Split diagnostics: where exactly leads die (so admin sees the real funnel)
    let genericPageSkipped = 0;
    let noOwnerSignalSkipped = 0;
    let geoFilterSkipped = 0;
    let agencySignalSkipped = 0;
    let duplicateSkipped = 0;
    let timedOut = false;
    // ── Bing circuit-breaker (in-session): kills the engine after N consecutive 0-result hits
    let bingConsecutiveEmpty = 0;
    const BING_CIRCUIT_LIMIT = 3;
    const scanStartedAt = Date.now();
    const MAX_BACKGROUND_RUNTIME_MS = 50_000;
    const markTimedOut = async (processed: number, total: number) => {
      timedOut = true;
      const remaining = (queries ?? []).slice(processed).map((q) => ({ platform: q.platform, query: q.query }));
      const message = `Scanarea a fost oprită automat după ${Math.round((Date.now() - scanStartedAt) / 1000)}s ca să nu rămână blocată. Repornește scanarea pentru restul cuvintelor.`;
      jobErrors.push({ phase: 'runtime_guard', message, retryable: true, processed, total, remaining: remaining.length });
      await updateJob({
        status: 'failed',
        finished_at: new Date().toISOString(),
        processed_queries: processed,
        current_keyword: null,
        current_platform: null,
        new_listings: results.length,
        archived_skipped: archivedSkipped,
        duplicate_skipped: duplicateSkipped,
        blacklisted_skipped: blacklistedSkipped,
        error_message: message,
        errors: jobErrors,
        pending_queries: remaining,
      });
    };
    const existingUrls = new Set<string>();
    const blockedPhones = new Set<string>();
    const blockedDomains = new Set<string>();
    const whitelistedPhones = new Set<string>();
    const whitelistedDomains = new Set<string>();

    // ── Spam-shield permissive mode (global flag) ────────────────────────
    let permissiveSpamShield = false;
    try {
      const { data: settingsRow } = await supabase
        .from('site_settings')
        .select('spam_shield_permissive_mode')
        .limit(1)
        .maybeSingle();
      permissiveSpamShield = !!settingsRow?.spam_shield_permissive_mode;
      if (permissiveSpamShield) {
        console.log('🛡️ Spam shield: PERMISSIVE MODE active — suspect leads pass through tagged as suspect_spam.');
      }
    } catch (e) {
      console.warn('Could not read spam_shield_permissive_mode, defaulting to strict.', e);
    }


    // Load keywords from DB, fallback to hardcoded defaults
    // `originalKeyword` = cuvântul exact din DB; folosit pentru `record_keyword_outcome` (auto-improvement).
    let queries: { platform: string; query: string; originalKeyword?: string; ownerFilters?: { toggles?: string[]; text?: string; url_hint?: string } }[];
    if (retryBatches && retryBatches.length > 0) {
      // Retry path — use the exact failed batches verbatim, skip expansion/owner filter.
      queries = retryBatches.map((b) => ({ platform: b.platform, query: b.query, originalKeyword: b.query }));
      console.log(`Retry mode: re-running ${queries.length} failed batches`);
    } else if (customQuery) {
      queries = [{ platform: 'Custom', query: customQuery, originalKeyword: customQuery }];
    } else {
      const { data: dbKeywords } = await supabase
        .from('scraper_search_keywords')
        .select('keyword, platform, owner_filters, consecutive_zero, success_count, last_success_at')
        .eq('is_active', true);
      // Auto-park keywords with 12+ consecutive zeros so they stop burning
      // budget every scan. Admin can re-enable manually from the UI.
      const toAutoPark = (dbKeywords || []).filter((k: any) => (k.consecutive_zero ?? 0) >= 12);
      if (toAutoPark.length > 0) {
        const ids = toAutoPark.map((k: any) => k.keyword);
        await supabase
          .from('scraper_search_keywords')
          .update({ is_active: false, auto_disabled_reason: 'auto_park_12_consecutive_zero' })
          .in('keyword', ids);
        console.log(`⏸️ Auto-parked ${toAutoPark.length} dead keywords (12+ consecutive zeros)`);
      }
      const usable = (dbKeywords || []).filter((k: any) => (k.consecutive_zero ?? 0) < 8);
      // Sort: proven winners first (highest success), so a truncated run still yields.
      usable.sort((a: any, b: any) => {
        const sa = (a.success_count ?? 0) - (a.consecutive_zero ?? 0);
        const sb = (b.success_count ?? 0) - (b.consecutive_zero ?? 0);
        return sb - sa;
      });
      queries = (usable.length > 0)
        ? usable.map((k: any) => ({
            platform: k.platform,
            query: k.keyword,
            originalKeyword: k.keyword,
            ownerFilters: (k.owner_filters && typeof k.owner_filters === 'object') ? k.owner_filters : undefined,
          }))
        : DEFAULT_SEARCH_QUERIES.map((q) => ({ ...q, originalKeyword: q.query }));
    }

    if (!retryBatches) {
      // Expand keywords with diacritics-free variants for fuzzy matching
      // Păstrăm originalKeyword pe toate variantele expandate ca tracking-ul să ajungă la rândul corect.
      const expanded = expandKeywordsWithoutDiacritics(queries);
      queries = expanded.map((q, idx) => ({
        ...q,
        originalKeyword: (q as any).originalKeyword ?? queries[Math.min(idx, queries.length - 1)]?.originalKeyword,
      }));

      // Default path stays owner-focused. Keyword Radar can use discovery mode
      // for broader URL discovery, then agency/geo gates keep the queue clean.
      queries = queries.map((q) => ({
        platform: q.platform,
        originalKeyword: q.originalKeyword,
        query: discoveryMode ? q.query.trim() : applyOwnerOnlyFilter(q.platform, q.query, q.ownerFilters),
      }));
      // Rotate + slice to fit within edge-function runtime
      if (!customQuery && queries.length > queryLimit) {
        for (let k = queries.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          [queries[k], queries[j]] = [queries[j], queries[k]];
        }
        queries = queries.slice(0, queryLimit);
      }
    }
    console.log(`Expanded to ${queries.length} ${discoveryMode ? 'discovery' : 'owner-only'} search queries (cap=${queryLimit})`);

    // Initial job state (best-effort)
    await updateJob({
      status: 'running',
      started_at: new Date().toISOString(),
      total_queries: queries.length,
      processed_queries: 0,
    });

    // Wrap the heavy work so we can fire-and-forget under async mode.
    const runScan = async () => {
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
          if (domain && !MARKETPLACE_DOMAINS.has(domain)) blockedDomains.add(domain);
        }
      }
      for (const row of prospectRows || []) {
        if (row.source_url) existingUrls.add(row.source_url);
        if (row.prospect_type === 'agentie' || row.is_active === false) {
          const phone = normalizeRoPhone(row.phone_normalized || row.contact_phone);
          const domain = extractUrlDomain(row.source_url);
          if (phone) blockedPhones.add(phone);
          if (domain && !MARKETPLACE_DOMAINS.has(domain)) blockedDomains.add(domain);
        }
      }
      for (const row of blockRows || []) {
        const phone = normalizeRoPhone(row.phone_normalized);
        if (phone) blockedPhones.add(phone);
        if (row.domain && !MARKETPLACE_DOMAINS.has(row.domain)) blockedDomains.add(row.domain);
      }
      for (const row of whitelistRows || []) {
        const phone = normalizeRoPhone(row.phone_normalized);
        if (phone) whitelistedPhones.add(phone);
        if (row.domain) whitelistedDomains.add(row.domain);
      }
    }

    // ── Preload phone_intelligence blacklist once (kills N+1 in inner loop) ─
    const phoneIntelBlacklist = new Set<string>();
    try {
      const { data: blRows } = await supabase
        .from('phone_intelligence')
        .select('phone_number')
        .eq('is_blacklisted', true);
      for (const r of blRows || []) {
        if (r.phone_number) phoneIntelBlacklist.add(String(r.phone_number));
      }
      console.log(`📞 Preloaded ${phoneIntelBlacklist.size} blacklisted phones`);
    } catch (e) {
      console.warn('phone_intelligence preload failed', (e as Error).message);
    }

    // Parallelize free-engine batches (separate hosts → no shared quota).
    // Manual single-query stays at 1; cron sweeps run 4-wide.
    const BATCH_SIZE = customQuery ? 1 : 4;
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      if (Date.now() - scanStartedAt > MAX_BACKGROUND_RUNTIME_MS) {
        await markTimedOut(i, queries.length);
        break;
      }
      const batch = queries.slice(i, i + BATCH_SIZE);

      // ── progress update (best-effort) ────────────────────────────────
      await updateJob({
        processed_queries: i,
        current_keyword: batch[0]?.query?.slice(0, 200) ?? null,
        current_platform: batch[0]?.platform ?? null,
        new_listings: results.length,
        archived_skipped: archivedSkipped,
        duplicate_skipped: duplicateSkipped,
        blacklisted_skipped: blacklistedSkipped,
        result: {
          partial: true,
          scan_mode: scanMode,
          auto_fallback_enabled: enableAutoFallback, auto_fallback_threshold: autoFallbackThreshold,
          engine_stats: engineStats,
          blocked_alerts: blockedAlerts.slice(-20),
          session_deduped: sessionDedupedSkipped,
        },
      });


      
      const batchPromises = batch.map(async ({ platform, query, originalKeyword }) => {
        // ── In-session dedupe: skip if same (platform,query) was already scanned
        //    in this invocation (saves network + dedup before DB layer).
        const dedupeKey = `${platform.toLowerCase()}|${(query || '').toLowerCase().trim()}`;
        if (sessionSeen.has(dedupeKey)) {
          sessionDedupedSkipped++;
          console.log(`[session-dedupe] skipping repeated ${dedupeKey}`);
          return;
        }
        sessionSeen.add(dedupeKey);

        console.log(`Searching ${platform}: ${query}`);
        try {
          const bingHitsBefore = engineStats.bing.hits;
          const bingUrlsBefore = engineStats.bing.urls;
          let outcome = scanMode === 'firecrawl'
            ? await (async () => {
                const t0 = Date.now();
                engineStats.firecrawl.hits++;
                const res = await firecrawlSearchWithRetry(query, firecrawlKey, maxResults, {
                  maxAttempts: 2, timeoutMs: 11_000,
                  logger: (ev) => console.warn(JSON.stringify({ ...ev, platform })),
                });
                engineStats.firecrawl.ms += Date.now() - t0;
                if (res.ok) engineStats.firecrawl.urls += res.results.length;
                else engineStats.firecrawl.errors++;
                return res;
              })()
            : await freeSearchWithRetry(platform, query, maxResults, {
                logger: (ev) => console.warn(JSON.stringify({ ...ev, platform })),
                stats: engineStats,
                blockedAlerts,
                skipBing: bingConsecutiveEmpty >= BING_CIRCUIT_LIMIT,
              });

          // Bing circuit-breaker bookkeeping (track per-query delta).
          if (scanMode !== 'firecrawl') {
            const bingCalled = engineStats.bing.hits > bingHitsBefore;
            const bingProduced = engineStats.bing.urls > bingUrlsBefore;
            if (bingCalled) {
              if (bingProduced) bingConsecutiveEmpty = 0;
              else bingConsecutiveEmpty++;
              if (bingConsecutiveEmpty === BING_CIRCUIT_LIMIT) {
                console.warn(`🔌 Bing circuit-breaker OPEN after ${BING_CIRCUIT_LIMIT} empty hits — skipping for rest of scan.`);
              }
            }
          }


          // ── Auto-fallback: if FREE mode returned fewer than `autoFallbackThreshold`
          //    URLs (or failed) and Firecrawl is available + enabled, retry this
          //    single query via Firecrawl.
          const freeUrlCount = outcome.ok ? outcome.results.length : 0;
          const belowThreshold = freeUrlCount < autoFallbackThreshold;
          if (belowThreshold && enableAutoFallback && firecrawlKey && !firecrawlDisabled) {
            const t0 = Date.now();
            engineStats.firecrawl.hits++;
            const fc = await firecrawlSearchWithRetry(query, firecrawlKey, maxResults, {
              maxAttempts: 2, timeoutMs: 11_000,
              logger: (ev) => console.warn(JSON.stringify({ ...ev, platform, auto_fallback: true, threshold: autoFallbackThreshold, free_urls: freeUrlCount })),
            });
            engineStats.firecrawl.ms += Date.now() - t0;
            if (fc.ok && fc.results.length > 0) {
              engineStats.firecrawl.urls += fc.results.length;
              outcome = fc;
              console.log(`[auto-fallback] firecrawl rescued ${platform} [${query.slice(0, 60)}] free=${freeUrlCount}<${autoFallbackThreshold} → ${fc.results.length} URL`);
            } else {
              engineStats.firecrawl.errors++;
              if (fc.status === 402 || fc.status === 401 || fc.status === 403) {
                firecrawlDisabled = true;
                console.warn(`[auto-fallback] firecrawl disabled for rest of scan (status=${fc.status})`);
              }
            }
          }


          if (!outcome.ok) {
            const msg = `${outcome.errorMessage || 'search failed'} (after ${outcome.attempts} attempts, mode=${scanMode}${enableAutoFallback ? '+autofallback' : ''})`;
            logScrapeError('search_http', new Error(msg), {
              platform, keyword: query, http_status: outcome.status, attempts: outcome.attempts, scan_mode: scanMode,
            });
            jobErrors.push({
              platform, keyword: query, http_status: outcome.status ?? null,
              message: msg, phase: `${scanMode}_search`, retryable: true, attempts: outcome.attempts,
            });
            errors.push(`${platform} [${query.slice(0, 60)}]: ${msg}`);
            // Auto-improve: înregistrează 0 rezultate pentru cuvântul original (15 consecutiv → auto-disable)
            try {
              const { error: rpcErr } = await supabase.rpc('record_keyword_outcome', {
                _platform: platform ?? '',
                _keyword: originalKeyword ?? query,
                _found: 0,
              });
              if (rpcErr) console.warn(`[auto-improve-fail] ${rpcErr.message} | plat="${platform}" key="${(originalKeyword ?? query).slice(0,60)}"`);
              else console.log(`[auto-improve] fail tracked: plat="${platform}" key="${(originalKeyword ?? query).slice(0,60)}"`);
            } catch (e) { console.warn(`[auto-improve-exc] ${(e as Error).message}`); }
            return;
          }
          // Auto-improve: înregistrează succesul (resetează contorul de eșecuri)
          try {
            const { error: rpcErr } = await supabase.rpc('record_keyword_outcome', {
              _platform: platform ?? '',
              _keyword: originalKeyword ?? query,
              _found: outcome.results.length,
            });
            if (rpcErr) console.warn(`[auto-improve-fail] ${rpcErr.message}`);
            else console.log(`[auto-improve] success tracked: ${outcome.results.length} urls`);
          } catch (e) { console.warn(`[auto-improve-exc] ${(e as Error).message}`); }


          if (outcome.source !== 'firecrawl' && outcome.source !== 'free_direct') {
            console.warn(JSON.stringify({
              kind: 'search_fallback_used', platform, keyword: query.slice(0, 120),
              source: outcome.source, results: outcome.results.length, last_status: outcome.status,
            }));
          }

          const searchResults = outcome.results;
          console.log(`Found ${searchResults.length} results from ${platform} (source=${outcome.source}, mode=${scanMode})`);

          for (const result of searchResults) {
            if (Date.now() - scanStartedAt > MAX_BACKGROUND_RUNTIME_MS) {
              await markTimedOut(Math.min(i + BATCH_SIZE, queries.length), queries.length);
              return;
            }
            const url = result.url;
            if (!url) continue;

            const markdown = result.markdown || result.description || '';
            if (isGenericSearchPage(url, result.title || '')) {
              genericPageSkipped++;
              archivedSkipped++;
              continue;
            }

            const explicitOwnerSignal = hasExplicitOwnerSignal(result.title || '', url, markdown);
            const ownerFilterIntent = hasOwnerFilterIntent(query, url);
            if (!explicitOwnerSignal && !ownerFilterIntent && !discoveryMode) {
              noOwnerSignalSkipped++;
              archivedSkipped++;
              continue;
            }

            if (hasAgencySignal(result.title || '', url, markdown)) {
              agencySignalSkipped++;
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
            const phoneFromSearchPayload = normalizeRoPhone(extracted.contactPhone) ??
              extractPhonesFromText(`${markdown}\n${result.title || ''}\n${result.description || ''}`).find(Boolean) ??
              null;
            const canHydratePhone = Date.now() - scanStartedAt < MAX_BACKGROUND_RUNTIME_MS - 12_000;
            const hydrate = scanMode === 'firecrawl'
              ? () => hydratePhoneFromListingUrl(url, firecrawlKey)
              : () => freeHydratePhoneFromUrl(url);
            extracted.contactPhone = phoneFromSearchPayload || (canHydratePhone ? await hydrate() : null);

            let price = extracted.price;
            if (price && extracted.currency === 'RON') {
              price = Math.round(price * 0.2);
            }

            const size = extracted.size;
            const pricePerSqm = (price && size && size > 0) ? Math.round(price / size) : null;

            const locationText = extracted.location || result.title || '';
            const zone = detectZone(locationText + ' ' + (result.title || ''));
            const features = extracted.features;

            // ───── HARD GEO FILTER (Timișoara only) ─────
            // URL-first check (path tokens carry the city deterministically),
            // then text body with strict word boundaries on city names so
            // "Calea Aradului" (Timișoara street) doesn't get blocked by "arad".
            const urlPath = (url || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const textBlob = (
              (result.title || '') + ' ' +
              (markdown || '').substring(0, 2000) + ' ' +
              (locationText || '')
            ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const fullBlob = urlPath + ' ' + textBlob;

            // Timișoara positive signals (URL token, text token, postal code, or known zone)
            const hasTimisoaraToken =
              /\btimi(s|soara|s-|soara-)/i.test(fullBlob) ||
              /\bjud(\.|etul)?[-\s]?timis\b/i.test(fullBlob) ||
              /\b30\d{4}\b/.test(fullBlob) ||  // strict TM zip (5 digits after "30")
              zone !== null;

            // Forbidden cities — strict word boundaries; "aradului" is OK (TM street).
            const FORBIDDEN_CITY_RE = /\b(bucuresti|sector\s*-?[1-6]|pipera|cluj-?napoca|cluj24|fagaras|sibiu|oradea|brasov|iasi|constanta|ploiesti|gura\s*vaii|arad(?!ului))\b/i;
            const hasForbiddenGeo = FORBIDDEN_CITY_RE.test(fullBlob);

            if (!hasTimisoaraToken || hasForbiddenGeo) {
              geoFilterSkipped++;
              archivedSkipped++;
              console.log(`Geo-filter rejected ${url} (timisoara=${hasTimisoaraToken}, forbidden=${hasForbiddenGeo})`);
              continue;
            }


            const { score, breakdown } = scoreListing({
              zone, size, rooms: extracted.rooms, price, pricePerSqm,
              floor: extracted.floor, yearBuilt: extracted.yearBuilt, features,
            });

            // Detect intent from listing text AND from the originating search query.
            // - `hotelier` = short-term-rental / regim hotelier owner → RECRUITMENT target for Andrei
            //   (NEVER auto-published as a listing on realtrust.ro).
            // - `inchiriere` = classic monthly rental owner → also RECRUITMENT (Andrei pitches management).
            // - `vanzare` = sale → eligible for auto-publish pipeline.
            const blob = `${extracted.title || ''} ${result.title || ''} ${query || ''}`.toLowerCase();
            const isHotelier = /(regim\s*hotelier|short[-\s]?term|nightly|pe\s*noapte|airbnb|booking\.com|cazare\s*timisoara|cazare\s*timi[șs]oara)/i.test(blob);
            const isRental = !isHotelier && /(inchiriere|închiriere|chirie|de\s*inchiriat|de\s*închiriat)/i.test(blob);
            const category: 'hotelier' | 'inchiriere' | 'vanzare' =
              isHotelier ? 'hotelier' : isRental ? 'inchiriere' : 'vanzare';

            let monthlyExtra: number | null = null;
            let extraProfit3Y: number | null = null;

            if ((isRental || isHotelier) && price) {
              // For rentals, price is monthly rent; estimate STR uplift ~70%
              monthlyExtra = Math.round(price * 0.7);
              extraProfit3Y = monthlyExtra * 36;
            } else if (!isRental && !isHotelier && price && size) {
              // For sales, estimate monthly rental income based on price/sqm
              const estimatedMonthlyRent = Math.round(price * 0.004); // ~0.4% of price
              monthlyExtra = Math.round(estimatedMonthlyRent * 0.7);
              extraProfit3Y = monthlyExtra * 36;
            }

            // Check phone blacklist
            let skipBlacklist = false;
            let blacklistReason: string | null = null;
            if (extracted.contactPhone) {
              const normalizedPhone = normalizeRoPhone(extracted.contactPhone);
              if (preserveAgencyFilter && normalizedPhone && blockedPhones.has(normalizedPhone) && !whitelistedPhones.has(normalizedPhone)) {
                skipBlacklist = true;
                blacklistReason = 'agency_blocklist_phone';
              }
              // Use preloaded set — eliminates per-result DB roundtrip (was N+1).
              if (phoneIntelBlacklist.has(extracted.contactPhone) || (normalizedPhone && phoneIntelBlacklist.has(normalizedPhone))) {
                skipBlacklist = true;
                blacklistReason = blacklistReason || 'phone_intelligence_blacklist';
              }
            }

            // In strict mode, drop suspect leads. In permissive mode, let them
            // through tagged as `suspect_spam` with lifecycle_status='to_review'
            // so admins can manually approve via the Rescue Log UI.
            const suspectSpam = skipBlacklist && permissiveSpamShield;
            if (skipBlacklist && !permissiveSpamShield) {
              blacklistedSkipped++;
              continue;
            }
            if (suspectSpam) {
              blacklistedReviewed++;
            }

            const baseTags = [
              'scrape-prospects',
              category === 'vanzare' ? 'auto-import' : 'recrutare-management',
              category === 'hotelier' ? 'regim-hotelier' : null,
              category === 'inchiriere' ? 'inchiriere-proprietar' : null,
              explicitOwnerSignal ? 'semnal-proprietar' : discoveryMode ? 'descoperire-broad' : 'filtru-proprietari',
              suspectSpam ? 'suspect_spam' : null,
            ].filter(Boolean) as string[];

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
                  discovery_mode: discoveryMode,
                  owner_filter_intent: ownerFilterIntent,
                  explicit_owner_signal: explicitOwnerSignal,
                  estimated_monthly_extra: monthlyExtra,
                  estimated_extra_profit_3y: extraProfit3Y,
                  spam_shield_permissive: permissiveSpamShield,
                  suspect_spam: suspectSpam,
                },
                status: 'new',
                prospect_type: 'proprietar',
                category,
                lifecycle_status: suspectSpam ? 'to_review' : 'new',
                is_active: true,
                last_failure_reason: blacklistReason,
                search_keywords: [query],
                tags: baseTags,
                admin_notes: suspectSpam
                  ? `⚠️ SUSPECT SPAM (mod permisiv activ) — motiv: ${blacklistReason}. Necesită aprobare manuală din Rescue Log înainte de rutare la Andrei.`
                  : category !== 'vanzare'
                    ? `Prospect ${category === 'hotelier' ? 'regim hotelier' : 'închiriere'} de la proprietar — NU se publică pe site. Lead pentru Andrei: propunere administrare ${category === 'hotelier' ? 'regim hotelier' : 'totală/parțială'}.`
                    : explicitOwnerSignal
                      ? 'Import automat: semnal explicit proprietar/persoană fizică.'
                    : discoveryMode
                      ? 'Import automat: descoperire broad din marketplace; fără semnal de agenție, necesită verificare rapidă înainte de publicare.'
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
          logScrapeError('platform_loop', err, { platform, keyword: query });
          jobErrors.push({
            platform, keyword: query, message: String(err?.message ?? err),
            phase: 'platform_loop',
          });
          errors.push(`${platform} [${(query || '').slice(0, 60)}]: ${err.message}`);
        }
      });

      await Promise.all(batchPromises);
      if (timedOut) break;
      // No inter-batch sleep: free engines hit different hosts, no shared quota.
    }

    const payload = {
      success: true,
      scan_mode: scanMode,
      scan_mode_override: scanModeOverride,
      auto_fallback_enabled: enableAutoFallback, auto_fallback_threshold: autoFallbackThreshold,
      new_listings: results.length,
      count: results.length,
      blacklisted_skipped: blacklistedSkipped,
      blacklisted_reviewed: blacklistedReviewed,
      spam_shield_permissive_mode: permissiveSpamShield,
      discovery_mode: discoveryMode,
      archived_skipped: archivedSkipped,
      duplicate_skipped: duplicateSkipped,
      // ── Granular funnel diagnostics (where leads die) ─────
      funnel_breakdown: {
        generic_page: genericPageSkipped,
        no_owner_signal: noOwnerSignalSkipped,
        agency_signal: agencySignalSkipped,
        geo_filter: geoFilterSkipped,
        duplicate: duplicateSkipped,
        blacklisted: blacklistedSkipped,
        session_deduped: sessionDedupedSkipped,
        accepted: results.length,
      },
      bing_circuit_open: bingConsecutiveEmpty >= BING_CIRCUIT_LIMIT,
      existing_sources_checked: existingUrls.size,
      session_deduped_skipped: sessionDedupedSkipped,
      engine_stats: engineStats,
      blocked_alerts: blockedAlerts,
      agency_filter: {
        blocked_phones: blockedPhones.size,
        blocked_domains: blockedDomains.size,
        whitelisted_phones: whitelistedPhones.size,
        whitelisted_domains: whitelistedDomains.size,
      },
      listings: results,
      errors: errors.length > 0 ? errors : undefined,
    };

    return payload;
    }; // ── end runScan ──

    if (asyncMode && jobId) {
      // Fire-and-forget; UI polls the job row for progress.
      // @ts-ignore — EdgeRuntime is a Deno Deploy global.
      (globalThis as any).EdgeRuntime?.waitUntil?.((async () => {
        try {
          const payload = await runScan();
          if (timedOut) return;
          await updateJob({
            status: 'completed',
            finished_at: new Date().toISOString(),
            processed_queries: queries.length,
            current_keyword: null,
            current_platform: null,
            new_listings: payload.new_listings ?? 0,
            archived_skipped: payload.archived_skipped ?? 0,
            duplicate_skipped: payload.duplicate_skipped ?? 0,
            blacklisted_skipped: payload.blacklisted_skipped ?? 0,
            errors: jobErrors,
            result: payload,
          });
        } catch (e) {
          logScrapeError('async_runScan', e, { phase: 'async_root' });
          await updateJob({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_message: (e as Error)?.message ?? String(e),
            errors: jobErrors,
          });
        }
      })());
      return new Response(
        JSON.stringify({
          success: true,
          accepted: true,
          job_id: jobId,
          total_queries: queries.length,
          message: 'Scan started in background',
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sync mode
    const syncPayload = await runScan();
    if (jobId) {
      await updateJob({
        status: 'completed',
        finished_at: new Date().toISOString(),
        processed_queries: queries.length,
        new_listings: syncPayload.new_listings ?? 0,
        archived_skipped: syncPayload.archived_skipped ?? 0,
        duplicate_skipped: syncPayload.duplicate_skipped ?? 0,
        blacklisted_skipped: syncPayload.blacklisted_skipped ?? 0,
        errors: jobErrors,
        result: syncPayload,
      });
    }
    return new Response(
      JSON.stringify(syncPayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(JSON.stringify({
      kind: 'scrape_prospects_error',
      where: 'outer_handler',
      message: error?.message ?? String(error),
      stack: error?.stack?.split('\n').slice(0, 5).join(' | '),
    }));
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
