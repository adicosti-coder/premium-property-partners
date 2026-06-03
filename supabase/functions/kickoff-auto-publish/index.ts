// One-shot kickoff: dispatches auto-publish-listings using the runtime service-role key.
// Public (verify_jwt=false) but gated by a query token equal to SCRAPER_INGEST_SECRET.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get('t') || req.headers.get('x-kickoff-token') || '';
  const expected = Deno.env.get('SCRAPER_INGEST_SECRET') || '';
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const batch = parseInt(url.searchParams.get('batch') || '15', 10);
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
