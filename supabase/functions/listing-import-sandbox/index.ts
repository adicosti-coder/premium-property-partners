/**
 * listing-import-sandbox — Shadow / Dry-Run pipeline simulator.
 *
 * Takes raw text (paste from OLX / Storia / direct site), runs it through
 * the EXACT same pipeline as auto-publish-listings, but DOES NOT touch the
 * properties / prospect_listings / metrics tables. Returns:
 *   - sanitization diff (removed phones/emails/addresses/phrases)
 *   - refusal detection result
 *   - quality score (heuristic)
 *   - AI-rewritten title + short + full
 *   - all active learnings + semantic concepts applied
 *
 * Auth: admin JWT required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadImportConfig, sanitizeListingText, type ImportConfigRow } from "../_shared/listingSanitizer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SandboxRequest {
  raw_text: string;
  raw_title?: string;
  listing_type?: 'vanzare' | 'inchiriere' | 'cazare';
  image_count?: number;
  has_price?: boolean;
  has_zone?: boolean;
  has_rooms?: boolean;
  has_size?: boolean;
  use_ai_rewrite?: boolean;
}

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
  if (opts.finalDesc.length >= 800) score += 25;
  else if (opts.finalDesc.length >= 400) score += 18;
  else if (opts.finalDesc.length >= 200) score += 10;
  else score += 2;
  if (opts.finalTitle.length >= 30 && opts.finalTitle.length <= 90) score += 10;
  else if (opts.finalTitle.length >= 15) score += 5;
  if (opts.imageCount >= 6) score += 20;
  else if (opts.imageCount >= 3) score += 12;
  else if (opts.imageCount >= 1) score += 5;
  if (opts.hasPrice) score += 12;
  if (opts.hasZone) score += 8;
  if (opts.hasRooms) score += 6;
  if (opts.hasSize) score += 6;
  score -= Math.min(20, opts.removedPhrasesCount * 4);
  score -= Math.min(10, opts.removedPhonesCount * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function loadActiveLearnings(supabase: any) {
  const { data } = await supabase
    .from('listing_import_learnings')
    .select('pattern_type, pattern, metadata, confidence, evidence_count')
    .eq('is_active', true)
    .limit(300);
  const forbidden: string[] = [];
  const hints: string[] = [];
  const semantic: Array<{ pattern: string; variants: string[]; concept?: string }> = [];
  for (const r of (data || []) as Array<any>) {
    if (r.pattern_type === 'phrase') forbidden.push(r.pattern);
    else if (r.pattern_type === 'title_hint' || r.pattern_type === 'description_hint') hints.push(r.pattern);
    else if (r.pattern_type === 'semantic_concept') {
      const variants: string[] = Array.isArray(r.metadata?.variants) ? r.metadata.variants : [];
      semantic.push({ pattern: r.pattern, variants, concept: r.metadata?.concept });
      // semantic variants act as forbidden phrases too
      for (const v of variants) forbidden.push(v);
    }
  }
  return { forbidden, hints, semantic };
}

async function loadCompiledPrompt(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('listing_import_system_prompts')
    .select('compiled_prompt')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.compiled_prompt || null;
}

async function rewriteWithAI(
  title: string,
  sanitized: string,
  listingType: string,
  hints: string[],
  compiledPrompt: string | null,
): Promise<{ title?: string; short?: string; full?: string; raw?: string } | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || !sanitized || sanitized.length < 80) return null;
  try {
    const hintBlock = hints.length > 0
      ? `\nLECȚII ÎNVĂȚATE DIN CORECȚIILE ADMINULUI (aplică automat):\n- ${hints.slice(0, 12).join('\n- ')}\n`
      : '';
    const sysPrompt = compiledPrompt || `Ești copywriter imobiliar premium pentru RealTrust (agenție din Timișoara).
REGULI STRICTE:
- NU include numere de telefon, emailuri, adrese exacte cu număr stradal.
- NU folosi: "proprietar", "persoană fizică", "fără comision", "comision 0", "direct proprietar".
- Limbaj profesional de agenție, accent pe avantaje și potențial de investiție.`;

    const userPrompt = `Rescrie descrierea pentru un anunț de ${listingType === 'inchiriere' ? 'închiriere' : listingType === 'cazare' ? 'cazare' : 'vânzare'}.
Răspunde STRICT în formatul:
---TITLU---
[titlu]
---SCURT---
[descriere scurtă <200 char]
---COMPLET---
[descriere completă markdown]
${hintBlock}
TITLU ORIGINAL: ${title}
DESCRIERE: ${sanitized.substring(0, 3000)}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content || '';
    const t = text.match(/---TITLU---\s*([\s\S]*?)\s*---SCURT---/)?.[1]?.trim();
    const s = text.match(/---SCURT---\s*([\s\S]*?)\s*---COMPLET---/)?.[1]?.trim();
    const f = text.match(/---COMPLET---\s*([\s\S]*)$/)?.[1]?.trim();
    return { title: t, short: s, full: f, raw: text };
  } catch (err) {
    console.error('sandbox rewriteWithAI error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: u } = await userClient.auth.getUser(token);
  if (!u?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: roleRow } = await admin
    .from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'Admin only' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: SandboxRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const rawText = (body.raw_text || '').trim();
  if (!rawText || rawText.length < 30) {
    return new Response(JSON.stringify({ error: 'raw_text must be at least 30 chars' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const rawTitle = body.raw_title || rawText.split('\n').find((l) => l.trim().length > 0)?.substring(0, 120) || 'Anunț Test';
  const listingType = body.listing_type || 'vanzare';
  const useAi = body.use_ai_rewrite !== false;

  // Load config + learnings (READ ONLY)
  const baseConfig = await loadImportConfig(admin);
  const learnings = await loadActiveLearnings(admin);
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

  const cleanDesc = sanitizeListingText(rawText, mergedConfig);
  const cleanTitle = sanitizeListingText(rawTitle, mergedConfig);

  let finalTitle = cleanTitle.sanitized || rawTitle;
  let finalShort = cleanDesc.sanitized.substring(0, 220);
  let finalFull = cleanDesc.sanitized;
  let aiRaw: string | undefined;

  const compiledPrompt = await loadCompiledPrompt(admin);

  if (useAi && !cleanDesc.refusalDetected && !cleanTitle.refusalDetected) {
    const ai = await rewriteWithAI(finalTitle, finalFull, listingType, learnings.hints, compiledPrompt);
    if (ai?.title) finalTitle = sanitizeListingText(ai.title, mergedConfig).sanitized || finalTitle;
    if (ai?.short) finalShort = sanitizeListingText(ai.short, mergedConfig).sanitized || finalShort;
    if (ai?.full) finalFull = sanitizeListingText(ai.full, mergedConfig).sanitized || finalFull;
    aiRaw = ai?.raw;
  }

  const quality = computeQualityScore({
    finalDesc: finalFull,
    finalTitle,
    imageCount: body.image_count ?? 5,
    hasPrice: body.has_price ?? true,
    hasZone: body.has_zone ?? true,
    hasRooms: body.has_rooms ?? true,
    hasSize: body.has_size ?? true,
    removedPhrasesCount: cleanDesc.removed.phrases.length + cleanTitle.removed.phrases.length,
    removedPhonesCount: cleanDesc.removed.phones.length + cleanTitle.removed.phones.length,
  });

  const wouldPublish = !cleanDesc.refusalDetected && !cleanTitle.refusalDetected && quality >= 35;
  const wouldReject =
    cleanDesc.refusalDetected || cleanTitle.refusalDetected
      ? 'refusal_phrase'
      : quality < 35
        ? 'low_quality'
        : null;

  return new Response(JSON.stringify({
    success: true,
    dry_run: true,
    quality_score: quality,
    would_publish: wouldPublish,
    would_reject_reason: wouldReject,
    refusal: {
      detected: cleanDesc.refusalDetected || cleanTitle.refusalDetected,
      match: cleanDesc.refusalMatch || cleanTitle.refusalMatch,
    },
    sanitization: {
      removed_phones: [...cleanDesc.removed.phones, ...cleanTitle.removed.phones],
      removed_emails: [...cleanDesc.removed.emails, ...cleanTitle.removed.emails],
      removed_addresses: cleanDesc.removed.addresses,
      removed_phrases: Array.from(new Set([...cleanDesc.removed.phrases, ...cleanTitle.removed.phrases])),
    },
    learnings_applied: {
      forbidden_count: learnings.forbidden.length,
      hints_count: learnings.hints.length,
      semantic_concepts: learnings.semantic.map((s) => ({ concept: s.concept || s.pattern, variants: s.variants.length })),
    },
    compiled_prompt_used: Boolean(compiledPrompt),
    ai_rewritten: useAi,
    preview: {
      title: finalTitle,
      short_description: finalShort,
      long_description: finalFull,
    },
    raw_ai_response: aiRaw,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
