/**
 * listing-import-compile-prompt — Force Re-Sync Prompt.
 *
 * Aggregates the currently active learnings (phrases, hints, semantic concepts),
 * asks Gemini to compile them into a single tight system prompt for the
 * rewrite step of auto-publish-listings, and stores it as the new active
 * row in listing_import_system_prompts. Previous rows are flipped is_active=false.
 *
 * Auth: admin JWT required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FALLBACK_PROMPT = `Ești copywriter imobiliar premium pentru RealTrust (agenție din Timișoara).
REGULI STRICTE:
- NU include numere de telefon, emailuri, adrese exacte cu număr stradal.
- NU folosi: "proprietar", "persoană fizică", "fără comision", "comision 0", "direct proprietar".
- Limbaj profesional de agenție, accent pe avantaje și potențial de investiție.
- Ton premium, factual, fără superlative goale.`;

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

  // Load top active learnings (most evidence first)
  const { data: learnings } = await admin
    .from('listing_import_learnings')
    .select('pattern_type, pattern, evidence_count, confidence, metadata')
    .eq('is_active', true)
    .order('evidence_count', { ascending: false })
    .limit(80);

  const phrases: string[] = [];
  const hints: string[] = [];
  const semantic: Array<{ concept: string; variants: string[] }> = [];
  for (const r of (learnings || []) as Array<any>) {
    if (r.pattern_type === 'phrase') phrases.push(r.pattern);
    else if (r.pattern_type === 'title_hint' || r.pattern_type === 'description_hint') hints.push(r.pattern);
    else if (r.pattern_type === 'semantic_concept') {
      semantic.push({
        concept: r.metadata?.concept || r.pattern,
        variants: Array.isArray(r.metadata?.variants) ? r.metadata.variants : [],
      });
    }
  }

  let compiledPrompt = FALLBACK_PROMPT;
  const key = Deno.env.get('LOVABLE_API_KEY');

  if (key && (phrases.length + hints.length + semantic.length) > 0) {
    try {
      const input = `Generează un PROMPT DE SISTEM (în română) pentru un model AI care rescrie anunțuri imobiliare scrapped pentru agenția RealTrust din Timișoara.

Promptul trebuie să consolideze următoarele reguli învățate din corecțiile admin (deduplicate, fără redundanță, fără să listezi 80 de bullet-uri — grupează semantic):

FRAZE INTERZISE (extrase din ce a șters adminul):
${phrases.slice(0, 40).map((p) => `- ${p}`).join('\n')}

CONCEPTE SEMANTICE GENERALIZATE:
${semantic.map((s) => `- ${s.concept} (variante observate: ${s.variants.slice(0, 5).join(', ')})`).join('\n')}

INSTRUCȚIUNI DE TON / STIL:
${hints.slice(0, 20).map((h) => `- ${h}`).join('\n')}

Cerințe pentru output:
1. Începe cu "Ești copywriter imobiliar premium pentru RealTrust (Timișoara)."
2. Listează REGULI STRICTE cu bullets concise.
3. Maxim 1500 caractere total. Fără preambul, fără explicații meta.
4. NU include exemple, doar reguli.
5. Răspunde DOAR cu promptul, fără ghilimele de cod, fără comentarii.`;

      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: input }],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text: string = (data?.choices?.[0]?.message?.content || '').trim();
        if (text.length > 200) compiledPrompt = text.substring(0, 4000);
      }
    } catch (err) {
      console.error('compile-prompt gemini error:', err);
    }
  }

  // Deactivate previous active prompts
  await admin.from('listing_import_system_prompts')
    .update({ is_active: false })
    .eq('is_active', true);

  const { data: inserted, error } = await admin.from('listing_import_system_prompts').insert({
    compiled_prompt: compiledPrompt,
    hints_count: hints.length,
    forbidden_count: phrases.length,
    semantic_count: semantic.length,
    generated_by: u.user.id,
    is_active: true,
    notes: `Force re-sync (${phrases.length} fraze, ${hints.length} hints, ${semantic.length} concepte semantice)`,
  }).select('id, created_at').single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    success: true,
    id: inserted?.id,
    created_at: inserted?.created_at,
    compiled_prompt: compiledPrompt,
    stats: {
      phrases: phrases.length,
      hints: hints.length,
      semantic: semantic.length,
      length: compiledPrompt.length,
    },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
