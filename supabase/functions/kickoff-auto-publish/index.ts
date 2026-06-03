// One-shot kickoff: dispatches auto-publish-listings using the runtime service-role key.
// Public (verify_jwt=false). Rate-limited via simple in-memory cooldown and capped batch.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

let lastRun = 0;
const COOLDOWN_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const now = Date.now();
  if (now - lastRun < COOLDOWN_MS) {
    return new Response(JSON.stringify({ error: 'cooldown', wait_ms: COOLDOWN_MS - (now - lastRun) }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  lastRun = now;

  const url = new URL(req.url);
  const batch = Math.max(1, Math.min(15, parseInt(url.searchParams.get('batch') || '10', 10)));
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const projectUrl = Deno.env.get('SUPABASE_URL')!;

  const resp = await fetch(`${projectUrl}/functions/v1/auto-publish-listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'x-cron-secret': serviceKey,
      'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
    },
    body: JSON.stringify({ batch_size: batch, use_ai_rewrite: true, triggered_by: 'kickoff' }),
  });
  const text = await resp.text();
  return new Response(text, { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
