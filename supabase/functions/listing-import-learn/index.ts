/**
 * listing-import-learn — capture admin review actions and extract learnings.
 *
 * Called from the FastReview page on every Approve / Edit / Reject.
 * Responsibilities:
 *  1. Log the review event with full diff context.
 *  2. On 'edit': diff the AI text vs the admin-edited text and bump
 *     evidence_count on each removed phrase in listing_import_learnings.
 *     Promote a learning to is_active when evidence_count >= 3.
 *  3. On 'reject': increment consecutive_failures on source health and
 *     optionally store rejection reason as a description_hint candidate.
 *  4. On 'approve': reset consecutive_failures, bump approval rate.
 *  5. Auto-disable a source for 12h when it hits 8 consecutive admin rejects.
 *
 * Auth: admin JWT required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMOTE_THRESHOLD = 3; // evidence count to flip is_active=true
const AUTODISABLE_AFTER = 8;
const AUTODISABLE_HOURS = 12;

async function generateSemanticRule(removedPhrases: string[], reason?: string): Promise<{
  concept: string;
  variants: string[];
  description_hint: string;
} | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || removedPhrases.length === 0) return null;
  try {
    const prompt = `Adminul unei agenții imobiliare a șters din descrierea AI a unui anunț următoarele fragmente:
${removedPhrases.slice(0, 12).map((p) => `- "${p}"`).join('\n')}
${reason ? `Motiv adițional menționat: "${reason}"` : ''}

Generalizează aceste ștergeri într-o REGULĂ CONCEPTUALĂ unică. Exemplu: dacă fragmentele sunt "exclus intermediari", "fara agentii", "doar persoane fizice" → conceptul este "refuz colaborare cu agenții imobiliare".

Răspunde STRICT JSON, fără markdown:
{
  "concept": "etichetă scurtă a conceptului (max 60 caractere, română)",
  "variants": ["variantă 1", "variantă 2", "..."],
  "description_hint": "instrucțiune scurtă (max 120 caractere) pentru AI: ce să evite pe viitor"
}`;
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed?.concept || !Array.isArray(parsed?.variants)) return null;
    const variants = parsed.variants
      .filter((v: unknown): v is string => typeof v === 'string' && v.length >= 3 && v.length <= 80)
      .map((v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .slice(0, 12);
    if (variants.length === 0) return null;
    return {
      concept: String(parsed.concept).substring(0, 80),
      variants,
      description_hint: typeof parsed.description_hint === 'string'
        ? parsed.description_hint.substring(0, 160)
        : `Evită formulări precum: ${variants.slice(0, 3).join(', ')}`,
    };
  } catch (err) {
    console.error('generateSemanticRule error:', err);
    return null;
  }
}

interface LearnRequest {
  property_id: string;
  action: 'approve' | 'edit' | 'reject';
  ai_title?: string;
  ai_description?: string;
  final_title?: string;
  final_description?: string;
  reason?: string;
}

function tokenize(s: string): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && t.length <= 40);
}

/**
 * Return phrases (1-3 word) present in AI text but missing in final text.
 * These are the tokens the admin chose to remove.
 */
function extractRemovedPhrases(ai: string, final: string): string[] {
  const aiTokens = tokenize(ai);
  const finalSet = new Set(tokenize(final));
  const removed = new Set<string>();
  // unigrams
  for (const t of aiTokens) {
    if (!finalSet.has(t)) removed.add(t);
  }
  // bigrams that whole-disappear (stronger signal)
  for (let i = 0; i < aiTokens.length - 1; i++) {
    const bg = `${aiTokens[i]} ${aiTokens[i + 1]}`;
    const bgLower = bg.toLowerCase();
    if (!final.toLowerCase().includes(bgLower)) removed.add(bg);
  }
  // cap to avoid noise
  return Array.from(removed).slice(0, 25);
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

  let body: LearnRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!body?.property_id || !['approve', 'edit', 'reject'].includes(body.action)) {
    return new Response(JSON.stringify({ error: 'property_id and action required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Fetch property for source_platform
  const { data: prop } = await admin
    .from('properties')
    .select('source_platform')
    .eq('id', body.property_id)
    .maybeSingle();
  const platform = (prop as { source_platform?: string } | null)?.source_platform || 'unknown';

  const aiTitle = body.ai_title || '';
  const aiDesc = body.ai_description || '';
  const finalTitle = body.final_title ?? aiTitle;
  const finalDesc = body.final_description ?? aiDesc;

  let diffTokens: string[] = [];
  if (body.action === 'edit' && (aiTitle || aiDesc)) {
    const t1 = extractRemovedPhrases(aiTitle, finalTitle);
    const t2 = extractRemovedPhrases(aiDesc, finalDesc);
    diffTokens = Array.from(new Set([...t1, ...t2])).slice(0, 25);
  }

  // 1. Log review event
  await admin.from('listing_import_review_events').insert({
    property_id: body.property_id,
    action: body.action,
    reviewer_id: u.user.id,
    ai_title: aiTitle.substring(0, 500),
    ai_description: aiDesc.substring(0, 5000),
    final_title: finalTitle.substring(0, 500),
    final_description: finalDesc.substring(0, 5000),
    reason: body.reason?.substring(0, 500) || null,
    diff_tokens_removed: diffTokens,
    source_platform: platform,
  });

  // 2. Bump source health
  await admin.rpc('listing_import_record_review', {
    _source_platform: platform,
    _action: body.action,
    _quality_delta: 0,
  });

  // 3. Promote learnings from edit diff
  const promoted: string[] = [];
  if (diffTokens.length > 0) {
    for (const phrase of diffTokens) {
      // Upsert evidence
      const { data: existing } = await admin
        .from('listing_import_learnings')
        .select('id, evidence_count, is_active')
        .eq('pattern_type', 'phrase')
        .eq('pattern', phrase)
        .maybeSingle();

      if (existing) {
        const newCount = (existing as { evidence_count: number }).evidence_count + 1;
        const shouldActivate = newCount >= PROMOTE_THRESHOLD && !(existing as { is_active: boolean }).is_active;
        await admin.from('listing_import_learnings').update({
          evidence_count: newCount,
          confidence: Math.min(1, 0.3 + newCount * 0.15),
          is_active: shouldActivate || (existing as { is_active: boolean }).is_active,
          promoted_at: shouldActivate ? new Date().toISOString() : undefined,
          last_seen: new Date().toISOString(),
        }).eq('id', (existing as { id: string }).id);
        if (shouldActivate) promoted.push(phrase);
      } else {
        await admin.from('listing_import_learnings').insert({
          pattern_type: 'phrase',
          pattern: phrase,
          evidence_count: 1,
          confidence: 0.3,
          is_active: false,
          notes: `Auto-învățat din diff (sursa: ${platform})`,
        });
      }
    }
  }

  // 3b. Semantic generalization via Gemini (single diff → conceptual rule)
  const semanticPromoted: string[] = [];
  if ((body.action === 'edit' && diffTokens.length >= 2) || (body.action === 'reject' && body.reason && body.reason.length > 8)) {
    const sourcePhrases = body.action === 'edit' ? diffTokens : [body.reason || ''];
    const rule = await generateSemanticRule(sourcePhrases, body.action === 'reject' ? body.reason : undefined);
    if (rule) {
      const conceptKey = rule.concept.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const { data: existingSem } = await admin
        .from('listing_import_learnings')
        .select('id, evidence_count, metadata')
        .eq('pattern_type', 'semantic_concept')
        .eq('pattern', conceptKey)
        .maybeSingle();

      if (existingSem) {
        const mergedVariants = Array.from(new Set([
          ...((existingSem as any).metadata?.variants || []),
          ...rule.variants,
        ])).slice(0, 25);
        await admin.from('listing_import_learnings').update({
          evidence_count: ((existingSem as any).evidence_count || 0) + 1,
          confidence: Math.min(1, 0.75 + ((existingSem as any).evidence_count || 0) * 0.05),
          is_active: true,
          last_seen: new Date().toISOString(),
          metadata: {
            concept: rule.concept,
            variants: mergedVariants,
            description_hint: rule.description_hint,
            source_platform: platform,
          },
        }).eq('id', (existingSem as any).id);
      } else {
        await admin.from('listing_import_learnings').insert({
          pattern_type: 'semantic_concept',
          pattern: conceptKey,
          evidence_count: 1,
          confidence: 0.78,
          is_active: true, // Gemini-validated → activate immediately
          promoted_at: new Date().toISOString(),
          notes: `Generalizat semantic din ${body.action} (${platform})`,
          metadata: {
            concept: rule.concept,
            variants: rule.variants,
            description_hint: rule.description_hint,
            source_platform: platform,
            source_phrases: sourcePhrases.slice(0, 8),
          },
        });
        semanticPromoted.push(rule.concept);
      }

      // Also push the description_hint as a hint candidate
      await admin.from('listing_import_learnings').upsert({
        pattern_type: 'description_hint',
        pattern: rule.description_hint,
        evidence_count: 1,
        confidence: 0.7,
        is_active: true,
        notes: `Hint semantic (${rule.concept})`,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'pattern_type,pattern', ignoreDuplicates: false }).catch(() => null);
    }
  }

  // 4. Store rejection reason as description_hint candidate
  if (body.action === 'reject' && body.reason && body.reason.length > 5 && body.reason.length < 200) {
    await admin.from('listing_import_learnings').upsert({
      pattern_type: 'description_hint',
      pattern: `Evită: ${body.reason.trim()}`,
      evidence_count: 1,
      confidence: 0.5,
      is_active: false,
      notes: `Motiv respingere (${platform})`,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'pattern_type,pattern', ignoreDuplicates: false }).catch(() => null);
  }

  // 5. Auto-disable source if too many consecutive rejects
  let sourceDisabled = false;
  if (body.action === 'reject') {
    const { data: sh } = await admin
      .from('listing_import_source_health')
      .select('consecutive_failures, auto_disabled_until')
      .eq('source_platform', platform)
      .maybeSingle();
    const cf = (sh as { consecutive_failures?: number } | null)?.consecutive_failures || 0;
    if (cf >= AUTODISABLE_AFTER) {
      const until = new Date(Date.now() + AUTODISABLE_HOURS * 3600_000).toISOString();
      await admin.from('listing_import_source_health').update({
        auto_disabled_until: until,
        notes: `Auto-dezactivat ${AUTODISABLE_HOURS}h după ${cf} respingeri consecutive`,
      }).eq('source_platform', platform);
      await admin.from('listing_import_heal_log').insert({
        decision: 'auto_disable_source',
        rationale: `Sursa "${platform}" auto-dezactivată ${AUTODISABLE_HOURS}h (${cf} respingeri consecutive)`,
        payload: { source_platform: platform, until, consecutive_failures: cf },
      });
      sourceDisabled = true;
    }
  }

  // 6. Update property review_action stamp
  await admin.from('properties').update({
    review_action: body.action,
    reviewed_at: new Date().toISOString(),
  }).eq('id', body.property_id);

  return new Response(JSON.stringify({
    success: true,
    diff_tokens: diffTokens.length,
    promoted_learnings: promoted,
    source_auto_disabled: sourceDisabled,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
