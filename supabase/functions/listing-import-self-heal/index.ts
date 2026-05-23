/**
 * listing-import-self-heal — autonomous tuner for the auto-publish pipeline.
 *
 * Runs on cron (every 30 min via automation_jobs). Looks at the last 24h of:
 *   - listing_import_metrics  (rates, quality, per-source breakdown)
 *   - listing_import_review_events (admin signal: approve/edit/reject)
 *   - listing_import_source_health (consecutive failures)
 *   - listing_import_learnings (auto-discovered patterns)
 *
 * Decisions it can make autonomously:
 *  1. AUTO_DISABLE source platforms with low approval rate (12h cooldown).
 *  2. RE_ENABLE sources whose cooldown expired AND that have learnings active.
 *  3. PROMOTE high-evidence learnings (>=3 evidence) still inactive.
 *  4. DEMOTE stale low-evidence learnings (>14 days, evidence_count < 2).
 *  5. ADJUST settings (advisory): if global approval rate < 40% recommend
 *     lower batch_size; if avg_quality_score > 75 recommend higher batch.
 *
 * Every decision is logged in listing_import_heal_log.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOW_APPROVAL_RATE = 35;        // %
const HIGH_APPROVAL_RATE = 70;
const COOLDOWN_HOURS = 12;
const MIN_SAMPLES = 4;
const PROMOTE_THRESHOLD = 3;
const STALE_DAYS = 14;
const STALE_MIN_EVIDENCE = 2;

async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (cronSecret && serviceKey && cronSecret === serviceKey) return true;

  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  // Server-to-server (orchestrator) call: Bearer = service role key
  if (serviceKey && token === serviceKey) return true;
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
    .from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
  return Boolean(roleRow);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const decisions: Array<{ decision: string; rationale: string; payload: any }> = [];
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600_000).toISOString();
  const staleAgo = new Date(now - STALE_DAYS * 24 * 3600_000).toISOString();

  // ── 1. Auto-disable low-performing sources ───────────────────────────
  const { data: sources } = await supabase
    .from('listing_import_source_health')
    .select('*');

  for (const s of (sources || []) as Array<{
    source_platform: string; total_approved: number; total_edited: number;
    total_user_rejected: number; approval_rate: number;
    auto_disabled_until: string | null; consecutive_failures: number;
  }>) {
    const samples = s.total_approved + s.total_edited + s.total_user_rejected;
    const isDisabled = s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() > now;

    if (!isDisabled && samples >= MIN_SAMPLES && s.approval_rate < LOW_APPROVAL_RATE) {
      const until = new Date(now + COOLDOWN_HOURS * 3600_000).toISOString();
      await supabase.from('listing_import_source_health').update({
        auto_disabled_until: until,
        notes: `Self-heal: dezactivat ${COOLDOWN_HOURS}h (approval_rate=${s.approval_rate}% < ${LOW_APPROVAL_RATE}%, ${samples} mostre)`,
      }).eq('source_platform', s.source_platform);
      decisions.push({
        decision: 'auto_disable_source',
        rationale: `${s.source_platform}: approval ${s.approval_rate}% sub prag (${LOW_APPROVAL_RATE}%) cu ${samples} mostre.`,
        payload: { source_platform: s.source_platform, until, approval_rate: s.approval_rate, samples },
      });
    }

    // Re-enable if cooldown passed AND there are new active learnings since disable
    if (isDisabled && s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() <= now + 60_000) {
      await supabase.from('listing_import_source_health').update({
        auto_disabled_until: null,
        consecutive_failures: 0,
        notes: `Self-heal: re-enable după cooldown (learnings noi aplicate).`,
      }).eq('source_platform', s.source_platform);
      decisions.push({
        decision: 're_enable_source',
        rationale: `${s.source_platform}: cooldown expirat, re-activat.`,
        payload: { source_platform: s.source_platform },
      });
    }
  }

  // ── 2. Promote high-evidence learnings ───────────────────────────────
  const { data: candidates } = await supabase
    .from('listing_import_learnings')
    .select('id, pattern, evidence_count, is_active')
    .eq('is_active', false)
    .gte('evidence_count', PROMOTE_THRESHOLD)
    .limit(50);
  for (const l of (candidates || []) as Array<{ id: string; pattern: string; evidence_count: number }>) {
    await supabase.from('listing_import_learnings').update({
      is_active: true,
      promoted_at: new Date().toISOString(),
      confidence: Math.min(1, 0.3 + l.evidence_count * 0.15),
    }).eq('id', l.id);
    decisions.push({
      decision: 'promote_learning',
      rationale: `Pattern "${l.pattern}" activat (${l.evidence_count} dovezi de la admin).`,
      payload: { pattern: l.pattern, evidence_count: l.evidence_count },
    });
  }

  // ── 3. Demote stale low-evidence learnings ──────────────────────────
  const { data: stale } = await supabase
    .from('listing_import_learnings')
    .select('id, pattern, evidence_count')
    .lt('last_seen', staleAgo)
    .lt('evidence_count', STALE_MIN_EVIDENCE)
    .eq('is_active', true)
    .limit(50);
  for (const l of (stale || []) as Array<{ id: string; pattern: string }>) {
    await supabase.from('listing_import_learnings').update({
      is_active: false,
      notes: `Self-heal: dezactivat ca stale (>14 zile fără dovezi noi).`,
    }).eq('id', l.id);
    decisions.push({
      decision: 'demote_stale_learning',
      rationale: `Pattern "${l.pattern}" dezactivat (stale).`,
      payload: { pattern: l.pattern },
    });
  }

  // ── 4. Global advisory: batch tuning based on 24h KPIs ──────────────
  const { data: metrics } = await supabase
    .from('listing_import_metrics')
    .select('published, candidates, avg_quality_score, rejected_low_quality, rejected_error')
    .gte('run_at', dayAgo);
  const m = metrics || [];
  const totalPub = m.reduce((s: number, r: any) => s + (r.published || 0), 0);
  const totalCand = m.reduce((s: number, r: any) => s + (r.candidates || 0), 0);
  const avgQ = m.length > 0
    ? m.reduce((s: number, r: any) => s + (Number(r.avg_quality_score) || 0), 0) / m.length
    : 0;
  const pubRate = totalCand > 0 ? Math.round((totalPub / totalCand) * 100) : 0;

  let recommended_batch = 8;
  if (pubRate < 40 || avgQ < 50) recommended_batch = 4;
  else if (pubRate > 70 && avgQ > 75) recommended_batch = 14;
  decisions.push({
    decision: 'kpi_snapshot',
    rationale: `24h: ${totalPub}/${totalCand} publicate (${pubRate}%), q̄=${Math.round(avgQ)}. Batch recomandat: ${recommended_batch}.`,
    payload: { window_runs: m.length, published: totalPub, candidates: totalCand, publish_rate_pct: pubRate, avg_quality: Math.round(avgQ), recommended_batch },
  });

  // ── 5. Persist decisions ────────────────────────────────────────────
  if (decisions.length > 0) {
    await supabase.from('listing_import_heal_log').insert(
      decisions.map((d) => ({ decision: d.decision, rationale: d.rationale, payload: d.payload })),
    );
  }

  // ── 6. Mark run in automation log (best effort) ─────────────────────
  try {
    await supabase.rpc('automation_complete_run', {
      _job_key: 'listing-import-self-heal',
      _success: true,
      _payload: { decisions: decisions.length, kpi: { totalPub, totalCand, avgQ: Math.round(avgQ), pubRate } } as any,
      _triggered_by: req.headers.get('x-cron-secret') ? 'cron' : 'manual',
    });
  } catch { /* optional */ }

  return new Response(JSON.stringify({
    success: true,
    decisions_count: decisions.length,
    decisions: decisions.slice(0, 20),
    kpi: { published_24h: totalPub, candidates_24h: totalCand, publish_rate_pct: pubRate, avg_quality: Math.round(avgQ), recommended_batch },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
