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
    const contentHash = await sha256(scraped.markdown || "");

    // 2. Detect duplicate content vs alte audituri
    const { data: duplicates } = await sb.from("seo_audits")
      .select("url, content_hash")
      .eq("content_hash", contentHash)
      .neq("url", url)
      .limit(5);

    // 3. Local GEO Audit (Timișoara entities + proximity signals)
    const localGeo = analyzeLocalGeo(scraped.markdown || "");

    // 4. AI analysis (now includes local geo context for better keyword suggestions)
    const analysis = await analyzeWithAI(scraped, url, language, duplicates || [], localGeo, LOVABLE_API_KEY);

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
      raw_analysis: analysis,
      content_hash: contentHash,
      local_relevance_score: localGeo.score,
      local_entities_found: localGeo.found,
      local_entities_missing: localGeo.missing,
      local_geo_keywords: analysis.local_geo_keywords || [],
      local_recommendations: analysis.local_recommendations || [],
    }).select().single();

    if (saveErr) console.error("Save error:", saveErr);

    return json({ audit: saved, cached: false, duplicates: duplicates || [] });
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
  const candidates = [];
  const freshUrl = forceRefresh
    ? `${url}${url.includes("?") ? "&" : "?"}seo_refresh=${Date.now()}`
    : url;

  // Try Firecrawl first
  if (firecrawlKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: freshUrl,
          formats: ["markdown", "html"],
          onlyMainContent: false,
          // Wait 4s for the React SPA to hydrate so SR-only SEO blocks
          // (rendered by React, not just static index.html) are captured.
          waitFor: 4000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const md = data.markdown || data.data?.markdown || "";
        const html = data.html || data.data?.html || "";
        const meta = data.metadata || data.data?.metadata || {};
        candidates.push(parseScraped(md, html, meta));
      }
    } catch (e) { console.warn("Firecrawl fail, fallback:", e); }
  }

  // Direct fetch as fallback and freshness guard against stale external snapshots
    const res = await fetch(freshUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 SEO-Bot",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
  const html = await res.text();
  candidates.push(parseScraped(htmlToText(html), html, extractMetaFromHtml(html)));

  if (candidates.length === 1) {
    return candidates[0];
  }

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

  const h1Matches = html.match(/<h1[^>]*>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>/gi) || [];
  const text = markdown || htmlToText(html);

  return {
    title: meta.title || titleMatch?.[1]?.trim() || "",
    metaDescription: pickBestMetaDescription(metaCandidates),
    metaCandidatesDebug: metaCandidates,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    markdown: text.slice(0, 8000),
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

async function analyzeWithAI(scraped: any, url: string, lang: string, duplicates: any[], localGeo: any, apiKey: string) {
  const dupNote = duplicates.length > 0
    ? `\nATENȚIE: Am detectat ${duplicates.length} alte pagini cu conținut identic: ${duplicates.map(d => d.url).join(", ")}`
    : "";

  const localFoundNames = (localGeo.found || []).map((e: any) => e.name).join(", ") || "niciuna";
  const localMissingNames = (localGeo.missing || []).slice(0, 12).map((e: any) => `${e.name} (${e.category})`).join(", ") || "—";
  const proxNote = localGeo.has_proximity_signals
    ? `Da — keyword-uri detectate: ${localGeo.proximity_keywords_found.slice(0, 5).join(", ")}`
    : "NU — pagina NU menționează proximitatea față de facilități (școli, parcuri, mall-uri, transport). Aceasta este o problemă mare pentru Local SEO / Google Local Pack.";

  const prompt = `Analizează această pagină web și returnează un audit SEO complet în JSON, cu accent special pe LOCAL SEO Timișoara.

URL: ${url}
Limbă: ${lang}
Titlu actual: "${scraped.title}"
Meta description actuală: "${scraped.metaDescription}"
Număr H1: ${scraped.h1Count}
Număr cuvinte: ${scraped.wordCount}
${dupNote}

=== LOCAL GEO CONTEXT (Timișoara) ===
Scor relevanță locală calculat: ${localGeo.score}/100
Entități locale găsite în text: ${localFoundNames}
Entități locale importante LIPSĂ (nu sunt menționate, dar ar trebui): ${localMissingNames}
Conține semnale de proximitate ("aproape de", "lângă", minute pe jos, etc.)? ${proxNote}

Conținut (primele 8000 caractere):
${scraped.markdown}

Returnează EXCLUSIV JSON cu structura:
{
  "overall_score": număr 0-100,
  "suggested_title": "titlu SEO optimizat (max 60 caractere)",
  "suggested_meta": "meta description optimizată (max 155 caractere) cu CTA",
  "keyword_gaps": [{"keyword": "...", "search_intent": "...", "priority": "high|medium|low", "where_to_add": "..."}],
  "strengths": ["3-5 puncte forte SEO ale paginii"],
  "issues": [{"severity": "critical|warning|info", "issue": "...", "fix": "..."}],
  "opportunities": [{"type": "internal_linking|content_gap|schema|technical|local_seo", "description": "...", "impact": "high|medium|low"}],
  "readability_score": număr 0-100,
  "keyword_density": {"primary_keyword": "...", "density_pct": număr},
  "duplicate_content_risk": "none|low|medium|high",
  "recommended_internal_links": ["URL-uri din realtrust.ro către care ar trebui linkat"],
  "local_geo_keywords": [
    {"keyword": "cuvânt cheie geografic Timișoara care lipsește", "reason": "de ce e important pentru Local Pack", "priority": "high|medium|low", "suggested_placement": "unde să fie inserat (H2, paragraf, alt, etc.)"}
  ],
  "local_recommendations": [
    "3-5 recomandări concrete pentru Local SEO Timișoara: cartiere de menționat, proximități de adăugat (școli/parcuri/mall-uri), schema LocalBusiness, micro-formate de adresă, etc."
  ]
}

IMPORTANT pentru local_geo_keywords: returnează FIX 3-5 cuvinte cheie geografice (ex: "apartamente Iulius Town", "cazare lângă UVT", "hotel Centru Timișoara", "regim hotelier Aradului") care lipsesc DIN TEXTUL ANALIZAT și care ar ajuta indexarea în Local Pack Google.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Ești expert SEO senior pentru piața imobiliară din Timișoara. Cunoști foarte bine cartierele, mall-urile (Iulius Town, Shopping City), universitățile (UVT, UPT, UMF), parcurile și landmark-urile orașului. Răspunzi exclusiv cu JSON valid, fără markdown code fence." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`AI gateway ${response.status}: ${t}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(content); } catch { return { raw: content, overall_score: 0 }; }
}
