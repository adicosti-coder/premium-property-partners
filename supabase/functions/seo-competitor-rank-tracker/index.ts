// Weekly SERP rank tracker: for top 20 queries (or explicit list), Firecrawl-search Google
// and store our position + competitor positions in seo_competitor_rankings.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COMPETITORS = ["storia.ro", "imobiliare.ro", "olx.ro", "anuntul.ro"];
const OUR_DOMAIN = "realtrust.ro";

function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_KEY) return json({ error: "FIRECRAWL_API_KEY missing" }, 503);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const explicitQueries: string[] = Array.isArray(body?.queries) ? body.queries : [];
    const limit = Math.min(20, Math.max(1, Number(body?.limit) || 20));

    let queries = explicitQueries;
    if (queries.length === 0) {
      const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
      const start = new Date(end); start.setUTCDate(start.getUTCDate() - 28);
      const { data: rows } = await sb
        .from("seo_gsc_daily")
        .select("query, impressions")
        .gte("date", start.toISOString().slice(0, 10))
        .lte("date", end.toISOString().slice(0, 10))
        .neq("query", "")
        .limit(50000);
      const byQ = new Map<string, number>();
      for (const r of rows || []) byQ.set(r.query, (byQ.get(r.query) || 0) + r.impressions);
      queries = [...byQ.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([q]) => q);
    }
    if (queries.length === 0) return json({ success: true, message: "No queries to track" });

    const today = new Date().toISOString().slice(0, 10);
    const allInserts: any[] = [];

    for (const q of queries) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 10, lang: "ro", country: "ro" }),
        });
        if (!res.ok) { console.warn("firecrawl search fail", q, res.status); continue; }
        const data = await res.json();
        const results: any[] = data?.data?.web || data?.data || data?.results || [];
        const tracked = new Set([OUR_DOMAIN, ...COMPETITORS]);
        const seenDomains = new Set<string>();

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const url = r.url || r.link;
          if (!url) continue;
          const host = hostOf(url);
          const matched = [...tracked].find(d => host.endsWith(d));
          if (!matched || seenDomains.has(matched)) continue;
          seenDomains.add(matched);
          allInserts.push({
            date: today, query: q, domain: matched,
            position: i + 1, url, title: (r.title || "").slice(0, 300),
            is_us: matched === OUR_DOMAIN,
          });
        }
        // Record domains not found in top 10 as null position
        for (const d of tracked) {
          if (!seenDomains.has(d)) {
            allInserts.push({ date: today, query: q, domain: d, position: null, url: null, title: null, is_us: d === OUR_DOMAIN });
          }
        }
      } catch (e) {
        console.error("query", q, e);
      }
    }

    if (allInserts.length) {
      for (let i = 0; i < allInserts.length; i += 200) {
        await sb.from("seo_competitor_rankings").upsert(allInserts.slice(i, i + 200), { onConflict: "date,query,domain" });
      }
    }
    return json({ success: true, queries: queries.length, rows: allInserts.length });
  } catch (e) {
    console.error("seo-competitor-rank-tracker", e);
    return json({ error: (e as Error).message }, 500);
  }
});
