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
const DEFAULT_MAX_RUNTIME_MS = 40_000;
// Credit saver: on scheduled runs we only try the richest few sources per keyword.
const DEFAULT_MAX_PLATFORMS = 3;
// Un singur cuvânt-cheie nu poate consuma tot bugetul rulării.
const DEFAULT_MAX_KEYWORD_MS = 12_000;
// O sursă lentă este abandonată repede, nu blochează cuvântul.
const DEFAULT_MAX_PLATFORM_MS = 8_000;
// Peste acest prag o sursă e considerată „lentă" și primește mai puțin timp,
// pentru că oricum depășește bugetul și blochează restul scanării.
const SLOW_SOURCE_MS = 6_000;
// Adaptiv:
//  - sursă rapidă (medie < 6s): 1.5x media ei, minim 3.5s;
//  - sursă lentă (medie >= 6s): doar 5s — dacă nu răspunde, trecem imediat mai departe.
const adaptiveTimeout = (avgMs: number | undefined, cap: number, timeoutStreak = 0) => {
  if (!avgMs || avgMs <= 0) return cap;
  if (avgMs >= SLOW_SOURCE_MS) return Math.min(cap, 5_000);
  const base = Math.max(3_500, Math.min(cap, Math.round(avgMs * 1.5)));
  // O sursă care a dat timeout recent primește și mai puțin timp.
  return timeoutStreak > 0 ? Math.max(3_000, Math.round(base * 0.7)) : base;
};

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
  const maxRuntimeMs = Math.min(
    Math.max(Number(body?.max_runtime_ms) || DEFAULT_MAX_RUNTIME_MS, 10_000),
    50_000,
  );
  // Manual scans (keyword_ids) pot folosi toate sursele; cron-ul rămâne econom.
  const maxPlatforms = onlyKeywordIds
    ? 99
    : Math.min(Math.max(Number(body?.max_platforms) || DEFAULT_MAX_PLATFORMS, 1), 10);
  const maxKeywordMs = Math.min(
    Math.max(Number(body?.max_keyword_ms) || DEFAULT_MAX_KEYWORD_MS, 4_000),
    30_000,
  );
  const maxPlatformMs = Math.min(
    Math.max(Number(body?.max_platform_ms) || DEFAULT_MAX_PLATFORM_MS, 3_000),
    20_000,
  );

  const startedAt = Date.now();
  const { data: runRow } = await supabase.from("keyword_radar_runs")
    .insert({ run_type: "scan", triggered_by: body?.triggered_by || "api", status: "running" })
    .select("id").single();
  const runId = runRow?.id;

  // Configurare per platformă (sursă oprită / câte anunțuri pe căutare / filtre)
  type PlatformCfg = {
    is_enabled: boolean;
    owner_only: boolean;
    max_results: number;
    min_price: number | null;
    max_price: number | null;
    min_rooms: number | null;
    max_rooms: number | null;
    zones: string[] | null;
  };
  const platformCfg = new Map<string, PlatformCfg>();
  try {
    const { data: cfgRows } = await supabase
      .from("platform_scan_config")
      .select("platform,is_enabled,owner_only,max_results,min_price,max_price,min_rooms,max_rooms,zones");
    for (const row of cfgRows || []) {
      platformCfg.set(String((row as any).platform), row as unknown as PlatformCfg);
    }
  } catch (_) { /* fără configurare: se folosesc valorile implicite */ }

  const stats: Record<string, number> = {
    keywords_scanned: 0,
    platforms_called: 0,
    total_results: 0,
    errors: 0,
  };
  const details: any[] = [];
  // Progres live: scris în `keyword_radar_runs.stats.progress` după fiecare pas,
  // ca raportul din Admin să arate exact unde e scanarea în timp ce rulează.
  const progress: Record<string, any> = {
    total_keywords: 0,
    current_keyword: null,
    current_platform: null,
    keyword_index: 0,
    updated_at: new Date().toISOString(),
  };
  let lastProgressWrite = 0;
  const pushProgress = async (force = false) => {
    if (!runId) return;
    const now = Date.now();
    if (!force && now - lastProgressWrite < 1200) return;
    lastProgressWrite = now;
    progress.updated_at = new Date().toISOString();
    progress.elapsed_ms = now - startedAt;
    progress.budget_ms = maxRuntimeMs;
    try {
      await supabase.from("keyword_radar_runs").update({
        status: "running",
        stats: { ...stats, progress, details: details.slice(0, 50) },
      }).eq("id", runId);
    } catch (_) { /* progresul nu trebuie să oprească scanarea */ }
  };

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

    progress.total_keywords = kws?.length || 0;
    await pushProgress(true);

    for (const kw of (kws || [])) {
      if (Date.now() - startedAt > maxRuntimeMs) {
        // Oprim complet bucla: restul cuvintelor rămân „stale" și intră la rularea următoare.
        stats.skipped_time_budget =
          (stats.skipped_time_budget || 0) + ((kws?.length || 0) - stats.keywords_scanned);
        break;
      }
      stats.keywords_scanned++;
      // Buget propriu pe cuvânt-cheie: nu mai mult decât ce a rămas din rulare,
      // împărțit echitabil între cuvintele rămase.
      const remainingRunMs = maxRuntimeMs - (Date.now() - startedAt);
      const remainingKeywords = Math.max(1, (kws?.length || 1) - stats.keywords_scanned + 1);
      const keywordStartedAt = Date.now();
      const keywordBudgetMs = Math.max(
        4_000,
        Math.min(maxKeywordMs, Math.ceil(remainingRunMs / remainingKeywords) + 3_000),
      );
      progress.keyword_index = stats.keywords_scanned;
      progress.current_keyword = kw.keyword;
      progress.current_platform = null;
      await pushProgress(true);
      let kwResults = 0;
      const kwErrors: string[] = [];
      const kwDetail: any = { id: kw.id, keyword: kw.keyword, platforms: {} };

      // Credit saver: remember per-platform yield. Platforms are tried richest
      // first, and one that returned nothing 4 scans in a row is skipped until
      // an admin scans that keyword explicitly (keyword_ids in the body).
      const meta: any = (kw.metadata && typeof kw.metadata === "object") ? { ...kw.metadata } : {};
      const pstats: Record<
        string,
        { total: number; zero_streak: number; calls?: number; avg_ms?: number; timeout_streak?: number }
      > = (meta.platform_stats && typeof meta.platform_stats === "object") ? { ...meta.platform_stats } : {};
      // Randament mediu pe apel (nu total brut): sursele noi sunt încercate
      // înaintea celor testate deja fără rezultate.
      const yieldOf = (p: string) => {
        const s = pstats[p];
        if (!s) return Number.POSITIVE_INFINITY;
        const calls = Math.max(1, Number(s.calls || 1));
        return (Number(s.total) || 0) / calls;
      };
      // La randament egal, sursa mai rapidă merge prima: scanarea completă se termină mai repede.
      const speedOf = (p: string) => Number(pstats[p]?.avg_ms || 0) || 0;
      const platformList = [...(kw.platforms as string[])]
        .sort((a, b) => (yieldOf(b) - yieldOf(a)) || (speedOf(a) - speedOf(b)))
        .slice(0, maxPlatforms);

      for (const platform of platformList) {
        if (Date.now() - startedAt > maxRuntimeMs) {
          stats.skipped_time_budget = (stats.skipped_time_budget || 0) + 1;
          break;
        }
        // Bugetul cuvântului s-a epuizat: trecem la următorul, nu blocăm rularea.
        if (Date.now() - keywordStartedAt > keywordBudgetMs) {
          stats.skipped_keyword_budget = (stats.skipped_keyword_budget || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "keyword_budget" };
          continue;
        }
        // Sursele fără rezultate se sar, dar se reîncearcă la fiecare a 6-a rulare,
        // ca o sursă temporar goală să nu rămână blocată definitiv.
        const zstreak = pstats[platform]?.zero_streak || 0;
        if (!onlyKeywordIds && zstreak >= 4 && zstreak % 6 !== 0) {
          stats.skipped_low_yield = (stats.skipped_low_yield || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "low_yield" };
          continue;
        }
        // Sursele care au dat timeout de 2 ori la rând se sar temporar (reîncercare
        // la fiecare a 5-a rulare): nu mai consumăm bugetul pe surse blocate.
        const tstreak = pstats[platform]?.timeout_streak || 0;
        if (!onlyKeywordIds && tstreak >= 2 && tstreak % 5 !== 0) {
          stats.skipped_slow = (stats.skipped_slow || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "slow_source" };
          continue;
        }
        // Sursele constant foarte lente (peste 9s medie, după cel puțin 3 verificări)
        // se sar în rulările programate și se reîncearcă la fiecare a 8-a rulare:
        // altfel o singură sursă consumă tot bugetul scanării.
        const avgMsHist = Number(pstats[platform]?.avg_ms || 0);
        const callsHist = Number(pstats[platform]?.calls || 0);
        if (!onlyKeywordIds && callsHist >= 3 && avgMsHist >= 9_000 && callsHist % 8 !== 0) {
          stats.skipped_very_slow = (stats.skipped_very_slow || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "very_slow_source", avg_ms: avgMsHist };
          continue;
        }
        // Sursă oprită manual din „Configurare pe platformă"
        const cfg = platformCfg.get(platform);
        if (cfg && cfg.is_enabled === false) {
          stats.skipped_disabled = (stats.skipped_disabled || 0) + 1;
          kwDetail.platforms[platform] = { skipped: "disabled" };
          continue;
        }
        const pmPlatform = PM_LEAD_PLATFORMS[platform];
        const domain = platformDomain(platform);
        if (!pmPlatform && !domain) continue;
        stats.platforms_called++;
        progress.current_platform = platform;
        await pushProgress();
        const platformStartedAt = Date.now();

        // Timeout dur pe sursă, adaptat la viteza ei istorică: dacă nu răspunde, abandonăm apelul.
        const platformTimeoutMs = Math.max(
          3_000,
          Math.min(
            adaptiveTimeout(
              pstats[platform]?.avg_ms,
              maxPlatformMs,
              Number(pstats[platform]?.timeout_streak) || 0,
            ),
            keywordBudgetMs - (Date.now() - keywordStartedAt),
          ),
        );
        const abort = AbortSignal.timeout(platformTimeoutMs);

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
              signal: abort,
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
                preserve_agency_filter: cfg?.owner_only !== false,
                discovery_mode: true,
                max_results: Math.min(Math.max(Number(cfg?.max_results) || 5, 1), 20),
                min_price: cfg?.min_price ?? undefined,
                max_price: cfg?.max_price ?? undefined,
                min_rooms: cfg?.min_rooms ?? undefined,
                max_rooms: cfg?.max_rooms ?? undefined,
                zones: cfg?.zones?.length ? cfg.zones : undefined,
                source_label: `keyword-radar:${kw.id}`,
              }),
              signal: abort,
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
          const fb = j?.funnel_breakdown || {};
          kwDetail.platforms[platform] = {
            ok: resp.ok,
            inserted: cnt,
            duration_ms: Date.now() - platformStartedAt,
            agency: Number(fb.agency_signal || 0) || 0,
            duplicate: Number(fb.duplicate || 0) || 0,
            route: pmPlatform ? "pm-leads" : "prospects",
          };
          const cur = pstats[platform] || { total: 0, zero_streak: 0, calls: 0 };
          const took = Date.now() - platformStartedAt;
          const prevCalls = Number(cur.calls) || 0;
          pstats[platform] = {
            total: (Number(cur.total) || 0) + cnt,
            zero_streak: cnt > 0 ? 0 : (Number(cur.zero_streak) || 0) + 1,
            calls: prevCalls + 1,
            // medie glisantă a duratei, folosită pentru timeout adaptiv
            avg_ms: Math.round(((Number(cur.avg_ms) || took) * Math.min(prevCalls, 9) + took) /
              (Math.min(prevCalls, 9) + 1)),
            timeout_streak: 0,
          };
          if (!resp.ok) {
            stats.errors++;
            kwErrors.push(`${platform}: http_${resp.status}${j?.error ? ` ${String(j.error).slice(0, 120)}` : ""}`);
          }
        } catch (e) {
          const timedOut = String(e).includes("Timeout") || String(e).includes("abort");
          const cur = pstats[platform] || { total: 0, zero_streak: 0, calls: 0 };
          const failedAfter = Date.now() - platformStartedAt;
          const prevCallsF = Number(cur.calls) || 0;
          // Durata reală se măsoară și când sursa nu răspunde, ca panoul „surse lente"
          // să arate timpul adevărat, nu doar numărul de depășiri.
          const avgF = Math.round(
            ((Number(cur.avg_ms) || failedAfter) * Math.min(prevCallsF, 9) + failedAfter) /
              (Math.min(prevCallsF, 9) + 1),
          );
          if (timedOut) {
            stats.timeouts = (stats.timeouts || 0) + 1;
            kwDetail.platforms[platform] = {
              ok: false,
              timeout_ms: platformTimeoutMs,
              duration_ms: failedAfter,
            };
            pstats[platform] = {
              ...cur,
              calls: prevCallsF + 1,
              avg_ms: avgF,
              timeout_streak: (Number(cur.timeout_streak) || 0) + 1,
            };
          } else {
            stats.errors++;
            kwDetail.platforms[platform] = { ok: false, error: String(e), duration_ms: failedAfter };
            pstats[platform] = { ...cur, calls: prevCallsF + 1, avg_ms: avgF };
          }
          kwErrors.push(`${platform}: ${timedOut ? `timeout ${platformTimeoutMs}ms` : String(e).slice(0, 140)}`);
        }
        await pushProgress();
      }

      stats.total_results += kwResults;
      details.push(kwDetail);
      progress.current_platform = null;
      await pushProgress(true);

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
      stats: {
        ...stats,
        details: details.slice(0, 50),
        progress: { ...progress, current_keyword: null, current_platform: null, done: true },
      },
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
