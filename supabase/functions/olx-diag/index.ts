import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const url = typeof body.url === 'string'
    ? body.url
    : 'https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/timisoara/?search%5Bprivate_business%5D=1';
  const out: Record<string, unknown> = { url };

  const sd = Deno.env.get('SCRAPE_DO_API_KEY') || '';
  if (sd) {
    try {
      const r = await fetch(`https://api.scrape.do/?token=${encodeURIComponent(sd)}&url=${encodeURIComponent(url)}&render=true&super=true&geoCode=ro`);
      const t = await r.text();
      out.scrapedo = { status: r.status, len: t.length, offers: (t.match(/\/d\/oferta\//g) || []).length, sample: t.slice(0, 300) };
    } catch (e) { out.scrapedo = { error: (e as Error).message }; }
  }

  const fc = Deno.env.get('FIRECRAWL_API_KEY') || '';
  if (fc) {
    out.fcKeyPrefix = fc.slice(0, 5);
    try {
      const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${fc}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['html', 'links'], onlyMainContent: false, proxy: 'stealth', waitFor: 2500, location: { country: 'RO', languages: ['ro-RO'] } }),
      });
      const j = await r.json().catch(() => ({}));
      const doc = (j as { data?: Record<string, unknown> }).data ?? (j as Record<string, unknown>);
      const html = typeof doc.html === 'string' ? doc.html : '';
      const links = Array.isArray(doc.links) ? (doc.links as unknown[]).map((l) => (typeof l === 'string' ? l : (l as { url?: string })?.url)) : [];
      out.firecrawl = {
        status: r.status,
        htmlLen: html.length,
        offersInHtml: (html.match(/\/d\/oferta\//g) || []).length,
        linkCount: links.length,
        offerLinks: links.filter((l) => typeof l === 'string' && l.includes('/d/oferta/')).slice(0, 5),
        htmlSample: html.slice(0, 400),
        err: (j as { error?: unknown }).error ?? null,
      };
    } catch (e) { out.firecrawl = { error: (e as Error).message }; }
  }

  return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
