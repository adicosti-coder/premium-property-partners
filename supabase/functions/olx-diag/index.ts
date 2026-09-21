import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Temporary internal harness: invokes scrape-prospects with the internal secret
// so we can verify the OLX path end-to-end.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-prospects`;
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${svc}`,
      'x-webhook-secret': svc,
      apikey: svc,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 6000) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
