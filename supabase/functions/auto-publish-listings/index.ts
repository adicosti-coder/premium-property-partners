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
  const webhookSecret = req.headers.get('x-webhook-secret');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ingestSecret = Deno.env.get('SCRAPER_INGEST_SECRET');
  if (cronSecret && serviceKey && cronSecret === serviceKey) return true;
  if (webhookSecret && serviceKey && webhookSecret === serviceKey) return true;
  if (cronSecret && ingestSecret && cronSecret === ingestSecret) return true;
  if (webhookSecret && ingestSecret && webhookSecret === ingestSecret) return true;

  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  // Server-to-server (orchestrator/cron) call: Bearer = service role key
  if (token && serviceKey && token === serviceKey) return true;

  // Fallback: vault-stored cron secrets (allows pg_cron to authenticate even when
  // the platform service-role key has been rotated and the SUPABASE_SERVICE_ROLE_KEY
  // env var no longer matches the value embedded in the cron job command).
  const candidates = [cronSecret, webhookSecret, token].filter(Boolean) as string[];
  if (candidates.length > 0) {
    try {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: vaultRows } = await (admin as any)
        .schema('vault')
        .from('decrypted_secrets')
        .select('name, decrypted_secret')
        .in('name', ['cron_reconcile_secret', 'email_queue_service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role_key']);
      const allowed = new Set<string>((vaultRows || []).map((r: any) => r.decrypted_secret).filter(Boolean));
      for (const c of candidates) {
        if (allowed.has(c)) return true;
      }
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
  let force = false;
  let pendingReviewOnly = false;
  let explicitProspectIds: string[] | null = null;
  try {
    const body = await req.json();
    if (typeof body?.batch_size === 'number') batchSize = Math.min(Math.max(body.batch_size, 1), MAX_BATCH);
    if (typeof body?.min_score === 'number') minScore = body.min_score;
    if (body?.use_ai_rewrite === false) useAiRewrite = false;
    if (typeof body?.triggered_by === 'string') triggeredBy = body.triggered_by;
    if (body?.pending_review_only === true) pendingReviewOnly = true;
    if (Array.isArray(body?.prospect_ids) && body.prospect_ids.length > 0) {
      explicitProspectIds = body.prospect_ids
        .filter((x: any) => typeof x === 'string')
        .slice(0, MAX_BATCH);
      batchSize = explicitProspectIds!.length || DEFAULT_BATCH;
    }
    if (body?.force === true) {
      force = true;
      // Backfill mode: maximize batch & relax min score floor so stuck candidates pass.
      if (!explicitProspectIds) batchSize = MAX_BATCH;
      if (minScore > 50) minScore = 50;
    }
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
  // Hard filters against agency listings (multiple defensive layers):
  //  - agency_suspicion_score < 85 (or NULL = not yet classified)
  //  - do_not_call != true (Twilio DNC / manual blacklist)
  //  - prospect_type = 'proprietar' (excludes 'agentie' if ever set)
  //  - lifecycle_status not in ('rejected') — enum values: new, scoring, calling, interested, rejected, posted, callback, pending_credentials, failed
  //  - "blacklisted" is NOT an enum value; blacklisting is represented by is_active=false + auto_blacklisted_at (already filtered by .eq('is_active', true))
  const candidatesQuery = supabase
    .from('prospect_listings')
    .select('id, source_url, title, description, location, zone, rooms, size, price, currency, floor, year_built, features, images, category, source_platform, enriched_title, enriched_description, enriched_images, enrichment_status, lead_score, agency_suspicion_score, do_not_call, tags, lifecycle_status, contact_name');

  if (explicitProspectIds && explicitProspectIds.length > 0) {
    // Explicit retry mode — process exactly these prospects, bypass score/category filters.
    candidatesQuery.in('id', explicitProspectIds).eq('is_active', true);
  } else {
    candidatesQuery
      .gte('lead_score', minScore)
      .eq('is_active', true)
      .eq('prospect_type', 'proprietar')
      .eq('category', 'vanzare')
      .or('do_not_call.is.null,do_not_call.eq.false')
      .or('agency_suspicion_score.is.null,agency_suspicion_score.lt.85')
      .not('lifecycle_status', 'in', '("rejected")')
      .not('source_url', 'is', null)
      .order('lead_score', { ascending: false })
      .limit(batchSize * 4);
  }
  const { data: candidates, error: cErr } = await candidatesQuery;
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


  const AGENCY_NAME_RX = /(agenți[ae]|agency|imobiliar|real\s*estate|broker|s\.?r\.?l\.?|s\.?a\.?|consulting|properties|invest|estate)/i;
  const queue = (candidates || [])
    .filter((c: any) => !importedSet.has(c.source_url))
    .filter((c: any) => {
      if (disabledSources.has(c.source_platform)) {
        summary.rejected_source_disabled++;
        return false;
      }
      // Secondary agency guard: tag-based + contact name regex
      const tags: string[] = Array.isArray(c.tags) ? c.tags : [];
      if (tags.includes('agency-suspect') || tags.includes('agency') || tags.includes('blacklist')) {
        (summary as any).rejected_agency = ((summary as any).rejected_agency || 0) + 1;
        return false;
      }
      if (c.contact_name && AGENCY_NAME_RX.test(String(c.contact_name))) {
        (summary as any).rejected_agency = ((summary as any).rejected_agency || 0) + 1;
        return false;
      }
      return true;
    })
    .slice(0, batchSize);
  summary.candidates = queue.length;

  const qualityScores: number[] = [];

  const bumpSource = (platform: string, key: keyof RunSummary['per_source'][string], delta = 1, qScore?: number) => {
    const pk = platform || 'unknown';
    summary.per_source[pk] ||= { attempts: 0, published: 0, rejected: 0, avg_quality: 0 };
    (summary.per_source[pk][key] as number) += delta;
    if (typeof qScore === 'number') {
      const cur = summary.per_source[pk].avg_quality;
      const n = summary.per_source[pk].published;
      summary.per_source[pk].avg_quality = n > 0 ? (cur * (n - 1) + qScore) / n : qScore;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FAN-OUT PARALLEL: dispatch ONE worker invocation per prospect. Each worker
  // gets its OWN edge CPU budget, so the orchestrator never hits
  // "CPU Time exceeded" anymore — it only schedules work.
  // ─────────────────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let dispatched = 0;
  const dispatchedIds: string[] = [];
  let recruitmentRouted = 0;
  let pmsSyncFired = 0;

  for (const prospect of queue) {
    const platform = prospect.source_platform || 'unknown';
    bumpSource(platform, 'attempts');
    const cat = String(prospect.category || '').toLowerCase().trim();

    // Recruitment leads (inchiriere / hotelier from owners) — NEVER publish.
    if (cat !== 'vanzare') {
      recruitmentRouted++;
      summary.rejected_recruitment++;
      await supabase.from('prospect_listings').update({
        tags: [
          'scrape-prospects', 'recrutare-management',
          cat === 'hotelier' ? 'regim-hotelier' : 'inchiriere-proprietar',
          'andrei-call-queue', 'blocked-from-publish',
        ],
        admin_notes: `NU se publică pe site. Lead pentru Andrei: administrare ${cat === 'hotelier' ? 'regim hotelier' : 'totală/parțială'}.`,
        lifecycle_status: cat === 'hotelier' ? 'updated_reservation' : 'to_call',
      }).eq('id', prospect.id);
      continue;
    }

    // Idempotency key — workers refuse re-processing the same key, preventing
    // duplicate property inserts if dispatch is accidentally repeated.
    const idempotencyKey = `pub:${prospect.id}:${t0}`;

    // Fan-out the heavy work to an isolated single-prospect worker.
    const inv = fetch(`${supabaseUrl}/functions/v1/auto-publish-listing-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        prospect_id: prospect.id,
        triggered_by: triggeredBy,
        use_ai_rewrite: useAiRewrite,
        idempotency_key: idempotencyKey,
        pending_review_only: pendingReviewOnly,
      }),
    }).catch((e) => console.warn(`[fanout] dispatch failed for ${prospect.id}:`, e?.message));

    // @ts-ignore EdgeRuntime is provided in Deno deploy
    if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(inv);
    }
    dispatched++;
    dispatchedIds.push(prospect.id);
  }

  // PMS side-channel (ApArt Hotel pipeline): if any active cazare property
  // exists, fire a single iCal sync in parallel with publication.
  try {
    const { count: hotelCount } = await supabase
      .from('properties').select('id', { count: 'exact', head: true })
      .eq('listing_type', 'cazare').eq('is_active', true);
    if ((hotelCount ?? 0) > 0) {
      const pms = fetch(`${supabaseUrl}/functions/v1/sync-ical-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ triggered_by: triggeredBy, source: 'auto-publish-fan-out' }),
      }).catch((e) => console.warn('[pms-sync] dispatch failed:', e?.message));
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) EdgeRuntime.waitUntil(pms);
      pmsSyncFired++;
    }
  } catch (e: any) {
    console.warn('[pms-sync] check failed:', e?.message);
  }

  // In fan-out mode the orchestrator no longer knows synchronously how many
  // properties were published — workers report directly into the DB and the
  // dashboard reads the 24h count from `properties.imported_at`.
  (summary as any).dispatched = dispatched;
  (summary as any).recruitment_routed = recruitmentRouted;
  (summary as any).pms_sync_fired = pmsSyncFired;
  (summary as any).mode = 'fan_out_parallel';
  void qualityScores; // kept for type compat with metrics row below

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

