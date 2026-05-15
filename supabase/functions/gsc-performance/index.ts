import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);

function isoDaysAgo(d: number) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - d);
  return dt.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!LOVABLE_API_KEY || !GSC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Search Console nu este conectat." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_API_KEY,
      "Content-Type": "application/json",
    };

    const days = 28;
    const startDate = isoDaysAgo(days);
    const endDate = isoDaysAgo(2); // GSC has ~2 day lag

    const queryEndpoint = `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`;

    // Run 4 queries in parallel
    const [byDayRes, totalsRes, queriesRes, pagesRes] = await Promise.all([
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["date"], rowLimit: 1000 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, rowLimit: 1 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 10 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 10 }) }),
    ]);

    const byDay = byDayRes.ok ? await byDayRes.json() : { rows: [] };
    const totals = totalsRes.ok ? await totalsRes.json() : { rows: [] };
    const queries = queriesRes.ok ? await queriesRes.json() : { rows: [] };
    const pages = pagesRes.ok ? await pagesRes.json() : { rows: [] };

    const trend = (byDay.rows || []).map((r: any) => ({
      date: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    const totalRow = (totals.rows && totals.rows[0]) || {};
    const summary = {
      clicks: totalRow.clicks || 0,
      impressions: totalRow.impressions || 0,
      ctr: Number(((totalRow.ctr || 0) * 100).toFixed(2)),
      position: Number((totalRow.position || 0).toFixed(1)),
      startDate,
      endDate,
      site: SITE,
    };

    const topQueries = (queries.rows || []).map((r: any) => ({
      query: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    const topPages = (pages.rows || []).map((r: any) => ({
      page: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    return new Response(
      JSON.stringify({ summary, trend, topQueries, topPages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("gsc-performance error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Eroare necunoscută" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
