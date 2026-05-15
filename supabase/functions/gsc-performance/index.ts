import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    let days = 28;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const d = Number(body?.days);
        if ([7, 28, 90].includes(d)) days = d;
      }
    } catch (_) { /* ignore */ }
    const startDate = isoDaysAgo(days);
    const endDate = isoDaysAgo(2); // GSC has ~2 day lag

    const queryEndpoint = `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`;

    // Run 4 queries in parallel
    const [byDayRes, totalsRes, queriesRes, pagesRes] = await Promise.all([
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["date"], rowLimit: 1000 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, rowLimit: 1 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 100 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 100 }) }),
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

    // Correlate with leads from DB in same window
    let leadsTotal = 0;
    let leadsByDay: Array<{ date: string; leads: number }> = [];
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: leadsRows } = await sb
        .from("leads")
        .select("created_at")
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);
      const counts: Record<string, number> = {};
      (leadsRows || []).forEach((r: any) => {
        const d = String(r.created_at).slice(0, 10);
        counts[d] = (counts[d] || 0) + 1;
      });
      leadsTotal = (leadsRows || []).length;
      leadsByDay = Object.entries(counts).map(([date, leads]) => ({ date, leads })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      console.error("leads correlation error:", e);
    }

    const conversionRate = summary.clicks > 0 ? Number(((leadsTotal / summary.clicks) * 100).toFixed(2)) : 0;

    // Merge leads into trend by date
    const leadsMap = new Map(leadsByDay.map((l) => [l.date, l.leads]));
    const trendWithLeads = trend.map((t: any) => ({ ...t, leads: leadsMap.get(t.date) || 0 }));

    return new Response(
      JSON.stringify({ summary, trend: trendWithLeads, topQueries, topPages, leads: { total: leadsTotal, byDay: leadsByDay, conversionRate } }),
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
