// Daily GSC snapshot — pulls per-(query+page) data for a date and upserts into seo_gsc_daily.
// Runs via pg_cron 06:00 each morning. Can be invoked manually with {days: N} to backfill.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);

const isoDay = (offsetDays: number) => {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - offsetDays);
  return dt.toISOString().slice(0, 10);
};

async function fetchRows(date: string, headers: Record<string, string>) {
  const endpoint = `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`;
  const all: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }> = [];
  let startRow = 0;
  for (let i = 0; i < 5; i++) { // up to 5*1000 = 5000 rows / day
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ startDate: date, endDate: date, dimensions: ["query", "page"], rowLimit: 1000, startRow }),
    });
    if (!res.ok) break;
    const data = await res.json();
    const rows = data.rows || [];
    for (const r of rows) {
      all.push({
        query: r.keys[0] || "",
        page: r.keys[1] || "",
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      });
    }
    if (rows.length < 1000) break;
    startRow += 1000;
  }
  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY || !GSC_API_KEY) return json({ error: "GSC not connected" }, 503);

    const headers = {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_API_KEY,
      "Content-Type": "application/json",
    };
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const days = Math.max(1, Math.min(28, Number(body?.days) || 1));

    const summary: Array<{ date: string; rows: number }> = [];
    for (let d = 0; d < days; d++) {
      const date = isoDay(2 + d); // GSC has 2-day lag
      const rows = await fetchRows(date, headers);
      if (rows.length) {
        const records = rows.map(r => ({ date, ...r }));
        // Chunk inserts to 500 to avoid payload limits
        for (let i = 0; i < records.length; i += 500) {
          const chunk = records.slice(i, i + 500);
          const { error } = await sb.from("seo_gsc_daily").upsert(chunk, { onConflict: "date,query,page", ignoreDuplicates: false });
          if (error) console.error("upsert error", date, error);
        }
      }
      summary.push({ date, rows: rows.length });
    }
    return json({ success: true, summary });
  } catch (e) {
    console.error("gsc-daily-snapshot error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
