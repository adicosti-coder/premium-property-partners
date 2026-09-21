import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const url = typeof body.url === 'string'
    ? body.url
    : 'https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/timisoara/?search%5Bprivate_business%5D=1';
  const waitFor = typeof body.waitFor === 'number' ? body.waitFor : 6000;
  const formats = Array.isArray(body.formats) ? body.formats : ['rawHtml', 'links'];
  const out: Record<string, unknown> = { url, waitFor, formats };

  const fc = Deno.env.get('FIRECRAWL_API_KEY') || '';
  try {
    const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${fc}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats, onlyMainContent: false, proxy: 'stealth', waitFor, location: { country: 'RO', languages: ['ro-RO'] } }),
    });
    const j = await r.json().catch(() => ({}));
    const doc = (j as { data?: Record<string, unknown> }).data ?? (j as Record<string, unknown>);
    const html = typeof doc.rawHtml === 'string' ? doc.rawHtml : typeof doc.html === 'string' ? doc.html : '';
    const md = typeof doc.markdown === 'string' ? doc.markdown : '';
    const links = Array.isArray(doc.links) ? (doc.links as unknown[]).map((l) => (typeof l === 'string' ? l : (l as { url?: string })?.url)) : [];
    out.firecrawl = {
      status: r.status,
      htmlLen: html.length,
      mdLen: md.length,
      offersInHtml: (html.match(/\/d\/oferta\//g) || []).length,
      offersInMd: (md.match(/\/d\/oferta\//g) || []).length,
      linkCount: links.length,
      offerLinks: links.filter((l) => typeof l === 'string' && l.includes('/d/oferta/')).slice(0, 5),
      sample: (md || html).slice(0, 500),
      err: (j as { error?: unknown }).error ?? null,
    };
  } catch (e) { out.firecrawl = { error: (e as Error).message }; }

  return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
