import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);

const SITEMAPS = [
  "https://realtrust.ro/sitemap.xml",
  "https://realtrust.ro/sitemap-static.xml",
  "https://realtrust.ro/functions/v1/generate-sitemap",
  "https://realtrust.ro/functions/v1/generate-blog-sitemap",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY || !GSC_API_KEY) {
    return new Response(JSON.stringify({ error: "Google Search Console nu este conectat." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GSC_API_KEY,
  };

  let urls = SITEMAPS;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.urls) && body.urls.length) urls = body.urls;
    }
  } catch { /* ignore */ }

  const results: Array<{ url: string; ok: boolean; status: number; error?: string }> = [];
  for (const sm of urls) {
    const endpoint = `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/sitemaps/${encodeURIComponent(sm)}`;
    try {
      const res = await fetch(endpoint, { method: "PUT", headers });
      const text = res.ok ? "" : await res.text().catch(() => "");
      results.push({ url: sm, ok: res.ok, status: res.status, error: text || undefined });
    } catch (e) {
      results.push({ url: sm, ok: false, status: 0, error: (e as Error).message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return new Response(
    JSON.stringify({ submitted: okCount, total: results.length, results, at: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
