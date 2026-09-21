import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const url = typeof body.url === 'string' ? body.url : '';
  const fc = Deno.env.get('FIRECRAWL_API_KEY') || '';
  const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['rawHtml'], onlyMainContent: false, proxy: 'stealth', location: { country: 'RO', languages: ['ro-RO'] } }),
  });
  const j = await r.json().catch(() => ({}));
  const doc = (j as { data?: Record<string, unknown> }).data ?? (j as Record<string, unknown>);
  const raw = typeof doc.rawHtml === 'string' ? doc.rawHtml : '';
  let parsed: unknown = null;
  try { parsed = JSON.parse(raw); } catch { /* not json */ }
  const offers = (parsed as { data?: Record<string, unknown>[] })?.data ?? [];
  const summary = offers.slice(0, 2).map((o) => ({
    keys: Object.keys(o),
    id: o.id,
    url: o.url,
    title: o.title,
    business: (o as { business?: unknown }).business,
    created_time: o.created_time,
    location: o.location,
    contact: o.contact,
    user: o.user,
    params: (o as { params?: unknown[] }).params,
    partner: (o as { partner?: unknown }).partner,
    category: (o as { category?: unknown }).category,
  }));
  return new Response(JSON.stringify({ total: (parsed as { metadata?: { total_elements?: number } })?.metadata?.total_elements, count: offers.length, summary }, null, 1).slice(0, 12000), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
