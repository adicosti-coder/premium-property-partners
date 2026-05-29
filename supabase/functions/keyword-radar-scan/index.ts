// Keyword Radar — Scan
// Picks the top N keywords (by priority + staleness) from `keyword_radar_queries`
// and for each one invokes `scrape-prospects` (per platform) with the keyword as
// the custom query. Results land in `prospect_listings` via the existing
// pipeline (dedup, agency detection, predictive_score, etc.).
//
// Triggered by daily cron at 06:00 (after discover) OR manually by admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// No explicit auth gate — matches scrape-prospects pattern. Service-role
// key used internally for DB mutations.

function platformDomain(p: string): string | null {
  const m: Record<string, string> = {
    "OLX": "olx.ro",
    "Storia.ro": "storia.ro",
    "imobiliare.ro": "imobiliare.ro",
  };
  return m[p] || null;
}

// Hospitality platforms are NOT scraped into prospect_listings (they would
// never be published on realtrust.ro). Instead they feed `pm_collaboration_leads`
// via the dedicated `pm-leads-scan` function — for Andrei's PM outreach.
const PM_LEAD_PLATFORMS: Record<string, "booking" | "airbnb"> = {
  "Booking.com": "booking",
  "Airbnb": "airbnb",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );


  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty body ok */ }
  const limit = Math.min(Math.max(Number(body?.limit) || 15, 1), 50);
  const staleAfterHours = Number(body?.stale_hours) || 24;
  const onlyKeywordIds: string[] | undefined = Array.isArray(body?.keyword_ids) ? body.keyword_ids : undefined;

  const startedAt = Date.now();
  const { data: runRow } = await supabase.from("keyword_radar_runs")
    .insert({ run_type: "scan", triggered_by: body?.triggered_by || "api" })
    .select("id").single();
  const runId = runRow?.id;

  const stats: Record<string, number> = {
    keywords_scanned: 0,
    platforms_called: 0,
    total_results: 0,
    errors: 0,
  };
  const details: any[] = [];

  try {
    // Pick keywords: filter by ids if provided, otherwise priority + staleness
    let query = supabase
      .from("keyword_radar_queries")
      .select("id, keyword, category, platforms, priority_score, last_scanned_at")
      .eq("is_active", true);

    if (onlyKeywordIds && onlyKeywordIds.length > 0) {
      query = query.in("id", onlyKeywordIds);
    } else {
      const cutoff = new Date(Date.now() - staleAfterHours * 3600 * 1000).toISOString();
      // Stale = never scanned OR scanned before cutoff
      query = query.or(`last_scanned_at.is.null,last_scanned_at.lt.${cutoff}`);
    }
    query = query.order("priority_score", { ascending: false })
      .order("last_scanned_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    const { data: kws, error: kwErr } = await query;
    if (kwErr) throw kwErr;

    const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    for (const kw of (kws || [])) {
      stats.keywords_scanned++;
      let kwResults = 0;
      const kwDetail: any = { id: kw.id, keyword: kw.keyword, platforms: {} };

      for (const platform of (kw.platforms as string[])) {
        const pmPlatform = PM_LEAD_PLATFORMS[platform];
        const domain = platformDomain(platform);
        if (!pmPlatform && !domain) continue;
        stats.platforms_called++;

        try {
          let resp: Response;
          if (pmPlatform) {
            // Route Booking/Airbnb → PM collaboration leads (NOT published on site)
            resp = await fetch(`${PROJECT_URL}/functions/v1/pm-leads-scan`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "apikey": SERVICE_KEY,
              },
              body: JSON.stringify({
                keyword: kw.keyword,
                platform: pmPlatform,
                keyword_id: kw.id,
                max_results: 8,
                triggered_by: "keyword-radar",
              }),
            });
          } else {
            const customQuery = `${kw.keyword} site:${domain}`;
            resp = await fetch(`${PROJECT_URL}/functions/v1/scrape-prospects`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "apikey": SERVICE_KEY,
              },
              body: JSON.stringify({
                custom_query: customQuery,
                only_new_sources: true,
                preserve_agency_filter: true,
                discovery_mode: true,
                max_results: 5,
                source_label: `keyword-radar:${kw.id}`,
              }),
            });
          }
          const j = await resp.json().catch(() => ({}));
          const cnt = Number(j?.inserted || j?.results?.length || 0);
          kwResults += cnt;
          kwDetail.platforms[platform] = {
            ok: resp.ok,
            inserted: cnt,
            route: pmPlatform ? "pm-leads" : "prospects",
          };
          if (!resp.ok) stats.errors++;
        } catch (e) {
          stats.errors++;
          kwDetail.platforms[platform] = { ok: false, error: String(e) };
        }
      }

      stats.total_results += kwResults;
      details.push(kwDetail);

      // Update keyword row
      await supabase.from("keyword_radar_queries").update({
        last_scanned_at: new Date().toISOString(),
        results_count: kwResults,
        total_results_count: (kw as any).total_results_count
          ? Number((kw as any).total_results_count) + kwResults
          : kwResults,
        scan_count: ((kw as any).scan_count || 0) + 1,
        last_error: null,
      }).eq("id", kw.id);
    }

    const status = stats.errors === 0 ? "success" : stats.total_results > 0 ? "partial" : "failed";
    await supabase.from("keyword_radar_runs").update({
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status,
      stats: { ...stats, details: details.slice(0, 50) },
    }).eq("id", runId);

    return new Response(JSON.stringify({ success: true, stats, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("keyword_radar_runs").update({
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      status: "failed",
      stats,
      error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
