/**
 * auto-publish-listings — premium scraper → site-injector pipeline (v2: self-healing).
 *
 * Flow per run:
 *   1. Load sanitizer config + auto-learned forbidden phrases.
 *   2. Skip prospects from source_platforms currently auto-disabled.
 *   3. Deep-scrape each candidate with Firecrawl.
 *   4. Sanitize, compute heuristic quality_score (0-100).
 *   5. Reject if refusal phrase OR quality < MIN_QUALITY.
 *   6. Inject "lessons learned" hints into AI rewrite prompt.
 *   7. Insert as DRAFT, mark prospect imported, increment source health published.
 *   8. Write a metrics row + per_source breakdown for self-heal to consume.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadImportConfig, sanitizeListingText, type ImportConfigRow } from "../_shared/listingSanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_SCORE = 55;
const DEFAULT_BATCH = 4; // keep under edge CPU limit when AI rewrite is enabled
const MAX_BATCH = 25;
const MIN_QUALITY = 35; // below this we don't even publish a draft

interface RunSummary {
  candidates: number;
  scraped: number;
  rejected_refusal: number;
  rejected_no_content: number;
  rejected_duplicate: number;
  rejected_error: number;
  rejected_low_quality: number;
  rejected_source_disabled: number;
  rejected_recruitment: number;
  rejected_no_images: number;
  published: number;
  avg_quality_score: number;
  per_source: Record<string, { attempts: number; published: number; rejected: number; avg_quality: number }>;
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

  // Server-to-server (orchestrator/cron) call: Bearer = service role key
  if (token && serviceKey && token === serviceKey) return true;

  // Fallback: vault-stored cron secrets (allows pg_cron to authenticate even when
  // the platform service-role key has been rotated and the SUPABASE_SERVICE_ROLE_KEY
  // env var no longer matches the value embedded in the cron job command).
  if (cronSecret || token) {
    try {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: vaultRows } = await (admin as any)
        .schema('vault')
        .from('decrypted_secrets')
        .select('name, decrypted_secret')
        .in('name', ['cron_reconcile_secret', 'email_queue_service_role_key']);
      const allowed = new Set<string>((vaultRows || []).map((r: any) => r.decrypted_secret).filter(Boolean));
      if (cronSecret && allowed.has(cronSecret)) return true;
      if (token && allowed.has(token)) return true;
    } catch (e) {
      console.warn('Vault fallback auth check failed:', (e as Error)?.message);
    }
  }

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

type FirecrawlOutcome =
  | { ok: true; markdown: string; images: string[]; attempts: number }
  | { ok: false; kind: 'timeout' | 'http_refuse' | 'firecrawl_error' | 'net_error'; status?: number; message?: string; attempts: number };

async function firecrawlScrapeOnce(url: string, key: string, timeoutMs: number): Promise<FirecrawlOutcome> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown', 'html', 'links'], waitFor: 2000, onlyMainContent: false, timeout: 18000 }),
      signal: ctl.signal,
    });
    if (!resp.ok) {
      // 4xx => upstream site refusal / auth / not-found (do NOT retry); 5xx / 429 => firecrawl-side, retryable
      const isClient = resp.status >= 400 && resp.status < 500 && resp.status !== 429;
      return { ok: false, kind: isClient ? 'http_refuse' : 'firecrawl_error', status: resp.status, message: `HTTP ${resp.status}`, attempts: 1 };
    }
    const data = await resp.json();
    const md = data?.data?.markdown || data?.markdown || '';
    const html = data?.data?.html || data?.html || '';
    const meta = data?.data?.metadata || data?.metadata || {};
    const links: string[] = data?.data?.links || [];
    const images = links.filter((l) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(l));
    const mdImgs: string[] = [];
    const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = re.exec(md)) !== null) { if (!mdImgs.includes(m[1])) mdImgs.push(m[1]); }
    const htmlImgs: string[] = [];
    const pushImg = (raw?: string) => {
      if (!raw || raw.startsWith('data:')) return;
      const first = raw.split(',')[0]?.trim().split(/\s+/)[0];
      if (!first) return;
      try { htmlImgs.push(new URL(first, url).toString()); } catch { /* ignore invalid */ }
    };
    for (const rx of [
      /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi,
      /<source[^>]+srcset=["']([^"']+)["']/gi,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    ]) {
      while ((m = rx.exec(html)) !== null) pushImg(m[1]);
    }
    pushImg(meta?.ogImage || meta?.image);
    return { ok: true, markdown: md, images: Array.from(new Set([...images, ...mdImgs, ...htmlImgs])).slice(0, 25), attempts: 1 };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { ok: false, kind: 'timeout', message: `timeout ${timeoutMs}ms`, attempts: 1 };
    return { ok: false, kind: 'net_error', message: err?.message || String(err), attempts: 1 };
  } finally {
    clearTimeout(to);
  }
}

/** Retry with exponential backoff (1s, 3s). Differentiates HTTP refusal (no retry),
 *  Firecrawl 5xx/429 (retry), network errors (retry), and timeouts (1 retry only). */
async function firecrawlScrape(url: string, key: string, timeoutMs = 22000): Promise<{ markdown: string; images: string[] } | null> {
  const backoffs = [0, 1000, 3000];
  let lastFail: FirecrawlOutcome | null = null;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await new Promise((r) => setTimeout(r, backoffs[attempt]));
    const r = await firecrawlScrapeOnce(url, key, timeoutMs);
    if (r.ok) {
      if (attempt > 0) console.log(`[fc:ok-retry] ${url} (attempt ${attempt + 1})`);
      return { markdown: r.markdown, images: r.images };
    }
    lastFail = { ...r, attempts: attempt + 1 };
    if (r.kind === 'http_refuse') { console.warn(`[fc:http-refuse] ${url} status=${r.status} (no retry)`); break; }
    if (r.kind === 'timeout' && attempt >= 1) { console.warn(`[fc:timeout] ${url} (gave up after ${attempt + 1})`); break; }
    console.warn(`[fc:${r.kind}] ${url} ${r.message || ''} (attempt ${attempt + 1})`);
  }
  if (lastFail && !lastFail.ok) console.error(`[fc:fail] ${url} kind=${lastFail.kind} attempts=${lastFail.attempts}`);
  return null;
}

/** PostgrestFilterBuilder is thenable but has no `.catch` — wrap any rpc() that we want to fire-and-forget. */
async function safeRpc(p: PromiseLike<any>): Promise<void> {
  try { await p; } catch (e: any) { console.warn('rpc swallowed:', e?.message || e); }
}


/**
 * Heuristic quality score 0–100. Lower bound triggers low-quality rejection,
 * higher score → less likely to need admin edits. Self-heal tunes the floor.
 */
function computeQualityScore(opts: {
  finalDesc: string;
  finalTitle: string;
  imageCount: number;
  hasPrice: boolean;
  hasZone: boolean;
  hasRooms: boolean;
  hasSize: boolean;
  removedPhrasesCount: number;
  removedPhonesCount: number;
}): number {
  let score = 0;
  // content depth
  if (opts.finalDesc.length >= 800) score += 25;
  else if (opts.finalDesc.length >= 400) score += 18;
  else if (opts.finalDesc.length >= 200) score += 10;
  else score += 2;
  // title quality
  if (opts.finalTitle.length >= 30 && opts.finalTitle.length <= 90) score += 10;
  else if (opts.finalTitle.length >= 15) score += 5;
  // imagery
  if (opts.imageCount >= 6) score += 20;
  else if (opts.imageCount >= 3) score += 12;
  else if (opts.imageCount >= 1) score += 5;
  // structured facts
  if (opts.hasPrice) score += 12;
  if (opts.hasZone) score += 8;
  if (opts.hasRooms) score += 6;
  if (opts.hasSize) score += 6;
  // penalty: too much sanitization noise → likely owner-direct ad
  score -= Math.min(20, opts.removedPhrasesCount * 4);
  score -= Math.min(10, opts.removedPhonesCount * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function loadActiveLearnings(supabase: any): Promise<{ forbidden: string[]; hints: string[]; semantic_count: number }> {
  const { data } = await supabase
    .from('listing_import_learnings')
    .select('pattern_type, pattern, metadata')
    .eq('is_active', true)
    .limit(300);
  const forbidden: string[] = [];
  const hints: string[] = [];
  let semantic_count = 0;
  for (const r of (data || []) as Array<{ pattern_type: string; pattern: string; metadata?: any }>) {
    if (r.pattern_type === 'phrase') forbidden.push(r.pattern);
    else if (r.pattern_type === 'title_hint' || r.pattern_type === 'description_hint') hints.push(r.pattern);
    else if (r.pattern_type === 'semantic_concept') {
      semantic_count++;
      const variants: string[] = Array.isArray(r.metadata?.variants) ? r.metadata.variants : [];
      for (const v of variants) forbidden.push(v);
      if (r.metadata?.description_hint) hints.push(r.metadata.description_hint);
    }
  }
  return { forbidden, hints, semantic_count };
}

async function loadCompiledPrompt(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('listing_import_system_prompts')
    .select('compiled_prompt')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { compiled_prompt?: string } | null)?.compiled_prompt || null;
}

async function loadDisabledSources(supabase: any): Promise<Set<string>> {
  const { data } = await supabase
    .from('listing_import_source_health')
    .select('source_platform, auto_disabled_until')
    .not('auto_disabled_until', 'is', null);
  const now = Date.now();
  const disabled = new Set<string>();
  for (const r of (data || []) as Array<{ source_platform: string; auto_disabled_until: string }>) {
    if (r.auto_disabled_until && new Date(r.auto_disabled_until).getTime() > now) {
      disabled.add(r.source_platform);
    }
  }
  return disabled;
}

async function rewriteWithAI(
  title: string,
  sanitized: string,
  listingType: string,
  hints: string[],
  compiledPrompt: string | null,
): Promise<{ title?: string; short?: string; full?: string } | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || !sanitized || sanitized.length < 80) return null;
  try {
    const hintBlock = hints.length > 0
      ? `\nLECȚII ÎNVĂȚATE DIN CORECȚIILE ADMINULUI (aplică automat):\n- ${hints.slice(0, 12).join('\n- ')}\n`
      : '';
    const systemPrompt = compiledPrompt || `Ești copywriter imobiliar premium pentru RealTrust (agenție din Timișoara).
REGULI STRICTE:
- NU include numere de telefon, emailuri, adrese exacte cu număr stradal.
- NU folosi: "proprietar", "persoană fizică", "fără comision", "comision 0", "direct proprietar".
- Limbaj profesional de agenție, accent pe avantaje și potențial de investiție.`;
    const userPrompt = `Rescrie descrierea pentru un anunț de ${listingType === 'inchiriere' ? 'închiriere' : 'vânzare'}.
Răspunde STRICT în formatul: ---TITLU---\\n[titlu]\\n---SCURT---\\n[descriere scurtă <200 char]\\n---COMPLET---\\n[descriere completă markdown]
${hintBlock}
TITLU ORIGINAL: ${title}
DESCRIERE: ${sanitized.substring(0, 3000)}`;

    // Retry with exponential backoff: 3 attempts (2s, 5s, 10s)
    const RETRY_DELAYS = [2000, 5000, 10000];
    let resp: Response | null = null;
    let lastErr = '';
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        console.log(`[gemini-retry] attempt ${attempt + 1} after ${RETRY_DELAYS[attempt - 1]}ms (prev: ${lastErr})`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 25000);
        resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: ctl.signal,
        });
        clearTimeout(to);
        if (resp.ok) break;
        // Retry only on transient errors (429/5xx); bail on 4xx auth/validation
        if (resp.status !== 429 && resp.status < 500) {
          lastErr = `http_${resp.status}`;
          break;
        }
        lastErr = `http_${resp.status}`;
      } catch (e: any) {
        lastErr = e?.name === 'AbortError' ? 'timeout' : String(e?.message || e);
      }
    }
    if (!resp || !resp.ok) {
      console.warn(`[gemini-retry] gave up: ${lastErr}`);
      return null;
    }

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

  // Top-level safety net: ANY uncaught error must return 200 with success:false
  // so the automation dashboard doesn't enter critical-alert state on transient
  // network/timeout issues. Self-heal cron retries every 5 min.
  const safeJson = (payload: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
  if (!(await isAuthorized(req))) {
    return safeJson({ success: false, error: 'Unauthorized', fallback: false }, 401);
  }

  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) {
    return safeJson({ success: false, error: 'FIRECRAWL_API_KEY not configured', fallback: true });
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

  const t0 = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const summary: RunSummary = {
    candidates: 0, scraped: 0,
    rejected_refusal: 0, rejected_no_content: 0,
    rejected_duplicate: 0, rejected_error: 0,
    rejected_low_quality: 0, rejected_source_disabled: 0,
    rejected_recruitment: 0, rejected_no_images: 0,
    published: 0, avg_quality_score: 0,
    per_source: {}, errors: [], published_ids: [],
  };

  // Load config + learnings + disabled sources
  const baseConfig = await loadImportConfig(supabase);
  const learnings = await loadActiveLearnings(supabase);
  const compiledPrompt = await loadCompiledPrompt(supabase);
  const disabledSources = await loadDisabledSources(supabase);

  // Load production alert settings (hot-deal webhook)
  const { data: alertSettings } = await supabase
    .from('voice_agent_settings')
    .select('production_webhook_url, alert_hot_deals_enabled, hot_deal_min_score')
    .eq('id', 1)
    .maybeSingle();
  const hotDealCfg = {
    enabled: Boolean(alertSettings?.alert_hot_deals_enabled && alertSettings?.production_webhook_url),
    url: alertSettings?.production_webhook_url as string | undefined,
    minScore: Number(alertSettings?.hot_deal_min_score ?? 85),
  };

  // Merge learned forbidden phrases on top of config (without DB write)
  const mergedConfig: ImportConfigRow[] = [
    ...baseConfig,
    ...learnings.forbidden.map((p) => ({
      kind: 'forbidden_phrase' as const,
      pattern: p,
      replacement: '',
      is_regex: false,
      enabled: true,
    })),
  ];

  // Dedupe vs already imported URLs
  const { data: alreadyImported } = await supabase
    .from('properties')
    .select('original_source_url')
    .not('original_source_url', 'is', null);
  const importedSet = new Set((alreadyImported || []).map((r: any) => r.original_source_url));

  // IMPORTANT: Only `vanzare` (sales) prospects from owners are auto-published as
  // listings on realtrust.ro. `inchiriere` and `hotelier` prospects from owners
  // are RECRUITMENT targets — they stay in the prospect queue so Andrei can call
  // them and pitch full / partial management (regim hotelier or classic rental).
  // Never publish rental/hotel-regime owner prospects as site listings.
  const { data: candidates, error: cErr } = await supabase
    .from('prospect_listings')
    .select('id, source_url, title, description, location, zone, rooms, size, price, currency, floor, year_built, features, images, category, source_platform, enriched_title, enriched_description, enriched_images, enrichment_status, lead_score')
    .gte('lead_score', minScore)
    .eq('is_active', true)
    .eq('prospect_type', 'proprietar')
    .eq('category', 'vanzare')
    .not('source_url', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(batchSize * 4);
  if (cErr) {
    try {
      await supabase.rpc('automation_complete_run', {
        _job_key: 'auto-publish-listings',
        _success: false,
        _payload: { error: cErr.message, stage: 'load_candidates' } as any,
        _triggered_by: triggeredBy,
      });
    } catch { /* optional */ }
    return safeJson({ success: false, error: cErr.message, fallback: true });
  }


  const queue = (candidates || [])
    .filter((c: any) => !importedSet.has(c.source_url))
    .filter((c: any) => {
      if (disabledSources.has(c.source_platform)) {
        summary.rejected_source_disabled++;
        return false;
      }
      return true;
    })
    .slice(0, batchSize);
  summary.candidates = queue.length;

  const qualityScores: number[] = [];

  const bumpSource = (platform: string, key: keyof RunSummary['per_source'][string], delta = 1, qScore?: number) => {
    const p = platform || 'unknown';
    summary.per_source[p] ||= { attempts: 0, published: 0, rejected: 0, avg_quality: 0 };
    (summary.per_source[p][key] as number) += delta;
    if (typeof qScore === 'number') {
      const cur = summary.per_source[p].avg_quality;
      const n = summary.per_source[p].published;
      summary.per_source[p].avg_quality = n > 0 ? (cur * (n - 1) + qScore) / n : qScore;
    }
  };

  // Wallclock guard: never let a single run exceed ~50s so the orchestrator
  // (which has its own 50s timeout) doesn't observe a non-2xx / boot-error.
  const WALLCLOCK_MS = 48000;

  for (const prospect of queue) {
    if (Date.now() - t0 > WALLCLOCK_MS) {
      summary.errors.push(`wallclock_guard: stopped after ${queue.indexOf(prospect)}/${queue.length} prospects`);
      break;
    }
    const platform = prospect.source_platform || 'unknown';

    bumpSource(platform, 'attempts');

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║ HARD GUARD — DEFENSE IN DEPTH                                        ║
    // ║ Rental & hotel-regime owner prospects MUST NEVER be published on     ║
    // ║ realtrust.ro. They are recruitment leads exclusively for Andrei.     ║
    // ║ Even if the upstream SELECT filter is ever relaxed, this block stops ║
    // ║ them here and routes them to the call dashboard.                     ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    const cat = String(prospect.category || '').toLowerCase().trim();
    if (cat !== 'vanzare') {
      summary.rejected_recruitment++;
      bumpSource(platform, 'rejected');
      await supabase.from('prospect_listings')
        .update({
          tags: [
            'scrape-prospects',
            'recrutare-management',
            cat === 'hotelier' ? 'regim-hotelier' : 'inchiriere-proprietar',
            'andrei-call-queue',
            'blocked-from-publish',
          ],
          admin_notes: `NU se publică pe site. Lead pentru Andrei: propunere administrare ${cat === 'hotelier' ? 'regim hotelier' : 'totală/parțială'} (categorie="${cat}").`,
          lifecycle_status: 'andrei_queue',
        })
        .eq('id', prospect.id);
      continue;
    }

    try {
      // ── PREMIUM PATH: prospect already enriched by `enrich-prospect-listing`.
      // Use the AI-rewritten title/description + optimized/watermarked images directly,
      // skip Firecrawl + secondary AI rewrite, and harvest per-image alts.
      const hasEnriched =
        prospect.enrichment_status === 'done' &&
        (prospect.enriched_title || prospect.enriched_description) &&
        Array.isArray(prospect.enriched_images);

      let finalTitle: string;
      let finalShort: string;
      let finalFull: string;
      let finalImages: string[];
      let finalImageAlts: string[];
      let rawMd: string;
      let cleanDesc: ReturnType<typeof sanitizeListingText>;
      let cleanTitle: ReturnType<typeof sanitizeListingText>;

      if (hasEnriched) {
        rawMd = prospect.description || prospect.enriched_description || '';
        // Run sanitizer to detect refusal phrases on the RAW input only; the enriched
        // text is already clean but we still want refusal-detection accuracy.
        cleanDesc = sanitizeListingText(prospect.description || '', mergedConfig);
        cleanTitle = sanitizeListingText(prospect.title || '', mergedConfig);
        if (cleanDesc.refusalDetected || cleanTitle.refusalDetected) {
          summary.rejected_refusal++;
          bumpSource(platform, 'rejected');
          await supabase.from('prospect_listings')
            .update({
              admin_notes: `[auto-publish] Refuzat: refusal phrase = "${cleanDesc.refusalMatch || cleanTitle.refusalMatch}"`,
              tags: ['scrape-prospects', 'auto-import', 'no-agency-refusal'],
            }).eq('id', prospect.id);
          continue;
        }
        finalTitle = (prospect.enriched_title || prospect.title || 'Anunț Imobiliar Timișoara').substring(0, 200);
        finalFull = prospect.enriched_description || prospect.description || '';
        // Short = first paragraph stripped of markdown markers.
        finalShort = finalFull
          .replace(/[*_`#>]/g, '')
          .replace(/\n+/g, ' ')
          .trim()
          .substring(0, 220);
        const ei = (prospect.enriched_images as Array<{ optimized?: string; original?: string; alt?: string }>) || [];
        finalImages = ei.map((x) => x.optimized || x.original).filter(Boolean) as string[];
        finalImageAlts = ei.map((x) => x.alt || '').filter(Boolean);
        if (finalImages.length === 0 && Array.isArray(prospect.images)) finalImages = prospect.images;
      } else {
        const scrape = await firecrawlScrape(prospect.source_url, firecrawlKey);
        summary.scraped++;
        rawMd = scrape?.markdown || prospect.description || '';
        const rawImages = (scrape?.images && scrape.images.length > 0)
          ? scrape.images
          : (Array.isArray(prospect.images) ? prospect.images : []);

        if (!rawMd || rawMd.length < 60) {
          summary.rejected_no_content++;
          bumpSource(platform, 'rejected');
          continue;
        }

        cleanDesc = sanitizeListingText(rawMd, mergedConfig);
        cleanTitle = sanitizeListingText(prospect.title || 'Anunț Imobiliar', mergedConfig);

        if (cleanDesc.refusalDetected || cleanTitle.refusalDetected) {
          summary.rejected_refusal++;
          bumpSource(platform, 'rejected');
          await supabase.from('prospect_listings')
            .update({
              admin_notes: `[auto-publish] Refuzat: refusal phrase = "${cleanDesc.refusalMatch || cleanTitle.refusalMatch}"`,
              tags: ['scrape-prospects', 'auto-import', 'no-agency-refusal'],
            }).eq('id', prospect.id);
          continue;
        }

        finalTitle = cleanTitle.sanitized || 'Anunț Imobiliar Timișoara';
        finalShort = cleanDesc.sanitized.substring(0, 220);
        finalFull = cleanDesc.sanitized;

        if (useAiRewrite) {
          const ai = await rewriteWithAI(finalTitle, finalFull, prospect.category || 'vanzare', learnings.hints, compiledPrompt);
          if (ai?.title) finalTitle = sanitizeListingText(ai.title, mergedConfig).sanitized || finalTitle;
          if (ai?.short) finalShort = sanitizeListingText(ai.short, mergedConfig).sanitized || finalShort;
          if (ai?.full)  finalFull  = sanitizeListingText(ai.full,  mergedConfig).sanitized || finalFull;
        }
        finalImages = rawImages;
        finalImageAlts = [];
      }

      // Normalize image list (trim, drop empties, dedupe)
      finalImages = Array.from(
        new Set(
          (finalImages || [])
            .filter((u): u is string => typeof u === 'string')
            .map((u) => u.trim())
            .filter((u) => u.length > 0)
        )
      );

      // HARD GATE: never publish a listing without imagery on realtrust.ro.
      // Without photos the detail page renders empty cards and erodes trust.
      // Send the prospect back into the enrichment queue so the next pass can
      // re-scrape via Firecrawl (which usually recovers gallery URLs).
      if (finalImages.length === 0) {
        summary.rejected_no_images++;
        bumpSource(platform, 'rejected');
        await supabase.from('prospect_listings')
          .update({
            enrichment_status: 'pending',
            admin_notes: `[auto-publish] Respins: 0 imagini detectate (re-scrape programat).`,
            tags: ['scrape-prospects', 'auto-import', 'no-images-rescrape'],
          }).eq('id', prospect.id);
        continue;
      }

      const quality = computeQualityScore({
        finalDesc: finalFull,
        finalTitle,
        imageCount: finalImages.length,
        hasPrice: Boolean(prospect.price),
        hasZone: Boolean(prospect.zone),
        hasRooms: Boolean(prospect.rooms),
        hasSize: Boolean(prospect.size),
        removedPhrasesCount: cleanDesc.removed.phrases.length + cleanTitle.removed.phrases.length,
        removedPhonesCount: cleanDesc.removed.phones.length + cleanTitle.removed.phones.length,
      });

      if (quality < MIN_QUALITY) {
        summary.rejected_low_quality++;
        bumpSource(platform, 'rejected');
        await supabase.from('prospect_listings')
          .update({
            admin_notes: `[auto-publish] Respins calitate < ${MIN_QUALITY} (score=${quality})`,
            tags: ['scrape-prospects', 'auto-import', 'low-quality'],
          }).eq('id', prospect.id);
        continue;
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
        quality_score: quality,
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
          used_premium_enrichment: hasEnriched,
          source_platform: platform,
          quality_score: quality,
          learnings_applied: learnings.forbidden.length,
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
        images: finalImages,
        image_alts: finalImageAlts,
        image_path: Array.isArray(finalImages) && finalImages.length > 0 ? finalImages[0] : null,
        booking_url: null,
        source_platform: platform,
        source_url: null,
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
        bumpSource(platform, 'rejected');
        continue;
      }

      summary.published++;
      summary.published_ids.push(inserted.id);
      qualityScores.push(quality);
      bumpSource(platform, 'published', 1, quality);

      // Increment published count on source health
      // Increment published count on source health (fire-and-forget; rpc has no .catch method)
      await safeRpc(supabase.rpc('listing_import_record_review', {
        _source_platform: platform, _action: 'edit', _quality_delta: 0,
      }));


      await supabase.from('prospect_listings')
        .update({
          tags: ['scrape-prospects', 'auto-import', 'site-published'],
          admin_notes: `[auto-publish] Publicat ca proprietate ${inserted.id} (draft, q=${quality}).`,
        }).eq('id', prospect.id);

      // Fire-and-forget image processing pipeline (crop / inpaint + rehost)
      if (Array.isArray(finalImages) && finalImages.length > 0) {
        const proc = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-listing-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ property_id: inserted.id }),
        }).catch((e) => console.warn('process-listing-images dispatch failed', e?.message));
        // @ts-ignore EdgeRuntime is provided in Deno deploy
        if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(proc);
        }
      }

      // Hot deal alert — fire-and-forget to Make.com webhook
      const leadScore = Number(prospect.lead_score ?? 0);
      if (hotDealCfg.enabled && leadScore >= hotDealCfg.minScore) {
        const payload = {
          event: 'hot_deal_published',
          severity: 'opportunity',
          score: leadScore,
          quality,
          enriched_title: finalTitle,
          price: prospect.price,
          currency: prospect.currency || 'EUR',
          zone: prospect.zone || prospect.location || null,
          location: prospect.location || null,
          rooms: prospect.rooms,
          size: prospect.size,
          property_id: inserted.id,
          slug: inserted.slug,
          admin_url: `https://realtrust.ro/admin/properties/${inserted.id}`,
          fast_review_url: `https://realtrust.ro/admin/properties/fast-review`,
          source_url: prospect.source_url,
          source_platform: platform,
          published_at: new Date().toISOString(),
        };
        const hook = fetch(hotDealCfg.url!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((e) => console.warn('hot_deal webhook failed', e?.message));
        // @ts-ignore EdgeRuntime is provided in Deno deploy
        if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(hook);
        }
      }
    } catch (err: any) {
      summary.rejected_error++;
      bumpSource(platform, 'rejected');
      summary.errors.push(`prospect ${prospect.id}: ${err.message || String(err)}`);
    }
  }

  summary.avg_quality_score = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 0;

  // Write metrics row for self-heal
  try {
    await supabase.from('listing_import_metrics').insert({
      triggered_by: triggeredBy,
      candidates: summary.candidates,
      scraped: summary.scraped,
      published: summary.published,
      rejected_refusal: summary.rejected_refusal,
      rejected_no_content: summary.rejected_no_content,
      rejected_duplicate: summary.rejected_duplicate,
      rejected_error: summary.rejected_error,
      rejected_low_quality: summary.rejected_low_quality,
      rejected_source_disabled: summary.rejected_source_disabled,
      avg_quality_score: summary.avg_quality_score,
      ai_rewrite_used: useAiRewrite,
      batch_size: batchSize,
      duration_ms: Date.now() - t0,
      errors_sample: summary.errors.slice(0, 8),
      per_source: summary.per_source,
    });
  } catch (e) {
    console.error('metrics insert failed:', e);
  }

  try {
    await supabase.rpc('automation_complete_run', {
      _job_key: 'auto-publish-listings',
      _success: true,
      _payload: summary as any,
      _triggered_by: triggeredBy,
    });
  } catch { /* optional */ }

  return safeJson({ success: true, summary });
  } catch (err: any) {
    const message = err?.message || String(err);
    const isTimeout = /timeout|timed out|deadline|ETIMEDOUT|abort/i.test(message);
    console.error('auto-publish-listings fatal error:', message);
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabase.rpc('automation_complete_run', {
        _job_key: 'auto-publish-listings',
        _success: false,
        _payload: { error: message, fallback: true, timeout: isTimeout } as any,
        _triggered_by: 'fatal_handler',
      });
    } catch { /* logger may also be down */ }
    // Return 200 so the orchestrator/UI doesn't trigger a critical alert; self-heal
    // will retry on the next 5-min cron tick.
    return safeJson({ success: false, error: message, fallback: true, timeout: isTimeout });
  }
});

