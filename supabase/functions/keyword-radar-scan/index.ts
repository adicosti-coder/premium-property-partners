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
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

// No explicit auth gate — matches scrape-prospects pattern. Service-role
// key used internally for DB mutations.

function platformDomain(p: string): string | null {
  const m: Record<string, string> = {
    "OLX": "olx.ro",
    "Storia.ro": "storia.ro",
    "imobiliare.ro": "imobiliare.ro",
    "Publi24": "publi24.ro",
    "BursaImobiliara.ro": "bursaimobiliara.ro",
    "Anunturi-Imobiliare.ro": "anunturi-imobiliare.ro",
  };
  if (m[p]) return m[p];
  const k = (p || "").toLowerCase();
  if (k.includes("olx")) return "olx.ro";
  if (k.includes("storia")) return "storia.ro";
  if (k.includes("publi24")) return "publi24.ro";
  if (k.includes("bursa")) return "bursaimobiliara.ro";
  if (k.includes("imobiliare")) return "imobiliare.ro";
  return null;
}

// Hard time budget: edge functions are killed around 60s. Stop the keyword loop
// before that so the run is recorded as `partial` instead of vanishing.
const MAX_RUNTIME_MS = 45_000;

// Hospitality platforms are NOT scraped into prospect_listings (they would
// never be published on realtrust.ro). Instead they feed `pm_collaboration_leads`
// via the dedicated `pm-leads-scan` function — for Andrei's PM outreach.
const PM_LEAD_PLATFORMS: Record<string, "booking" | "airbnb"> = {
  "Booking.com": "booking",
  "Airbnb": "airbnb",
};

import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;


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
      .select("id, keyword, category, platforms, priority_score, last_scanned_at, total_results_count, scan_count, metadata")
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
      if (Date.now() - startedAt > MAX_RUNTIME_MS) {
        stats.skipped_time_budget = (stats.skipped_time_budget || 0) + 1;
        continue;
      }
      stats.keywords_scanned++;
      let kwResults = 0;
      const kwErrors: string[] = [];
      const kwDetail: any = { id: kw.id, keyword: kw.keyword, platforms: {} };

      // Credit saver: remember per-platform yield. Platforms are tried richest
      // first, and one that returned nothing 4 scans in a row is skipped until
      // an admin scans that keyword explicitly (keyword_ids in the body).
      const meta: any = (kw.metadata && typeof kw.metadata === "object") ? { ...kw.metadata } : {};
      const pstats: Record<string, { total: number; zero_streak: number }> =
        (meta.platform_stats && typeof meta.platform_stats === "object") ? { ...meta.platform_stats } : {};
      const platformList = [...(kw.platforms as string[])].sort(
        (a, b) => (pstats[b]?.total || 0) - (pstats[a]?.total || 0),
      );

      for (const platform of platformList) {
        if (Date.now() - startedAt > MAX_RUNTIME_MS) {
          stats.skipped_time_budget = (stats.skipped_time_budget || 0) + 1;
          break;
        }
        if (!onlyKeywordIds && (pstats[platform]?.zero_streak || 0) >= 4) {
          stats.skipped_low_yield = (stats.skipped_low_yield || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "low_yield" };
          continue;
        }
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
          // scrape-prospects / pm-leads răspund cu chei diferite; le acceptăm pe toate.
          const cnt = Number(
            j?.new_listings ??
              j?.inserted ??
              j?.count ??
              (Array.isArray(j?.listings) ? j.listings.length : undefined) ??
              (Array.isArray(j?.results) ? j.results.length : undefined) ??
              (Array.isArray(j?.leads) ? j.leads.length : undefined) ??
              0,
          ) || 0;
          kwResults += cnt;
          kwDetail.platforms[platform] = {
            ok: resp.ok,
            inserted: cnt,
            route: pmPlatform ? "pm-leads" : "prospects",
          };
          const cur = pstats[platform] || { total: 0, zero_streak: 0 };
          pstats[platform] = {
            total: cur.total + cnt,
            zero_streak: cnt > 0 ? 0 : cur.zero_streak + 1,
          };
          if (!resp.ok) {
            stats.errors++;
            kwErrors.push(`${platform}: http_${resp.status}${j?.error ? ` ${String(j.error).slice(0, 120)}` : ""}`);
          }
        } catch (e) {
          stats.errors++;
          kwErrors.push(`${platform}: ${String(e).slice(0, 140)}`);
          kwDetail.platforms[platform] = { ok: false, error: String(e) };
        }
      }

      stats.total_results += kwResults;
      details.push(kwDetail);

      // Update keyword row (cumulative counters read from the actual row)
      await supabase.from("keyword_radar_queries").update({
        last_scanned_at: new Date().toISOString(),
        results_count: kwResults,
        total_results_count: Number(kw.total_results_count || 0) + kwResults,
        scan_count: Number(kw.scan_count || 0) + 1,
        last_error: kwErrors.length ? kwErrors.join(" | ").slice(0, 500) : null,
        metadata: { ...meta, platform_stats: pstats },
      }).eq("id", kw.id);
    }

    const status = stats.errors === 0
      ? (stats.skipped_time_budget ? "partial" : "success")
      : stats.total_results > 0 ? "partial" : "failed";
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
