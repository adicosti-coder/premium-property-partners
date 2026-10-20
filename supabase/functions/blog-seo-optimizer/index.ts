// Optimizes existing blog articles (published + drafts): headings, readability,
// meta tags, FAQ (rendered as FAQPage JSON-LD next to BlogPosting), internal
// links and a closing CTA. Bounded per run; snapshots previous state for rollback.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { AIError, callAI, MODELS } from "../_shared/aiClient.ts";
import { countInternalLinks, polishArticle, STATIC_INTERNAL_PATHS } from "../_shared/blogSeoPolish.ts";

const MAX_PER_RUN = 3;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `Ești editor SEO pentru blogul RealTrust / ApArt Hotel din Timișoara. Îmbunătățești un articol existent fără să inventezi fapte.
Reguli:
1. Păstrează sensul și faptele. Nu adăuga cifre, prețuri sau statistici noi. Randamentul se scrie doar „6,5–9,4% net estimat”. Comision administrare 15–20%. Doar Timișoara; fără birou fizic.
2. Structură Markdown: fără H1; secțiuni ## (H2) și subsecțiuni ### (H3) logice; paragrafe de 2–4 fraze; fraze sub 25 de cuvinte; liste unde ajută.
3. Inserează 3–5 legături interne naturale, DOAR din lista LINKURI PERMISE, format [text](/cale). Nu inventa alte căi.
4. Nu scrie CTA final, „Meta descriere” sau „Cuvinte cheie” în conținut.
5. meta_title: max 60 caractere, Sentence Case românesc. meta_description: 145–160 caractere, fără îndemn generic.
6. faq: 3–5 întrebări reale ale cititorilor, răspunsuri de 1–3 fraze bazate pe articol.`;

const SCHEMA = {
  name: "blog_seo",
  schema: {
    type: "object", additionalProperties: false,
    required: ["content_md", "meta_title", "meta_description", "faq"],
    properties: {
      content_md: { type: "string" },
      meta_title: { type: "string" },
      meta_description: { type: "string" },
      faq: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } } } },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const onlyId: string | undefined = typeof body?.article_id === "string" ? body.article_id : undefined;

  let q = sb.from("blog_articles").select("id, slug, title, content, meta_title, meta_description, faq_items, cover_image, main_image_url, is_published");
  q = onlyId ? q.eq("id", onlyId) : q.is("ai_last_optimized_at", null).order("is_published", { ascending: true }).order("created_at").limit(MAX_PER_RUN);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const [{ data: posts }, { data: complexes }] = await Promise.all([
    sb.from("blog_articles").select("slug, title").eq("is_published", true).limit(200),
    sb.from("residential_complexes").select("slug, name").limit(100),
  ]);
  const links = [
    ...STATIC_INTERNAL_PATHS.map((p) => ({ path: p, title: p })),
    ...(complexes ?? []).map((c: any) => ({ path: `/complexe/${c.slug}`, title: `Ansamblul ${c.name ?? c.slug}` })),
  ];

  const results: unknown[] = [];
  for (const a of rows ?? []) {
    const own = (posts ?? []).filter((p: any) => p.slug !== a.slug).map((p: any) => ({ path: `/blog/${p.slug}`, title: p.title }));
    const all = [...links, ...own];
    const allowed = new Set(all.map((l) => l.path));
    try {
      const { content: r, model } = await callAI({
        model: MODELS.text, fallbackModel: MODELS.fallback, schema: SCHEMA, label: "blog-seo-optimizer",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `LINKURI PERMISE:\n${all.slice(0, 80).map((l) => `${l.path} — ${l.title}`).join("\n")}\n\nTITLU: ${a.title}\n\nARTICOL:\n${(a.content ?? "").slice(0, 24000)}` },
        ],
      });
      const content = polishArticle(String(r.content_md || a.content || ""), allowed);
      const faq = (r.faq ?? []).filter((f: any) => f.question && f.answer).slice(0, 5);
      const update = {
        content,
        meta_title: String(r.meta_title || "").slice(0, 70) || a.meta_title,
        meta_description: String(r.meta_description || "").slice(0, 160) || a.meta_description,
        faq_items: faq.length ? faq : a.faq_items,
        ai_last_optimized_at: new Date().toISOString(),
      };
      await sb.from("blog_ai_snapshots").insert({
        article_id: a.id, triggered_by: onlyId ? "manual" : "cron", ai_model: model,
        previous_state: { content: a.content, meta_title: a.meta_title, meta_description: a.meta_description, faq_items: a.faq_items },
        applied_changes: { meta_title: update.meta_title, meta_description: update.meta_description, faq_count: faq.length, internal_links: countInternalLinks(content) },
        rationale: "SEO: structură H2/H3, meta, FAQ, linkuri interne, CTA",
      });
      const { error: uErr } = await sb.from("blog_articles").update(update).eq("id", a.id);
      results.push({ id: a.id, slug: a.slug, ok: !uErr, links: countInternalLinks(content), faq: faq.length, error: uErr?.message });
    } catch (e) {
      const status = e instanceof AIError ? e.status : 500;
      results.push({ id: a.id, error: String((e as Error).message), status });
      if ([402, 403, 429].includes(status)) break; // circuit breaker
    }
  }
  return json({ processed: results.length, results });
});
