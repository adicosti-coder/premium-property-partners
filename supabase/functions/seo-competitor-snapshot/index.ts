// SEO Competitor Snapshot — uses Firecrawl to scrape competitor URLs,
// extracts title/meta/h1/schema and asks Gemini to surface the gaps vs our page.
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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ExtractedSeo {
  title: string;
  meta: string;
  h1: string;
  schema_types: string[];
  word_count: number;
}

function extractFromHtml(html: string): ExtractedSeo {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const schemaMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes: string[] = [];
  for (const m of schemaMatches) {
    try {
      const obj = JSON.parse(m[1].trim());
      const list = Array.isArray(obj) ? obj : [obj];
      for (const it of list) {
        const t = it["@type"];
        if (Array.isArray(t)) schemaTypes.push(...t);
        else if (t) schemaTypes.push(String(t));
      }
    } catch {/* ignore */}
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    title: (titleMatch?.[1] || "").trim().slice(0, 300),
    meta: (metaMatch?.[1] || "").trim().slice(0, 500),
    h1: (h1Match?.[1] || "").replace(/<[^>]+>/g, " ").trim().slice(0, 300),
    schema_types: [...new Set(schemaTypes)],
    word_count: words,
  };
}

async function fetchPage(url: string): Promise<{ html: string; markdown?: string }> {
  if (FIRECRAWL_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["html", "markdown"], onlyMainContent: false }),
      });
      const data = await res.json();
      const html = data?.data?.html || data?.html || "";
      const markdown = data?.data?.markdown || data?.markdown || "";
      if (html) return { html, markdown };
    } catch (e) {
      console.warn("[competitor] Firecrawl failed, fallback to fetch:", (e as Error).message);
    }
  }
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 RealTrustBot" } });
  return { html: await r.text() };
}

async function aiGaps(ours: ExtractedSeo & { url: string }, competitors: Array<ExtractedSeo & { url: string }>): Promise<{ gaps: any[]; summary: string }> {
  if (!LOVABLE_API_KEY) return { gaps: [], summary: "AI not configured" };
  const prompt = `Ești expert SEO. Compară pagina noastră cu competitorii și identifică 3-7 gap-uri concrete în limba română.
Pagina noastră:
URL: ${ours.url}
Title: ${ours.title}
Meta: ${ours.meta}
H1: ${ours.h1}
Schema types: ${ours.schema_types.join(", ") || "(none)"}
Word count: ${ours.word_count}

Competitori:
${competitors.map((c, i) => `#${i + 1} ${c.url}\nTitle: ${c.title}\nMeta: ${c.meta}\nH1: ${c.h1}\nSchema: ${c.schema_types.join(", ") || "(none)"}\nWords: ${c.word_count}`).join("\n\n")}

Output JSON: {"summary": "1-2 propoziții", "gaps": [{"area": "title|meta|schema|content|h1", "issue": "...", "recommendation": "...", "competitor_url": "..."}]}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Răspunzi DOAR cu JSON valid în limba română." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { gaps: [], summary: `AI error ${res.status}` };
  const data = await res.json();
  try {
    const obj = JSON.parse(data.choices[0].message.content);
    return { gaps: obj.gaps || [], summary: obj.summary || "" };
  } catch {
    return { gaps: [], summary: "Parse error" };
  }
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

    const { our_url, competitor_urls, our_url_path } = await req.json();
    if (!our_url || !Array.isArray(competitor_urls) || competitor_urls.length === 0) {
      return json({ error: "our_url and competitor_urls required" }, 400);
    }
    const ourPage = await fetchPage(our_url);
    const oursSeo = { ...extractFromHtml(ourPage.html), url: our_url };

    const compResults: Array<ExtractedSeo & { url: string; label?: string }> = [];
    for (const cu of competitor_urls.slice(0, 5)) {
      try {
        const p = await fetchPage(cu);
        const seo = extractFromHtml(p.html);
        compResults.push({ ...seo, url: cu });
      } catch (e) {
        console.warn(`[competitor] fail ${cu}:`, (e as Error).message);
      }
    }

    const { gaps, summary } = await aiGaps(oursSeo, compResults);

    const path = our_url_path || new URL(our_url).pathname;
    const inserts = compResults.map((c) => ({
      our_url_path: path,
      competitor_url: c.url,
      competitor_label: new URL(c.url).hostname,
      competitor_title: c.title,
      competitor_meta: c.meta,
      competitor_h1: c.h1,
      competitor_schema_types: c.schema_types,
      competitor_word_count: c.word_count,
      ai_gaps: gaps.filter((g: any) => g.competitor_url === c.url),
      ai_summary: summary,
    }));
    if (inserts.length) await sb.from("seo_competitor_snapshots").insert(inserts);

    return json({ ok: true, our: oursSeo, competitors: compResults, ai_gaps: gaps, ai_summary: summary });
  } catch (e) {
    console.error("[competitor]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
