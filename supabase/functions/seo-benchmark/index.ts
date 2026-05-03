// SEO Benchmark — side-by-side compare RealTrust vs competitor URL.
// Returns: title/meta/H1/H2 array, schema types + raw blocks, word count,
// PageSpeed (Core Web Vitals) for mobile, local keyword presence, and a
// "best-in-class" merged JSON-LD recommendation.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const PSI_KEY = Deno.env.get("PAGESPEED_API_KEY"); // optional

// Local Timișoara keywords (synced w/ frontend list)
const LOCAL_KEYWORDS = [
  "ISHO", "Aradului", "Girocului", "Complex Studențesc", "Șagului", "Sagului",
  "Circumvalațiunii", "Circumvalatiunii", "Lipovei", "Fabric", "Iosefin", "Elisabetin",
  "Cetate", "Centru", "Take Ionescu", "Soarelui", "Dâmbovița", "Dambovita",
  "Iulius Town", "Iulius Mall", "Openville", "Shopping City",
  "UVT", "Politehnica", "UMF", "Parcul Central", "Aeroport", "Gara de Nord", "Bega",
];

const stripDia = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Extracted {
  url: string;
  title: string;
  meta: string;
  h1: string[];
  h2: string[];
  schema_types: string[];
  schema_raw: Array<{ index: number; types: string[]; json: any; valid: boolean; error?: string }>;
  word_count: number;
  local_keywords_found: string[];
  has_aggregateRating: boolean;
  has_price: boolean;
  has_geo: boolean;
}

function extract(html: string, url: string): Extracted {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 5);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 20);

  const schemaMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes: string[] = [];
  const schemaRaw: Extracted["schema_raw"] = [];
  let hasRating = false, hasPrice = false, hasGeo = false;
  schemaMatches.forEach((m, idx) => {
    const raw = m[1].trim();
    try {
      const obj = JSON.parse(raw);
      const list = Array.isArray(obj) ? obj : [obj];
      const types: string[] = [];
      const walk = (n: any) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const t = n["@type"];
        if (Array.isArray(t)) types.push(...t.map(String));
        else if (t) types.push(String(t));
        if (n.aggregateRating) hasRating = true;
        if (n.price !== undefined || n.offers) hasPrice = true;
        if (n.geo || n.latitude) hasGeo = true;
        if (n["@graph"]) walk(n["@graph"]);
        for (const v of Object.values(n)) if (v && typeof v === "object") walk(v);
      };
      list.forEach(walk);
      schemaTypes.push(...types);
      schemaRaw.push({ index: idx, types: [...new Set(types)], json: obj, valid: true });
    } catch (e) {
      schemaRaw.push({ index: idx, types: [], json: raw.slice(0, 4000), valid: false, error: (e as Error).message });
    }
  });

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const norm = stripDia(text);
  const found = LOCAL_KEYWORDS.filter((kw) => norm.includes(stripDia(kw)));

  return {
    url,
    title: (titleM?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 300),
    meta: (metaM?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 500),
    h1: h1s,
    h2: h2s,
    schema_types: [...new Set(schemaTypes)],
    schema_raw: schemaRaw,
    word_count: wordCount,
    local_keywords_found: [...new Set(found)],
    has_aggregateRating: hasRating,
    has_price: hasPrice,
    has_geo: hasGeo,
  };
}

async function fetchHtml(url: string): Promise<string> {
  if (FIRECRAWL_KEY) {
    try {
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["html"], onlyMainContent: false }),
      });
      const d = await r.json();
      const html = d?.data?.html || d?.html || "";
      if (html) return html;
    } catch (e) { console.warn("[benchmark] firecrawl fail", (e as Error).message); }
  }
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 RealTrustBot" } });
  return await r.text();
}

async function fetchPageSpeed(url: string): Promise<any> {
  try {
    const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    psiUrl.searchParams.set("url", url);
    psiUrl.searchParams.set("strategy", "mobile");
    ["performance", "seo", "accessibility", "best-practices"].forEach((c) => psiUrl.searchParams.append("category", c));
    if (PSI_KEY) psiUrl.searchParams.set("key", PSI_KEY);
    const r = await fetch(psiUrl.toString());
    if (!r.ok) return { error: `PSI ${r.status}` };
    const d = await r.json();
    const cats = d?.lighthouseResult?.categories || {};
    const audits = d?.lighthouseResult?.audits || {};
    const scoreOf = (c: any) => c?.score != null ? Math.round(c.score * 100) : null;
    return {
      performance: scoreOf(cats.performance),
      seo: scoreOf(cats.seo),
      accessibility: scoreOf(cats.accessibility),
      best_practices: scoreOf(cats["best-practices"]),
      lcp: audits["largest-contentful-paint"]?.displayValue || null,
      fcp: audits["first-contentful-paint"]?.displayValue || null,
      cls: audits["cumulative-layout-shift"]?.displayValue || null,
      tbt: audits["total-blocking-time"]?.displayValue || null,
      tti: audits["interactive"]?.displayValue || null,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function collectTypePropsWithValues(node: any, target: Record<string, Record<string, any>>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectTypePropsWithValues(n, target)); return; }
  const t = node["@type"];
  const types = Array.isArray(t) ? t : (t ? [t] : []);
  for (const tt of types) {
    const ts = String(tt);
    if (!target[ts]) target[ts] = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("@")) continue;
      if (target[ts][k] === undefined) target[ts][k] = v;
    }
  }
  if (node["@graph"] && Array.isArray(node["@graph"])) node["@graph"].forEach((g: any) => collectTypePropsWithValues(g, target));
  for (const v of Object.values(node)) if (v && typeof v === "object") collectTypePropsWithValues(v, target);
}

function buildBestInClassSchema(ours: Extracted, theirs: Extracted) {
  // Merge: take all types competitor has, prefer our values (title/url/meta), backfill props
  const ourMap: Record<string, Record<string, any>> = {};
  const theirMap: Record<string, Record<string, any>> = {};
  for (const b of ours.schema_raw) if (b.valid) collectTypePropsWithValues(b.json, ourMap);
  for (const b of theirs.schema_raw) if (b.valid) collectTypePropsWithValues(b.json, theirMap);

  const graph: any[] = [];
  const allTypes = new Set([...Object.keys(theirMap), ...Object.keys(ourMap)]);
  for (const type of allTypes) {
    const obj: any = { "@type": type };
    const merged: Record<string, any> = { ...(theirMap[type] || {}), ...(ourMap[type] || {}) };
    // For the high-value fields we want to inject our identity:
    if (merged.name === undefined && ours.title) merged.name = ours.title;
    if (merged.description === undefined && ours.meta) merged.description = ours.meta;
    if (merged.url === undefined) merged.url = ours.url;
    Object.assign(obj, merged);
    graph.push(obj);
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "Invalid token" }, 401);
    const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const our_url: string = body.our_url;
    const competitor_url: string = body.competitor_url;
    if (!our_url || !competitor_url) return json({ error: "our_url and competitor_url required" }, 400);

    const [ourHtml, theirHtml] = await Promise.all([fetchHtml(our_url), fetchHtml(competitor_url)]);
    const ours = extract(ourHtml, our_url);
    const theirs = extract(theirHtml, competitor_url);
    const [oursPsi, theirsPsi] = await Promise.all([fetchPageSpeed(our_url), fetchPageSpeed(competitor_url)]);

    // Schema diff (which @type / properties competitor has and we don't)
    const ourMap: Record<string, Record<string, any>> = {};
    const theirMap: Record<string, Record<string, any>> = {};
    for (const b of ours.schema_raw) if (b.valid) collectTypePropsWithValues(b.json, ourMap);
    for (const b of theirs.schema_raw) if (b.valid) collectTypePropsWithValues(b.json, theirMap);
    const schema_gaps: Array<{ type: string; missing_props: string[]; we_have_type: boolean }> = [];
    for (const [type, props] of Object.entries(theirMap)) {
      const ourProps = ourMap[type] || {};
      const missing = Object.keys(props).filter((k) => ourProps[k] === undefined);
      if (missing.length > 0 || !ourMap[type]) {
        schema_gaps.push({ type, missing_props: missing, we_have_type: !!ourMap[type] });
      }
    }

    const best_schema = buildBestInClassSchema(ours, theirs);

    // Local keyword diff
    const localOnlyTheirs = theirs.local_keywords_found.filter((k) => !ours.local_keywords_found.includes(k));
    const localOnlyOurs = ours.local_keywords_found.filter((k) => !theirs.local_keywords_found.includes(k));

    return json({
      ok: true,
      ours,
      theirs,
      pagespeed: { ours: oursPsi, theirs: theirsPsi },
      schema_gaps,
      best_schema,
      local_keywords: {
        ours: ours.local_keywords_found,
        theirs: theirs.local_keywords_found,
        only_theirs: localOnlyTheirs,
        only_ours: localOnlyOurs,
      },
      rich_snippet_features: {
        ours: { aggregateRating: ours.has_aggregateRating, price: ours.has_price, geo: ours.has_geo },
        theirs: { aggregateRating: theirs.has_aggregateRating, price: theirs.has_price, geo: theirs.has_geo },
      },
    });
  } catch (e) {
    console.error("[seo-benchmark]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
