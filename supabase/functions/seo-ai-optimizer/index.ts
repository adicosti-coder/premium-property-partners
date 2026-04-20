import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeLocalGeo } from "./localGeo.ts";
import { isClearlyBrokenScrape, isObviouslyInvalidCachedAudit, pickBestScrapeResult } from "./scrapeQuality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  url: string;
  language?: "ro" | "en";
  forceRefresh?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, language = "ro", forceRefresh = false }: RequestBody = await req.json();
    if (!url || !/^https?:\/\//.test(url)) {
      return json({ error: "URL invalid" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Cache: re-use audit dacă <24h și forceRefresh=false
    if (!forceRefresh) {
      const { data: cached } = await sb.from("seo_audits")
        .select("*").eq("url", url).eq("language", language)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (
        cached &&
        !isObviouslyInvalidCachedAudit(cached) &&
        (Date.now() - new Date(cached.created_at).getTime()) < 24 * 60 * 60 * 1000
      ) {
        return json({ audit: cached, cached: true });
      }
    }

    // 1. Scrape
    const scraped = await scrapePage(url, FIRECRAWL_API_KEY, forceRefresh);
    // Hash on full text (not the truncated 8000-char snippet) and skip the
    // first 1500 chars which are dominated by the shared SPA shell (header,
    // nav, hero CTAs). Otherwise two distinct pages on the same SPA share an
    // identical hash and falsely trigger "duplicate content" warnings.
    const hashSource = (scraped as any).fullText || scraped.markdown || "";
    const hashBody = hashSource.length > 1500 ? hashSource.slice(1500) : hashSource;
    const contentHash = await sha256(hashBody);

    // 2. Detect duplicate content vs alte audituri (only recent — last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: duplicates } = await sb.from("seo_audits")
      .select("url, content_hash")
      .eq("content_hash", contentHash)
      .neq("url", url)
      .gte("created_at", sevenDaysAgo)
      .limit(5);

    // 3. Local GEO Audit (Timișoara entities + proximity signals)
    const localGeo = analyzeLocalGeo(scraped.markdown || "");

    // 4. AI analysis (now includes local geo context for better keyword suggestions)
    const analysis = await analyzeWithAI(scraped, url, language, duplicates || [], localGeo, LOVABLE_API_KEY);

    // Build a diagnostic blob so the admin UI can show "what the audit actually saw"
    const diagnostics = {
      scrape_source: (scraped as any).source || "unknown",
      title_detected: scraped.title,
      title_length: (scraped.title || "").length,
      meta_chosen: scraped.metaDescription,
      meta_length: (scraped.metaDescription || "").length,
      meta_candidates: (scraped as any).metaCandidatesDebug || [],
      h1_count: scraped.h1Count,
      h2_count: (scraped as any).h2Count ?? null,
      word_count: scraped.wordCount,
      score_breakdown: analysis._score_breakdown || null,
      ai_model: "google/gemini-2.5-pro",
      force_refresh: forceRefresh,
      audited_at: new Date().toISOString(),
    };
    const enrichedAnalysis = { ...analysis, _diagnostics: diagnostics };

    // 5. Store
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

    if (saveErr) console.error("Save error:", saveErr);

    return json({ audit: saved, cached: false, duplicates: duplicates || [], diagnostics });
  } catch (err: any) {
    console.error("seo-ai-optimizer error:", err);
    return json({ error: err.message || "Unknown" }, 500);
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

async function scrapePage(url: string, firecrawlKey?: string, forceRefresh = false) {
  const candidates: any[] = [];
  const freshUrl = forceRefresh
    ? `${url}${url.includes("?") ? "&" : "?"}seo_refresh=${Date.now()}`
    : url;

  // Try Firecrawl first
  if (firecrawlKey) {
    try {
      // SPA-aware scrape: wait for React app to hydrate and inject route-specific
      // <title>, <meta>, <h1> via Helmet/dynamic SEO. Without JS rendering the
      // server returns the SPA shell (homepage HTML), causing false-positive
      // "duplicate content" and "2x H1" warnings.
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
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
          // Wait for hydrated route content before snapshotting HTML
          actions: [
            { type: "wait", milliseconds: 2500 },
            { type: "scroll", direction: "down" },
            { type: "wait", milliseconds: 1500 },
            { type: "scroll", direction: "up" },
            { type: "wait", milliseconds: 1500 },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const md = data.markdown || data.data?.markdown || "";
        // Prefer rawHtml (post-hydration DOM) over the cleaned `html` field
        const html =
          data.rawHtml || data.data?.rawHtml ||
          data.html || data.data?.html || "";
        const meta = data.metadata || data.data?.metadata || {};
        const parsed = parseScraped(md, html, meta);
        (parsed as any).source = "firecrawl";
        candidates.push(parsed);
      } else {
        console.warn("Firecrawl status", res.status, await res.text().catch(() => ""));
      }
    } catch (e) { console.warn("Firecrawl fail, fallback:", e); }
  }

  // Direct fetch as fallback
  try {
    const res = await fetch(freshUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 SEO-Bot",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
    const html = await res.text();
    const parsed = parseScraped(htmlToText(html), html, extractMetaFromHtml(html));
    (parsed as any).source = "direct-fetch";
    candidates.push(parsed);
  } catch (e) {
    console.warn("Direct fetch fail:", e);
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

  // Collect ALL meta description candidates (description, og:description, twitter:description)
  // — never trust just the first regex hit. Some pages inject 2-3 sources via React + prerender.
  const metaCandidates = collectMetaDescriptionCandidates(html, meta);

  // Filter out hidden/prerender shell H1s (used for non-JS crawlers as a fallback,
  // not a real visible heading). Pattern: <h1 data-prerender-title> or
  // elements with hidden / aria-hidden / sr-only / display:none.
  const allH1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const allH2 = html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const isShellHeading = (tag: string): boolean => {
    const open = tag.match(/<h[12]\b[^>]*>/i)?.[0] || "";
    return /data-prerender-title|aria-hidden=["']?true|hidden(\s|=|>)|sr-only|visually-hidden|display\s*:\s*none|visibility\s*:\s*hidden/i.test(open);
  };
  const h1Matches = allH1.filter((t) => !isShellHeading(t));
  const h2Matches = allH2.filter((t) => !isShellHeading(t));
  const text = markdown || htmlToText(html);

  return {
    title: meta.title || titleMatch?.[1]?.trim() || "",
    metaDescription: pickBestMetaDescription(metaCandidates),
    metaCandidatesDebug: metaCandidates,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    markdown: text.slice(0, 8000),
    // fullText is used ONLY for content_hash so two pages that share the same
    // SPA shell header/hero (first ~2000 chars) still produce different hashes
    // when their unique body copy diverges further down the page.
    fullText: text,
    fullHtml: html.slice(0, 2000),
  };
}

interface MetaCandidate {
  source: string;
  value: string;
}

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

  // Firecrawl-provided structured metadata first (most trustworthy)
  push("metadata.description", meta?.description);
  push("metadata.ogDescription", meta?.ogDescription || meta?.["og:description"]);
  push("metadata.twitterDescription", meta?.twitterDescription || meta?.["twitter:description"]);

  // Now scan ALL <meta name="description"> occurrences (not just the first)
  const descRe = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = descRe.exec(html)) !== null && i < 10) {
    push(`html.meta.description[${i}]`, m[1]);
    i++;
  }

  // og:description
  const ogRe = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/gi;
  i = 0;
  while ((m = ogRe.exec(html)) !== null && i < 5) {
    push(`html.og:description[${i}]`, m[1]);
    i++;
  }

  // twitter:description
  const twRe = /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/gi;
  i = 0;
  while ((m = twRe.exec(html)) !== null && i < 5) {
    push(`html.twitter:description[${i}]`, m[1]);
    i++;
  }

  return found;
}

/**
 * Pick the best (most complete, most informative) meta description from
 * multiple candidates. Avoids the previous buggy behavior of splitting on
 * commas and returning a truncated fragment like "Aeroport. Calculează ROI gratuit!".
 */
function pickBestMetaDescription(candidates: MetaCandidate[]): string {
  if (!candidates.length) return "";
  const score = (value: string) => {
    let s = 0;
    // Strongly prefer descriptions in the SEO sweet spot (130–160 chars)
    if (value.length >= 120 && value.length <= 165) s += 10;
    else if (value.length >= 80 && value.length < 120) s += 6;
    else if (value.length > 165 && value.length <= 200) s += 4;
    else if (value.length < 60) s -= 5;
    // Prefer descriptions with a CTA verb
    if (/(calculeaz|contacteaz|descoper|solicit|vezi|invest|află|afla)/i.test(value)) s += 3;
    // Prefer descriptions mentioning Timișoara (canonical brand keyword)
    if (/timi[șs]oara/i.test(value)) s += 2;
    // Penalize descriptions that look like a fragment (start lowercase or with a fragment marker)
    if (/^[a-zăâîșț]/.test(value)) s -= 4;
    // Penalize obvious concatenations (multiple sentences with dot-space-Capital + comma joins)
    const sentenceCount = (value.match(/[.!?]\s+[A-ZĂÂÎȘȚ]/g) || []).length;
    if (sentenceCount > 3) s -= 3;
    // Prefer html.meta.description over og/twitter when scores are tied
    return s;
  };
  const sorted = [...candidates].sort((a, b) => score(b.value) - score(a.value));
  return sorted[0].value;
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

/**
 * Deterministic SEO score (0-100) calculated from MEASURABLE signals.
 * The AI no longer decides the score — it only suggests improvements.
 * This eliminates the "92 → 95 → 92" flip-flop pattern caused by AI variance.
 */
function calculateDeterministicScore(scraped: any, localGeo: any, duplicates: any[]): {
  score: number;
  breakdown: Record<string, { points: number; max: number; reason: string }>;
} {
  const breakdown: Record<string, { points: number; max: number; reason: string }> = {};

  // 1. Title quality (15 pts)
  const title = scraped.title || "";
  const titleLen = title.length;
  let titlePts = 0;
  if (titleLen >= 40 && titleLen <= 65) titlePts = 15;
  else if (titleLen >= 30 && titleLen < 40) titlePts = 10;
  else if (titleLen > 65 && titleLen <= 75) titlePts = 11;
  else if (titleLen > 0) titlePts = 5;
  breakdown.title = { points: titlePts, max: 15, reason: `${titleLen} chars` };

  // 2. Meta description quality (15 pts)
  const meta = scraped.metaDescription || "";
  const metaLen = meta.length;
  let metaPts = 0;
  if (metaLen >= 130 && metaLen <= 160) metaPts = 15;
  else if (metaLen >= 110 && metaLen < 130) metaPts = 12;
  else if (metaLen > 160 && metaLen <= 180) metaPts = 11;
  else if (metaLen >= 70) metaPts = 7;
  else if (metaLen > 0) metaPts = 3;
  breakdown.meta = { points: metaPts, max: 15, reason: `${metaLen} chars` };

  // 3. H1 structure (10 pts) — exactly 1 is ideal
  const h1 = scraped.h1Count || 0;
  const h1Pts = h1 === 1 ? 10 : h1 === 0 ? 0 : h1 === 2 ? 5 : 3;
  breakdown.h1 = { points: h1Pts, max: 10, reason: `${h1} H1 tags` };

  // 4. H2 structure (5 pts)
  const h2 = scraped.h2Count || 0;
  const h2Pts = h2 >= 5 ? 5 : h2 >= 3 ? 4 : h2 >= 1 ? 2 : 0;
  breakdown.h2 = { points: h2Pts, max: 5, reason: `${h2} H2 tags` };

  // 5. Content length (15 pts)
  const wc = scraped.wordCount || 0;
  let wcPts = 0;
  if (wc >= 1500) wcPts = 15;
  else if (wc >= 800) wcPts = 12;
  else if (wc >= 400) wcPts = 8;
  else if (wc >= 200) wcPts = 4;
  breakdown.content = { points: wcPts, max: 15, reason: `${wc} words` };

  // 6. Local SEO (25 pts)
  const localPts = Math.round((localGeo.score / 100) * 25);
  breakdown.local_seo = { points: localPts, max: 25, reason: `${localGeo.score}/100 local relevance` };

  // 7. Proximity signals (5 pts)
  const proxPts = localGeo.has_proximity_signals ? 5 : 0;
  breakdown.proximity = { points: proxPts, max: 5, reason: localGeo.has_proximity_signals ? "present" : "missing" };

  // 8. Duplicate content (10 pts)
  const dupPts = duplicates.length === 0 ? 10 : duplicates.length <= 2 ? 5 : 0;
  breakdown.duplicates = { points: dupPts, max: 10, reason: `${duplicates.length} duplicates` };

  const total = Object.values(breakdown).reduce((sum, b) => sum + b.points, 0);
  return { score: Math.min(100, total), breakdown };
}

async function analyzeWithAI(scraped: any, url: string, lang: string, duplicates: any[], localGeo: any, apiKey: string) {
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

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: "Ești auditor SEO PREMIUM, senior pe piața imobiliară Timișoara. Răspunzi STABIL, CONSECVENT, NEVARIABIL. NU oscilezi între recomandări contradictorii. Răspuns exclusiv JSON valid, fără markdown code fence. Verifici DUBLU fiecare sugestie împotriva textului real înainte de a o include." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      reasoning: { effort: "medium" },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`AI gateway ${response.status}: ${t}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

  // Penalize deterministic score based on AI-detected qualitative issues.
  // Prevents "100/100 but still has problems" — a perfect score requires
  // ZERO critical/warning issues from the AI auditor.
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
  return parsed;
}
