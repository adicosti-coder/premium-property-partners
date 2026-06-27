// Quick Test endpoint: runs ONE search query against a chosen portal using
// the keyword's query_template (or raw keyword) and returns the first
// matching URLs without inserting anything. Uses DuckDuckGo HTML (free,
// no API key) so admins get an instant payload preview.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PORTAL_SITE: Record<string, string> = {
  "OLX": "olx.ro",
  "Storia.ro": "storia.ro",
  "imobiliare.ro": "imobiliare.ro",
  "Publi24": "publi24.ro",
  "BursaImobiliara.ro": "bursaimobiliara.ro",
  "Facebook Marketplace": "facebook.com/marketplace",
  "Facebook Groups": "facebook.com/groups",
};

function buildQuery(template: string | null, keyword: string, sitePortal: string | null): string {
  const base = (template && template.trim())
    ? template.replace(/\{keyword\}/gi, keyword)
    : keyword;
  if (sitePortal && !/site:/i.test(base)) {
    return `${base} site:${sitePortal}`;
  }
  return base;
}

async function ddgSearch(q: string, limit: number): Promise<{ title: string; url: string; snippet: string }[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 RealTrustBot/1.0",
      "Accept-Language": "ro,en;q=0.8",
    },
  });
  const html = await r.text();
  const items: { title: string; url: string; snippet: string }[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && items.length < limit) {
    let raw = m[1];
    try {
      const u = new URL(raw, "https://duckduckgo.com");
      const real = u.searchParams.get("uddg");
      if (real) raw = decodeURIComponent(real);
    } catch { /* keep raw */ }
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const snippet = (m[3] || "").replace(/<[^>]+>/g, "").trim();
    if (raw && /^https?:\/\//.test(raw)) items.push({ title, url: raw, snippet });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response(JSON.stringify({ success: false, error: "Auth required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userClient.auth.getUser(token);
    if (!u?.user) return new Response(JSON.stringify({ success: false, error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supabase.from("user_roles").select("role")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ success: false, error: "Admin required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({} as any));
    const keywordId: string | undefined = body?.keyword_id;
    const portalOverride: string | undefined = body?.portal;
    const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 25);
    if (!keywordId) return new Response(JSON.stringify({ success: false, error: "keyword_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: kw, error: kwErr } = await supabase
      .from("scraper_search_keywords")
      .select("id, keyword, platform, query_template")
      .eq("id", keywordId)
      .maybeSingle();
    if (kwErr || !kw) return new Response(JSON.stringify({ success: false, error: "Keyword not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const portalLabel = portalOverride || kw.platform || "General";
    const sitePortal = PORTAL_SITE[portalLabel] || null;
    const finalQuery = buildQuery(kw.query_template ?? null, kw.keyword, sitePortal);

    const t0 = Date.now();
    const results = await ddgSearch(finalQuery, limit);
    const elapsed = Date.now() - t0;

    // Stamp last_test_at (best-effort)
    await supabase.from("scraper_search_keywords")
      .update({ last_test_at: new Date().toISOString() })
      .eq("id", keywordId);

    return new Response(JSON.stringify({
      success: true,
      keyword: { id: kw.id, keyword: kw.keyword, platform: kw.platform, query_template: kw.query_template },
      portal: portalLabel,
      final_query: finalQuery,
      elapsed_ms: elapsed,
      result_count: results.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
