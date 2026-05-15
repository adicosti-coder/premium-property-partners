// Weekly on-page audit: scrapes top 25 pages from GSC via Firecrawl, extracts SEO signals,
// computes health score, stores in seo_page_audits.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Audit {
  title: string; meta: string; h1: string;
  h2_count: number; word_count: number;
  schema_types: string[];
  internal_links: number; external_links: number;
  images_total: number; images_missing_alt: number;
  issues: Array<{ severity: "high" | "medium" | "low"; code: string; message: string }>;
  health_score: number;
}

const SITE_HOST = "realtrust.ro";

function extractAudit(html: string, pageUrl: string): Audit {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2Matches = [...html.matchAll(/<h2[^>]*>/gi)];
  const schemaMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const linkMatches = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  const imgMatches = [...html.matchAll(/<img\s[^>]*>/gi)];

  const schemaTypes: string[] = [];
  for (const m of schemaMatches) {
    try {
      const obj = JSON.parse(m[1].trim());
      const list = Array.isArray(obj) ? obj : [obj];
      for (const it of list) {
        const t = it?.["@type"];
        if (Array.isArray(t)) schemaTypes.push(...t.map(String));
        else if (t) schemaTypes.push(String(t));
      }
    } catch (_) {}
  }

  let internal = 0, external = 0;
  for (const m of linkMatches) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const url = href.startsWith("http") ? new URL(href) : new URL(href, pageUrl);
      if (url.hostname.includes(SITE_HOST)) internal++; else external++;
    } catch (_) {}
  }

  let imgsTotal = 0, imgsMissingAlt = 0;
  for (const m of imgMatches) {
    imgsTotal++;
    const tag = m[0];
    if (!/\salt=["'][^"']/.test(tag)) imgsMissingAlt++;
  }

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;

  const title = (titleMatch?.[1] || "").trim();
  const meta = (metaMatch?.[1] || "").trim();
  const h1 = (h1Match?.[1] || "").replace(/<[^>]+>/g, " ").trim();

  const issues: Audit["issues"] = [];
  if (!title) issues.push({ severity: "high", code: "missing_title", message: "Title lipsă" });
  else if (title.length < 30) issues.push({ severity: "medium", code: "title_short", message: `Title scurt (${title.length} car.)` });
  else if (title.length > 65) issues.push({ severity: "low", code: "title_long", message: `Title prea lung (${title.length} car.)` });

  if (!meta) issues.push({ severity: "high", code: "missing_meta", message: "Meta description lipsă" });
  else if (meta.length < 80) issues.push({ severity: "medium", code: "meta_short", message: `Meta description scurtă (${meta.length} car.)` });
  else if (meta.length > 165) issues.push({ severity: "low", code: "meta_long", message: `Meta description prea lungă (${meta.length} car.)` });

  if (!h1) issues.push({ severity: "high", code: "missing_h1", message: "H1 lipsă" });

  if (h2Matches.length === 0 && words > 300) issues.push({ severity: "medium", code: "no_h2", message: "Niciun H2 pe pagina cu conținut" });

  if (schemaTypes.length === 0) issues.push({ severity: "medium", code: "no_schema", message: "Nu există schema JSON-LD" });

  if (words < 200) issues.push({ severity: "medium", code: "thin_content", message: `Conținut subțire (${words} cuvinte)` });

  if (imgsMissingAlt > 0) issues.push({ severity: "low", code: "missing_alt", message: `${imgsMissingAlt} imagini fără alt din ${imgsTotal}` });

  if (internal < 3 && words > 300) issues.push({ severity: "low", code: "few_internal_links", message: `Doar ${internal} link-uri interne` });

  // Score: 100 - penalty per issue
  let score = 100;
  for (const i of issues) {
    score -= i.severity === "high" ? 25 : i.severity === "medium" ? 10 : 4;
  }
  score = Math.max(0, score);

  return {
    title, meta, h1,
    h2_count: h2Matches.length,
    word_count: words,
    schema_types: [...new Set(schemaTypes)],
    internal_links: internal,
    external_links: external,
    images_total: imgsTotal,
    images_missing_alt: imgsMissingAlt,
    issues,
    health_score: score,
  };
}

async function fetchPage(url: string, firecrawlKey?: string): Promise<string> {
  if (firecrawlKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["html"], onlyMainContent: false }),
      });
      const data = await res.json();
      const html = data?.data?.html || data?.html || "";
      if (html) return html;
    } catch (_) {}
  }
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 RealTrustBot" } });
  return await r.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY") || undefined;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const limit = Math.min(50, Math.max(1, Number(body?.limit) || 25));
    const explicitPages: string[] = Array.isArray(body?.pages) ? body.pages : [];

    let pages: string[] = [];
    if (explicitPages.length) {
      pages = explicitPages.slice(0, limit);
    } else {
      // Top pages by clicks last 28 days
      const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
      const start = new Date(end); start.setUTCDate(start.getUTCDate() - 28);
      const { data: rows } = await sb
        .from("seo_gsc_daily")
        .select("page, clicks")
        .gte("date", start.toISOString().slice(0, 10))
        .lte("date", end.toISOString().slice(0, 10))
        .neq("page", "")
        .limit(50000);
      const byPage = new Map<string, number>();
      for (const r of rows || []) byPage.set(r.page, (byPage.get(r.page) || 0) + r.clicks);
      pages = [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([p]) => p);
    }

    if (pages.length === 0) return json({ success: true, message: "No pages to audit", audited: 0 });

    const results: Array<{ page: string; ok: boolean; score?: number; error?: string }> = [];
    for (const page of pages) {
      try {
        const html = await fetchPage(page, FIRECRAWL_KEY);
        const a = extractAudit(html, page);
        await sb.from("seo_page_audits").upsert({
          page,
          title: a.title, meta_description: a.meta, h1: a.h1,
          h2_count: a.h2_count, word_count: a.word_count,
          schema_types: a.schema_types,
          internal_links: a.internal_links, external_links: a.external_links,
          images_total: a.images_total, images_missing_alt: a.images_missing_alt,
          issues: a.issues, health_score: a.health_score,
          last_scraped_at: new Date().toISOString(),
        }, { onConflict: "page" });
        results.push({ page, ok: true, score: a.health_score });
      } catch (e) {
        results.push({ page, ok: false, error: (e as Error).message });
      }
    }

    return json({ success: true, audited: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
  } catch (e) {
    console.error("seo-page-audit-cron", e);
    return json({ error: (e as Error).message }, 500);
  }
});
