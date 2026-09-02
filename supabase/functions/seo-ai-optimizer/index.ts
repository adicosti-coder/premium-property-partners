import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { analyzeLocalGeo } from "./localGeo.ts";
import { isClearlyBrokenScrape, isObviouslyInvalidCachedAudit, pickBestScrapeResult } from "./scrapeQuality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

interface RequestBody {
  url: string;
  language?: "ro" | "en";
  forceRefresh?: boolean;
}

// Tunables (centralized so we can adjust without spelunking)
const CONFIG = {
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,         // re-use audit row within 24h unless forceRefresh
  HASH_CACHE_TTL_MS: 14 * 24 * 60 * 60 * 1000, // re-use AI analysis if content_hash unchanged in 14d
  INFLIGHT_TTL_SEC: 90,                        // lock TTL — audit + AI shouldn't exceed this
  AI_TIMEOUT_MS: 38_000,                       // hard cap on Gemini call
  AI_MAX_RETRIES: 2,                           // total attempts = retries + 1
  SCRAPE_TIMEOUT_MS: 25_000,
  SCRAPE_MAX_RETRIES: 1,
  CRON_BATCH: 4,                               // stale URLs scheduled per cron tick
  AI_MODEL: "google/gemini-2.5-pro",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rawBody = await req.json().catch(() => ({} as any));

  // Only trust an internal-cron call when the caller proves it with the shared
  // service-role secret. Presence of a `triggered_by` field or `x-internal-cron: 1`
  // header alone is spoofable, so we always require the secret to bypass admin auth.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const internalSecret = req.headers.get("x-internal-cron-secret") || req.headers.get("x-webhook-secret") || "";
  const hasInternalSecret =
    !!serviceKey && (
      (bearer.length > 0 && bearer === serviceKey) ||
      (internalSecret.length > 0 && internalSecret === serviceKey)
    );
  const isCron = hasInternalSecret && typeof rawBody?.triggered_by === "string" && rawBody.triggered_by.length > 0;
  const isInternal = hasInternalSecret && req.headers.get("x-internal-cron") === "1";

  if (!isCron && !isInternal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // ============= CRON MODE =============
    if (isCron) {
      // Prioritize: lowest-score first, then oldest. Increases chance the cron
      // budget is spent re-auditing pages that actually need help.
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: stale } = await sb
        .from("seo_audits")
        .select("url, language, overall_score, created_at")
        .lt("created_at", sevenDaysAgo)
        .order("overall_score", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true })
        .limit(CONFIG.CRON_BATCH * 4);

      const urls = Array.from(
        new Map(
          (stale ?? [])
            .filter((r: any) => typeof r?.url === "string" && /^https?:\/\//.test(r.url))
            .map((r: any) => [r.url, { url: r.url, language: r.language || "ro" }]),
        ).values(),
      ).slice(0, CONFIG.CRON_BATCH);

      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/seo-ai-optimizer`;
      const dispatches = urls.map((item) =>
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "x-internal-cron": "1",
          },
          body: JSON.stringify({ url: item.url, language: item.language, forceRefresh: true }),
        }).catch((e) => console.error("seo-ai-optimizer cron dispatch failed:", item.url, e?.message))
      );
      EdgeRuntime.waitUntil(Promise.allSettled(dispatches));
      return json({ cron: true, scheduled: urls.length, urls: urls.map((u) => u.url) });
    }

    // ============= SINGLE AUDIT =============
    const { url, language = "ro", forceRefresh = false }: RequestBody = rawBody;
    if (!url || !/^https?:\/\//.test(url)) return json({ error: "URL invalid" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Cache (24h)
    if (!forceRefresh) {
      const { data: cached } = await sb.from("seo_audits")
        .select("*").eq("url", url).eq("language", language)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (
        cached &&
        !isObviouslyInvalidCachedAudit(cached) &&
        (Date.now() - new Date(cached.created_at).getTime()) < CONFIG.CACHE_TTL_MS
      ) {
        return json({ audit: cached, cached: true, cache_source: "audit_row_24h" });
      }
    }

    // Inflight lock — atomic dedup across concurrent triggers (cron + manual click)
    const triggeredBy = isInternal ? "cron" : (rawBody?.triggered_by || "admin_ui");
    const { data: lockAcquired } = await sb.rpc("seo_acquire_audit_lock", {
      p_url: url,
      p_language: language,
      p_ttl_seconds: CONFIG.INFLIGHT_TTL_SEC,
      p_triggered_by: triggeredBy,
    });

    if (lockAcquired === false) {
      return json(
        { error: "Audit already running for this URL — retry in a few seconds", inflight: true },
        409,
      );
    }

    try {
      // 1. Scrape (with retry + timeout)
      const scrapeStart = Date.now();
      const scraped = await scrapePage(url, FIRECRAWL_API_KEY, forceRefresh);
      const scrapeMs = Date.now() - scrapeStart;

      // Nicio sursă de scraping nu a răspuns (ex: credite Firecrawl epuizate / 429).
      // Nu mai continuăm cu AI + salvare pe conținut gol — returnăm un mesaj clar.
      if ((scraped as any).source === "none") {
        return json(
          {
            error: "Audit indisponibil momentan: nu am putut citi pagina (furnizorul de scraping a refuzat cererea). Reîncearcă mai târziu.",
            code: "scrape_unavailable",
            url,
            scrape_ms: scrapeMs,
          },
          503,
        );
      }

      const hashSource = (scraped as any).fullText || scraped.markdown || "";
      const hashBody = hashSource.length > 1500 ? hashSource.slice(1500) : hashSource;
      const contentHash = await sha256(hashBody);

      // 2. Detect duplicate content vs other recent audits
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: duplicates } = await sb.from("seo_audits")
        .select("url, content_hash")
        .eq("content_hash", contentHash)
        .neq("url", url)
        .gte("created_at", sevenDaysAgo)
        .limit(5);

      // 3. Local GEO
      const localGeo = analyzeLocalGeo(scraped.markdown || "");

      // 4. Content-hash cache: if THIS url's last audit had the SAME content_hash
      //    within 14 days, content hasn't drifted → reuse AI suggestions, only
      //    refresh the deterministic score + diagnostics. Saves a full Gemini call.
      let analysis: any = null;
      let aiReused = false;
      let aiAttempts = 0;
      let aiError: string | null = null;
      let aiMs = 0;

      if (!forceRefresh) {
        const hashCacheCutoff = new Date(Date.now() - CONFIG.HASH_CACHE_TTL_MS).toISOString();
        const { data: prior } = await sb.from("seo_audits")
          .select("raw_analysis, suggested_title, suggested_meta, keyword_gaps, strengths, issues, opportunities, local_geo_keywords, local_recommendations, created_at")
          .eq("url", url).eq("language", language)
          .eq("content_hash", contentHash)
          .gte("created_at", hashCacheCutoff)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prior?.raw_analysis) {
          // Recompute deterministic score from current signals (cheap, no AI)
          const { score, breakdown } = calculateDeterministicScore(scraped, localGeo, duplicates || []);
          analysis = {
            ...(prior.raw_analysis as any),
            suggested_title: prior.suggested_title,
            suggested_meta: prior.suggested_meta,
            keyword_gaps: prior.keyword_gaps,
            strengths: prior.strengths,
            issues: prior.issues,
            opportunities: prior.opportunities,
            local_geo_keywords: prior.local_geo_keywords,
            local_recommendations: prior.local_recommendations,
            overall_score: score,
            _score_breakdown: breakdown,
          };
          aiReused = true;
        }
      }

      // 5. Run AI if we don't have a reusable analysis
      if (!analysis) {
        const aiStart = Date.now();
        try {
          const result = await analyzeWithAI(scraped, url, language, duplicates || [], localGeo, LOVABLE_API_KEY);
          analysis = result.analysis;
          aiAttempts = result.attempts;
        } catch (err: any) {
          aiError = err?.message || String(err);
          aiAttempts = err?.attempts || CONFIG.AI_MAX_RETRIES + 1;
          // Graceful fallback: produce a deterministic-only audit so the user
          // at least sees the score & breakdown instead of a 500.
          const { score, breakdown } = calculateDeterministicScore(scraped, localGeo, duplicates || []);
          analysis = {
            overall_score: score,
            _score_breakdown: breakdown,
            suggested_title: null,
            suggested_meta: null,
            keyword_gaps: [],
            strengths: [],
            issues: [{ severity: "warning", issue: "AI suggestions unavailable", fix: `Retry later — ${aiError}` }],
            opportunities: [],
            local_geo_keywords: [],
            local_recommendations: [],
            ai_fallback: true,
            ai_error: aiError,
          };
        }
        aiMs = Date.now() - aiStart;
      }

      const diagnostics = {
        scrape_source: (scraped as any).source || "unknown",
        scrape_ms: scrapeMs,
        title_detected: scraped.title,
        title_length: (scraped.title || "").length,
        meta_chosen: scraped.metaDescription,
        meta_length: (scraped.metaDescription || "").length,
        meta_candidates: (scraped as any).metaCandidatesDebug || [],
        h1_count: scraped.h1Count,
        h2_count: (scraped as any).h2Count ?? null,
        word_count: scraped.wordCount,
        score_breakdown: analysis._score_breakdown || null,
        ai_model: CONFIG.AI_MODEL,
        ai_reused_from_hash: aiReused,
        ai_attempts: aiAttempts,
        ai_ms: aiMs,
        ai_error: aiError,
        force_refresh: forceRefresh,
        audited_at: new Date().toISOString(),
      };
      const enrichedAnalysis = { ...analysis, _diagnostics: diagnostics };

      const { data: saved, error: saveErr } = await sb.from("seo_audits").insert({
        url,
        language,
        page_type: detectPageType(url),
        overall_score: analysis.overall_score,
        title: scraped.title,
        meta_description: scraped.metaDescription,
        h1_count: scraped.h1Count,
        word_count: scraped.wordCount,
        suggested_title: analysis.suggested_title,
        suggested_meta: analysis.suggested_meta,
        keyword_gaps: analysis.keyword_gaps || [],
        strengths: analysis.strengths || [],
        issues: analysis.issues || [],
        opportunities: analysis.opportunities || [],
        raw_analysis: enrichedAnalysis,
        content_hash: contentHash,
        local_relevance_score: localGeo.score,
        local_entities_found: localGeo.found,
        local_entities_missing: localGeo.missing,
        local_geo_keywords: analysis.local_geo_keywords || [],
        local_recommendations: analysis.local_recommendations || [],
      }).select().single();

      if (saveErr) console.error("seo-ai-optimizer save error:", saveErr);

      return json({
        audit: saved,
        cached: false,
        ai_reused: aiReused,
        ai_fallback: !!analysis.ai_fallback,
        duplicates: duplicates || [],
        diagnostics,
      });
    } finally {
      // Always release the lock — even on fallback or error path
      await sb.rpc("seo_release_audit_lock", { p_url: url, p_language: language }).catch(() => {});
    }
  } catch (err: any) {
    console.error("seo-ai-optimizer fatal:", err);
    return json({ error: err?.message || "Unknown" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectPageType(url: string): string {
  if (url.includes("/proprietate/")) return "property_detail";
  if (url.includes("/blog/")) return "blog_article";
  if (url.includes("/imobiliare-timisoara")) return "listings";
  if (url.includes("/cartier") || url.includes("/zona")) return "neighborhood";
  if (url.endsWith("/") || url.match(/realtrust\.ro\/?$/)) return "homepage";
  return "general";
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * fetch with timeout (AbortController) + retry on 429/5xx/network errors,
 * exponential backoff with jitter.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs: number; maxRetries: number; label: string },
): Promise<{ res: Response; attempts: number }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      // Retry on 429 + 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < opts.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        const backoff = retryAfter > 0
          ? Math.min(retryAfter * 1000, 8000)
          : Math.min(800 * Math.pow(2, attempt) + Math.random() * 400, 6000);
        console.warn(`[${opts.label}] retry ${attempt + 1}/${opts.maxRetries} after ${backoff}ms (status ${res.status})`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return { res, attempts: attempt + 1 };
    } catch (e: any) {
      clearTimeout(t);
      lastErr = e;
      const isAbort = e?.name === "AbortError";
      if (attempt < opts.maxRetries) {
        const backoff = Math.min(800 * Math.pow(2, attempt) + Math.random() * 400, 6000);
        console.warn(`[${opts.label}] ${isAbort ? "timeout" : "error"} retry ${attempt + 1}/${opts.maxRetries} in ${backoff}ms: ${e?.message}`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }
  const err: any = new Error(`[${opts.label}] failed after ${opts.maxRetries + 1} attempts: ${(lastErr as any)?.message || "unknown"}`);
  err.attempts = opts.maxRetries + 1;
  throw err;
}

async function scrapePage(url: string, firecrawlKey?: string, forceRefresh = false) {
  const candidates: any[] = [];
  const freshUrl = forceRefresh
    ? `${url}${url.includes("?") ? "&" : "?"}seo_refresh=${Date.now()}`
    : url;

  if (firecrawlKey) {
    try {
      const { res } = await fetchWithRetry(
        "https://api.firecrawl.dev/v2/scrape",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: freshUrl,
            formats: ["markdown", "rawHtml"],
            onlyMainContent: false,
            waitFor: 6000,
            mobile: false,
            blockAds: true,
            skipTlsVerification: false,
            location: { country: "RO", languages: ["ro-RO"] },
            actions: [
              { type: "wait", milliseconds: 2500 },
              { type: "scroll", direction: "down" },
              { type: "wait", milliseconds: 1500 },
              { type: "scroll", direction: "up" },
              { type: "wait", milliseconds: 1500 },
            ],
          }),
        },
        { timeoutMs: CONFIG.SCRAPE_TIMEOUT_MS, maxRetries: CONFIG.SCRAPE_MAX_RETRIES, label: "firecrawl" },
      );
      if (res.ok) {
        const data = await res.json();
        const md = data.markdown || data.data?.markdown || "";
        const html = data.rawHtml || data.data?.rawHtml || data.html || data.data?.html || "";
        const meta = data.metadata || data.data?.metadata || {};
        const parsed = parseScraped(md, html, meta);
        (parsed as any).source = "firecrawl";
        candidates.push(parsed);
      } else {
        console.warn("Firecrawl non-ok", res.status, await res.text().catch(() => ""));
      }
    } catch (e: any) {
      console.warn("Firecrawl exhausted retries:", e?.message);
    }
  }

  // Direct fetch fallback (also retryable)
  try {
    const { res } = await fetchWithRetry(
      freshUrl,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 SEO-Bot",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
      },
      { timeoutMs: 15_000, maxRetries: 1, label: "direct-fetch" },
    );
    const html = await res.text();
    const parsed = parseScraped(htmlToText(html), html, extractMetaFromHtml(html));
    (parsed as any).source = "direct-fetch";
    candidates.push(parsed);
  } catch (e: any) {
    console.warn("Direct fetch failed:", e?.message);
  }

  if (candidates.length === 0) {
    return { title: "", metaDescription: "", h1Count: 0, h2Count: 0, wordCount: 0, markdown: "", fullHtml: "", source: "none", metaCandidatesDebug: [] } as any;
  }
  if (candidates.length === 1) return candidates[0];

  const best = pickBestScrapeResult(candidates);
  if (isClearlyBrokenScrape(best) && candidates.length > 1) {
    const nonBroken = candidates.find((candidate) => !isClearlyBrokenScrape(candidate));
    if (nonBroken) return nonBroken;
  }
  return best;
}

function parseScraped(markdown: string, html: string, meta: any) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaCandidates = collectMetaDescriptionCandidates(html, meta);

  const allH1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const allH2 = html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const isShellHeading = (tag: string): boolean => {
    const open = tag.match(/<h[12]\b[^>]*>/i)?.[0] || "";
    return /data-prerender-title|aria-hidden=["']?true|hidden(\s|=|>)|sr-only|visually-hidden|display\s*:\s*none|visibility\s*:\s*hidden/i.test(open);
  };
  const h1Matches = allH1.filter((t) => !isShellHeading(t));
  const h2Matches = allH2.filter((t) => !isShellHeading(t));
  const text = markdown || htmlToText(html);

  const detectedTitle = meta.title || titleMatch?.[1]?.trim() || "";

  return {
    title: detectedTitle,
    metaDescription: pickBestMetaDescription(metaCandidates, detectedTitle),
    metaCandidatesDebug: metaCandidates,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    markdown: text.slice(0, 8000),
    fullText: text,
    fullHtml: html.slice(0, 2000),
  };
}

interface MetaCandidate { source: string; value: string; }

function collectMetaDescriptionCandidates(html: string, meta: any): MetaCandidate[] {
  const found: MetaCandidate[] = [];
  const seen = new Set<string>();
  const push = (source: string, raw: string | undefined | null) => {
    if (!raw) return;
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ source, value: cleaned });
  };

  push("metadata.description", meta?.description);
  push("metadata.ogDescription", meta?.ogDescription || meta?.["og:description"]);
  push("metadata.twitterDescription", meta?.twitterDescription || meta?.["twitter:description"]);

  const descRe = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = descRe.exec(html)) !== null && i < 10) { push(`html.meta.description[${i}]`, m[1]); i++; }

  const ogRe = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/gi;
  i = 0;
  while ((m = ogRe.exec(html)) !== null && i < 5) { push(`html.og:description[${i}]`, m[1]); i++; }

  const twRe = /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/gi;
  i = 0;
  while ((m = twRe.exec(html)) !== null && i < 5) { push(`html.twitter:description[${i}]`, m[1]); i++; }

  return found;
}

function pickBestMetaDescription(candidates: MetaCandidate[], pageTitle = ""): string {
  if (!candidates.length) return "";
  const titleTokens = meaningfulTokens(pageTitle);
  const score = (value: string) => {
    let s = 0;
    if (value.length >= 120 && value.length <= 165) s += 10;
    else if (value.length >= 80 && value.length < 120) s += 6;
    else if (value.length > 165 && value.length <= 200) s += 4;
    else if (value.length < 60) s -= 5;
    if (/(calculeaz|contacteaz|descoper|solicit|vezi|invest|află|afla|obține|obtine|cere|programeaz)/i.test(value)) s += 3;
    if (/timi[șs]oara/i.test(value)) s += 2;
    const valueTokens = meaningfulTokens(value);
    const titleOverlap = titleTokens.filter((token) => valueTokens.includes(token)).length;
    s += Math.min(titleOverlap * 3, 15);
    if (value.length > 200) s -= 12;
    if (/[.!?],\s+[A-ZĂÂÎȘȚ]/.test(value)) s -= 8;
    if ((value.match(/\b(calcul|obțin|obtine|contact|solicit|cere|invest)/gi) || []).length > 3) s -= 4;
    if (/^[a-zăâîșț]/.test(value)) s -= 4;
    const sentenceCount = (value.match(/[.!?]\s+[A-ZĂÂÎȘȚ]/g) || []).length;
    if (sentenceCount > 3) s -= 3;
    return s;
  };
  return [...candidates].sort((a, b) => score(b.value) - score(a.value))[0].value;
}

function meaningfulTokens(value: string): string[] {
  const stop = new Set(["realtrust", "apart", "hotel", "pentru", "prin", "din", "langa", "lângă", "sau", "care", "este", "sunt", "gratuit", "gratuita", "gratuită"]);
  const normalized = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
  return Array.from(new Set(normalized.split(/\s+/).filter((token) => token.length >= 4 && !stop.has(token))));
}

function htmlToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
}

function extractMetaFromHtml(html: string) {
  const get = (re: RegExp) => html.match(re)?.[1]?.trim();
  return {
    title: get(/<title[^>]*>([^<]+)<\/title>/i),
    description: get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
    ogDescription: get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
    twitterDescription: get(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i),
  };
}

function calculateDeterministicScore(scraped: any, localGeo: any, duplicates: any[]): {
  score: number;
  breakdown: Record<string, { points: number; max: number; reason: string }>;
} {
  const breakdown: Record<string, { points: number; max: number; reason: string }> = {};
  const title = scraped.title || "";
  const titleLen = title.length;
  let titlePts = 0;
  if (titleLen >= 40 && titleLen <= 65) titlePts = 15;
  else if (titleLen >= 30 && titleLen < 40) titlePts = 10;
  else if (titleLen > 65 && titleLen <= 75) titlePts = 11;
  else if (titleLen > 0) titlePts = 5;
  breakdown.title = { points: titlePts, max: 15, reason: `${titleLen} chars` };

  const meta = scraped.metaDescription || "";
  const metaLen = meta.length;
  let metaPts = 0;
  if (metaLen >= 130 && metaLen <= 160) metaPts = 15;
  else if (metaLen >= 110 && metaLen < 130) metaPts = 12;
  else if (metaLen > 160 && metaLen <= 180) metaPts = 11;
  else if (metaLen >= 70) metaPts = 7;
  else if (metaLen > 0) metaPts = 3;
  breakdown.meta = { points: metaPts, max: 15, reason: `${metaLen} chars` };

  const h1 = scraped.h1Count || 0;
  const h1Pts = h1 === 1 ? 10 : h1 === 0 ? 0 : h1 === 2 ? 5 : 3;
  breakdown.h1 = { points: h1Pts, max: 10, reason: `${h1} H1 tags` };

  const h2 = scraped.h2Count || 0;
  const h2Pts = h2 >= 5 ? 5 : h2 >= 3 ? 4 : h2 >= 1 ? 2 : 0;
  breakdown.h2 = { points: h2Pts, max: 5, reason: `${h2} H2 tags` };

  const wc = scraped.wordCount || 0;
  let wcPts = 0;
  if (wc >= 1500) wcPts = 15;
  else if (wc >= 800) wcPts = 12;
  else if (wc >= 400) wcPts = 8;
  else if (wc >= 200) wcPts = 4;
  breakdown.content = { points: wcPts, max: 15, reason: `${wc} words` };

  const localPts = Math.round((localGeo.score / 100) * 25);
  breakdown.local_seo = { points: localPts, max: 25, reason: `${localGeo.score}/100 local relevance` };

  const proxPts = localGeo.has_proximity_signals ? 5 : 0;
  breakdown.proximity = { points: proxPts, max: 5, reason: localGeo.has_proximity_signals ? "present" : "missing" };

  const dupPts = duplicates.length === 0 ? 10 : duplicates.length <= 2 ? 5 : 0;
  breakdown.duplicates = { points: dupPts, max: 10, reason: `${duplicates.length} duplicates` };

  const total = Object.values(breakdown).reduce((sum, b) => sum + b.points, 0);
  return { score: Math.min(100, total), breakdown };
}

async function analyzeWithAI(
  scraped: any, url: string, lang: string, duplicates: any[], localGeo: any, apiKey: string,
): Promise<{ analysis: any; attempts: number }> {
  const { score: deterministicScore, breakdown } = calculateDeterministicScore(scraped, localGeo, duplicates);

  const dupNote = duplicates.length > 0
    ? `\nATENȚIE: Am detectat ${duplicates.length} alte pagini cu conținut identic: ${duplicates.map(d => d.url).join(", ")}`
    : "";

  const localFoundNames = (localGeo.found || []).map((e: any) => e.name).join(", ") || "niciuna";
  const localMissingNames = (localGeo.missing || []).slice(0, 12).map((e: any) => `${e.name} (${e.category})`).join(", ") || "—";
  const proxNote = localGeo.has_proximity_signals
    ? `Da — keyword-uri detectate: ${localGeo.proximity_keywords_found.slice(0, 5).join(", ")}`
    : "NU — pagina NU menționează proximitatea față de facilități.";

  const titleLen = (scraped.title || "").length;
  const metaLen = (scraped.metaDescription || "").length;

  const prompt = `Ești auditor SEO SENIOR cu 15+ ani experiență pe piața imobiliară din Timișoara. Analizezi cu RIGOARE și CONSECVENȚĂ — NU dai recomandări contradictorii.

URL: ${url}
Limbă: ${lang}
Titlu actual (${titleLen} chars): "${scraped.title}"
Meta description actuală (${metaLen} chars): "${scraped.metaDescription}"
Număr H1: ${scraped.h1Count} | H2: ${scraped.h2Count || 0}
Număr cuvinte: ${scraped.wordCount}
${dupNote}

=== SCOR DETERMINIST (calculat din semnale măsurabile) ===
Scor total: ${deterministicScore}/100
Breakdown:
${Object.entries(breakdown).map(([k, v]) => `  - ${k}: ${v.points}/${v.max} (${v.reason})`).join("\n")}

=== LOCAL GEO (Timișoara) ===
Scor relevanță locală: ${localGeo.score}/100
Entități găsite: ${localFoundNames}
Entități LIPSĂ: ${localMissingNames}
Proximitate: ${proxNote}

Conținut analizat (primele 8000 caractere):
${scraped.markdown}

=== REGULI STRICTE ANTI-FLIP-FLOP ===
1. Titlu între 40-65 chars = OK. NU recomanda "scurtează" dacă e între 50-65 sau "extinde" dacă e între 40-55.
2. Meta description între 130-160 chars = OK. Aceeași regulă — NU oscila.
3. NU repeta recomandări care contrazic auditul anterior. Dacă titlul include cuvinte cheie principale, NU mai cere modificări cosmetice.
4. NU sugera adăugarea de cuvinte deja prezente în text (verifică textul ÎNAINTE de a sugera).
5. Recomandările trebuie să fie ACȚIONABILE și NETRIVIALE — nu generic "adaugă testimoniale".
6. Dacă scor ≥ 90, focus pe oportunități STRATEGICE (schema avansat, content hubs, internal linking), NU pe ajustări minore titlu/meta.
7. Pentru fiecare keyword sugerat, verifică DUBLU dacă NU e deja în textul analizat. Dacă e, OMITE-l.
8. Issues cu severity "info" sunt rezervate pentru observații cu impact REAL — nu pentru ajustări estetice.

Returnează EXCLUSIV JSON valid (fără markdown):
{
  "suggested_title": "titlu optimizat 50-60 chars (sau actualul dacă deja OK)",
  "suggested_meta": "meta optimizată 130-155 chars cu CTA (sau actuala dacă deja OK)",
  "keyword_gaps": [{"keyword": "...", "search_intent": "...", "priority": "high|medium|low", "where_to_add": "..."}],
  "strengths": ["3-5 puncte forte SEO concrete"],
  "issues": [{"severity": "critical|warning|info", "issue": "descriere PRECISĂ", "fix": "acțiune CONCRETĂ"}],
  "opportunities": [{"type": "internal_linking|content_gap|schema|technical|local_seo", "description": "...", "impact": "high|medium|low"}],
  "readability_score": număr 0-100,
  "keyword_density": {"primary_keyword": "...", "density_pct": număr},
  "duplicate_content_risk": "none|low|medium|high",
  "recommended_internal_links": ["URL-uri din realtrust.ro către care ar trebui linkat"],
  "local_geo_keywords": [
    {"keyword": "cuvânt cheie geo NEMENȚIONAT încă", "reason": "...", "priority": "high|medium|low", "suggested_placement": "..."}
  ],
  "local_recommendations": ["3-5 recomandări STRATEGICE pentru Local SEO"]
}

CRITIC: Verifică keyword_gaps și local_geo_keywords împotriva textului. Dacă apar deja, OMITE-le.`;

  const { res, attempts } = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.AI_MODEL,
        messages: [
          { role: "system", content: "Ești auditor SEO PREMIUM, senior pe piața imobiliară Timișoara. Răspunzi STABIL, CONSECVENT, NEVARIABIL. NU oscilezi între recomandări contradictorii. Răspuns exclusiv JSON valid, fără markdown code fence. Verifici DUBLU fiecare sugestie împotriva textului real înainte de a o include." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        reasoning: { effort: "medium" },
      }),
    },
    { timeoutMs: CONFIG.AI_TIMEOUT_MS, maxRetries: CONFIG.AI_MAX_RETRIES, label: "gemini-seo" },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err: any = new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
    err.attempts = attempts;
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
  const criticalCount = issues.filter((i: any) => i?.severity === "critical").length;
  const warningCount = issues.filter((i: any) => i?.severity === "warning").length;
  const infoCount = issues.filter((i: any) => i?.severity === "info").length;

  const qualityPenalty = (criticalCount * 8) + (warningCount * 4) + (infoCount * 1);
  const adjustedScore = Math.max(0, Math.min(100, deterministicScore - qualityPenalty));

  parsed.overall_score = adjustedScore;
  parsed._score_breakdown = {
    ...breakdown,
    ai_quality_penalty: {
      points: -qualityPenalty,
      max: 0,
      reason: `${criticalCount} critical(-${criticalCount * 8}) + ${warningCount} warning(-${warningCount * 4}) + ${infoCount} info(-${infoCount})`,
    },
  };
  return { analysis: parsed, attempts };
}
