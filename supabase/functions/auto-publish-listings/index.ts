/**
 * auto-publish-listings — premium scraper → site-injector pipeline.
 *
 * Flow per run:
 *   1. Pull eligible rows from `prospect_listings` (score ≥ MIN_SCORE,
 *      not already imported, in Timișoara, has source_url).
 *   2. For each: deep-scrape with Firecrawl to get full description + images.
 *   3. Run shared sanitizer:
 *        – strip phones, emails, addresses, forbidden phrases.
 *        – if refusal phrase ("nu colaborez cu agenții") → REJECT.
 *   4. Optionally rewrite with Lovable AI Gateway for premium copy.
 *   5. Insert into `properties` as DRAFT (is_active=false, needs_review=true).
 *   6. Mark prospect as `imported_to_site`.
 *
 * Designed to be idempotent: dedupes on `original_source_url`.
 *
 * Auth: requires admin JWT OR `x-cron-secret` header matching SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadImportConfig, sanitizeListingText } from "../_shared/listingSanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_SCORE = 55;
const DEFAULT_BATCH = 8;
const MAX_BATCH = 25;

interface RunSummary {
  candidates: number;
  scraped: number;
  rejected_refusal: number;
  rejected_no_content: number;
  rejected_duplicate: number;
  rejected_error: number;
  published: number;
  errors: string[];
  published_ids: string[];
}

function slugify(s: string): string {
  return (s || 'anunt-importat')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80) || `import-${Date.now()}`;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (cronSecret && serviceKey && cronSecret === serviceKey) return true;

  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: u } = await userClient.auth.getUser(token);
  if (!u?.user) return false;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: roleRow } = await admin
    .from('user_roles').select('role')
    .eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
  return Boolean(roleRow);
}

async function firecrawlScrape(url: string, key: string): Promise<{ markdown: string; images: string[] } | null> {
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown', 'links'], waitFor: 3000, onlyMainContent: true }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const md = data?.data?.markdown || data?.markdown || '';
    const links: string[] = data?.data?.links || [];
    const images = links.filter((l) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(l));
    // Also pull images from markdown
    const mdImgs: string[] = [];
    const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = re.exec(md)) !== null) { if (!mdImgs.includes(m[1])) mdImgs.push(m[1]); }
    return { markdown: md, images: Array.from(new Set([...images, ...mdImgs])).slice(0, 25) };
  } catch (err) {
    console.error('firecrawlScrape error:', err);
    return null;
  }
}

async function rewriteWithAI(title: string, sanitized: string, listingType: string): Promise<{ title?: string; short?: string; full?: string } | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || !sanitized || sanitized.length < 80) return null;
  try {
    const prompt = `Ești copywriter imobiliar premium pentru RealTrust (agenție din Timișoara). 
Rescrie descrierea de mai jos pentru un anunț de ${listingType === 'inchiriere' ? 'închiriere' : 'vânzare'}.
REGULI STRICTE:
- NU include numere de telefon, emailuri, adrese exacte cu număr stradal.
- NU folosi cuvinte ca "proprietar", "persoană fizică", "fără comision", "comision 0", "direct proprietar".
- Folosește limbaj profesional de agenție, cu accent pe avantaje și investiție.
- Răspunde STRICT în formatul: ---TITLU---\\n[titlu]\\n---SCURT---\\n[descriere scurtă <200 char]\\n---COMPLET---\\n[descriere completă markdown]

TITLU ORIGINAL: ${title}
DESCRIERE: ${sanitized.substring(0, 3000)}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content || '';
    const t = text.match(/---TITLU---\s*([\s\S]*?)\s*---SCURT---/)?.[1]?.trim();
    const s = text.match(/---SCURT---\s*([\s\S]*?)\s*---COMPLET---/)?.[1]?.trim();
    const f = text.match(/---COMPLET---\s*([\s\S]*)$/)?.[1]?.trim();
    return { title: t, short: s, full: f };
  } catch (err) {
    console.error('rewriteWithAI error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let batchSize = DEFAULT_BATCH;
  let minScore = MIN_SCORE;
  let useAiRewrite = true;
  let triggeredBy = 'manual_admin';
  try {
    const body = await req.json();
    if (typeof body?.batch_size === 'number') batchSize = Math.min(Math.max(body.batch_size, 1), MAX_BATCH);
    if (typeof body?.min_score === 'number') minScore = body.min_score;
    if (body?.use_ai_rewrite === false) useAiRewrite = false;
    if (typeof body?.triggered_by === 'string') triggeredBy = body.triggered_by;
  } catch { /* no body */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const summary: RunSummary = {
    candidates: 0, scraped: 0,
    rejected_refusal: 0, rejected_no_content: 0,
    rejected_duplicate: 0, rejected_error: 0,
    published: 0, errors: [], published_ids: [],
  };

  // Load sanitizer config once
  const config = await loadImportConfig(supabase);

  // 1. Pick candidates that are NOT already imported.
  const { data: alreadyImported } = await supabase
    .from('properties')
    .select('original_source_url')
    .not('original_source_url', 'is', null);
  const importedSet = new Set((alreadyImported || []).map((r: any) => r.original_source_url));

  const { data: candidates, error: cErr } = await supabase
    .from('prospect_listings')
    .select('id, source_url, title, description, location, zone, rooms, size, price, currency, floor, year_built, features, images, category, source_platform')
    .gte('lead_score', minScore)
    .eq('is_active', true)
    .eq('prospect_type', 'proprietar')
    .not('source_url', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(batchSize * 3);
  if (cErr) {
    return new Response(JSON.stringify({ error: cErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const queue = (candidates || []).filter((c: any) => !importedSet.has(c.source_url)).slice(0, batchSize);
  summary.candidates = queue.length;

  for (const prospect of queue) {
    try {
      // Deep scrape
      const scrape = await firecrawlScrape(prospect.source_url, firecrawlKey);
      summary.scraped++;
      const rawMd = scrape?.markdown || prospect.description || '';
      const rawImages = (scrape?.images && scrape.images.length > 0)
        ? scrape.images
        : (Array.isArray(prospect.images) ? prospect.images : []);

      if (!rawMd || rawMd.length < 60) {
        summary.rejected_no_content++;
        continue;
      }

      // Sanitize
      const cleanDesc = sanitizeListingText(rawMd, config);
      const cleanTitle = sanitizeListingText(prospect.title || 'Anunț Imobiliar', config);

      if (cleanDesc.refusalDetected || cleanTitle.refusalDetected) {
        summary.rejected_refusal++;
        // Mark prospect so we never retry it
        await supabase.from('prospect_listings')
          .update({
            admin_notes: `[auto-publish] Refuzat: refusal phrase = "${cleanDesc.refusalMatch || cleanTitle.refusalMatch}"`,
            tags: ['scrape-prospects', 'auto-import', 'no-agency-refusal'],
          }).eq('id', prospect.id);
        continue;
      }

      // Optional AI rewrite for premium copy
      let finalTitle = cleanTitle.sanitized || 'Anunț Imobiliar Timișoara';
      let finalShort = cleanDesc.sanitized.substring(0, 220);
      let finalFull = cleanDesc.sanitized;

      if (useAiRewrite) {
        const ai = await rewriteWithAI(finalTitle, finalFull, prospect.category || 'vanzare');
        if (ai?.title) finalTitle = sanitizeListingText(ai.title, config).sanitized || finalTitle;
        if (ai?.short) finalShort = sanitizeListingText(ai.short, config).sanitized || finalShort;
        if (ai?.full) finalFull = sanitizeListingText(ai.full, config).sanitized || finalFull;
      }

      const listingType = prospect.category === 'inchiriere' ? 'inchiriere'
        : prospect.category === 'hotelier' ? 'cazare' : 'vanzare';

      const propertyData: Record<string, any> = {
        name: finalTitle.substring(0, 200),
        slug: `${slugify(finalTitle)}-${prospect.id.substring(0, 6)}`,
        location: prospect.zone ? `${prospect.zone}, Timișoara` : (prospect.location || 'Timișoara'),
        description_ro: finalShort,
        long_description_ro: finalFull,
        description_en: '',
        long_description_en: '',
        features: Array.isArray(prospect.features) ? prospect.features : [],
        listing_type: listingType,
        tag: listingType === 'vanzare' ? 'De Vânzare' : listingType === 'inchiriere' ? 'De Închiriat' : 'Disponibil',
        is_active: false,
        needs_review: true,
        import_source: triggeredBy,
        imported_at: new Date().toISOString(),
        original_source_url: prospect.source_url,
        original_description_raw: rawMd.substring(0, 8000),
        sanitization_log: {
          removed_phones: cleanDesc.removed.phones.length + cleanTitle.removed.phones.length,
          removed_emails: cleanDesc.removed.emails.length + cleanTitle.removed.emails.length,
          removed_addresses: cleanDesc.removed.addresses.length,
          removed_phrases: Array.from(new Set([...cleanDesc.removed.phrases, ...cleanTitle.removed.phrases])),
          ai_rewritten: useAiRewrite,
          source_platform: prospect.source_platform,
        },
        migrated_from_prospect_id: prospect.id,
        rooms: prospect.rooms,
        bedrooms: prospect.rooms,
        size: prospect.size,
        capacity: prospect.rooms ? prospect.rooms * 2 : 2,
        bathrooms: 1,
        floor: prospect.floor,
        year_built: prospect.year_built,
        base_price_per_night: listingType === 'vanzare' ? null : prospect.price,
        capital_necesar: listingType === 'vanzare' ? prospect.price : null,
        images: rawImages,
        booking_url: null,
        source_platform: prospect.source_platform,
        source_url: null, // intentionally hidden from public
      };

      const { data: inserted, error: insErr } = await supabase
        .from('properties')
        .insert(propertyData)
        .select('id, slug, name')
        .single();

      if (insErr) {
        if ((insErr.message || '').toLowerCase().includes('duplicate')) {
          summary.rejected_duplicate++;
        } else {
          summary.rejected_error++;
          summary.errors.push(`prospect ${prospect.id}: ${insErr.message}`);
        }
        continue;
      }

      summary.published++;
      summary.published_ids.push(inserted.id);

      // Mark prospect as imported
      await supabase.from('prospect_listings')
        .update({
          tags: ['scrape-prospects', 'auto-import', 'site-published'],
          admin_notes: `[auto-publish] Publicat ca proprietate ${inserted.id} (draft, needs review).`,
        }).eq('id', prospect.id);
    } catch (err: any) {
      summary.rejected_error++;
      summary.errors.push(`prospect ${prospect.id}: ${err.message || String(err)}`);
    }
  }

  // Log run
  try {
    await supabase.rpc('automation_complete_run', {
      _job_key: 'auto-publish-listings',
      _success: true,
      _payload: summary as any,
      _triggered_by: triggeredBy,
    });
  } catch { /* table may not require */ }

  return new Response(JSON.stringify({ success: true, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
