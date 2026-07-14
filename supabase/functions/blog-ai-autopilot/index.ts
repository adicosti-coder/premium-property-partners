// Blog AI Auto-Pilot
// Analizează articole de blog și generează sugestii (title, meta_description, alt-uri, EN).
// Confidence >= 0.85 => aplică automat + snapshot rollback.
// Confidence <  0.85 => salvează în automation_approvals.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";
const CONF_THRESHOLD = 0.85;
const SITE = "https://realtrust.ro";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  translation_locked: boolean;
  ai_last_optimized_at: string | null;
};

interface AISuggestion {
  meta_title?: string;
  meta_description?: string;
  title_en?: string;
  excerpt_en?: string;
  content_en?: string;
  image_alts?: string[];
  confidence: number;
  rationale: string;
}

function extractImgs(html: string): string[] {
  const re = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out.slice(0, 8);
}

async function generateSuggestion(a: Article): Promise<AISuggestion | null> {
  const imgs = extractImgs(a.content);
  const prompt = `Ești expert SEO pentru RealTrust.ro (regim hotelier premium, Timișoara, ROI 9.4%).

Analizează articolul:
URL: ${SITE}/blog/${a.slug}
Title actual: ${a.title}
Meta title: ${a.meta_title ?? "(lipsește)"}
Meta description: ${a.meta_description ?? "(lipsește)"}
Excerpt: ${a.excerpt}
Traducere EN existentă: ${a.title_en ? "DA" : "NU"}
Imagini în articol: ${imgs.length}
Conținut (primele 1500 char): ${a.content.slice(0, 1500)}

Generează optimizări SEO în română (și traducere EN dacă lipsește ȘI nu e translation_locked=${a.translation_locked}).

Reguli:
- meta_title: max 60 chars, CTR magnetic, "Timișoara" dacă relevant
- meta_description: max 158 chars, beneficiu + CTA
- image_alts: câte un text descriptiv pentru fiecare imagine (max ${imgs.length})
- confidence: 0-1, cât de sigur ești că sugestia îmbunătățește semnificativ SEO
- rationale: max 200 char, explicație scurtă

Răspunde DOAR JSON:
{"meta_title":"...","meta_description":"...","title_en":"...","excerpt_en":"...","content_en":"...","image_alts":["...","..."],"confidence":0.0,"rationale":"..."}
Omite câmpurile pe care nu le modifici. Nu inventa cifre absente.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    console.error(`Gateway ${resp.status}: ${await resp.text()}`);
    return null;
  }
  const data = await resp.json();
  try {
    return JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as AISuggestion;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;
  const limit = Math.min(Number(body?.limit) || 5, 20);
  const articleId: string | undefined = body?.article_id;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Selectează articole: cele mai vechi neanalizate sau cu meta lipsă
  let q = supabase
    .from("blog_articles")
    .select("id, slug, title, excerpt, content, meta_title, meta_description, title_en, excerpt_en, content_en, translation_locked, ai_last_optimized_at")
    .eq("is_published", true)
    .order("ai_last_optimized_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (articleId) q = supabase
    .from("blog_articles")
    .select("id, slug, title, excerpt, content, meta_title, meta_description, title_en, excerpt_en, content_en, translation_locked, ai_last_optimized_at")
    .eq("id", articleId);

  const { data: articles, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!articles || articles.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "no_articles" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let applied = 0;
  let queued = 0;
  const errors: string[] = [];
  const results: Array<Record<string, unknown>> = [];
  const now = new Date().toISOString();
  const publishedUrls: string[] = [];

  for (const a of articles as Article[]) {
    try {
      const s = await generateSuggestion(a);
      if (!s) { errors.push(`${a.slug}: no suggestion`); continue; }

      const changes: Record<string, string> = {};
      if (s.meta_title && s.meta_title !== a.meta_title) changes.meta_title = s.meta_title.slice(0, 70);
      if (s.meta_description && s.meta_description !== a.meta_description) changes.meta_description = s.meta_description.slice(0, 170);
      if (!a.translation_locked) {
        if (s.title_en && s.title_en !== a.title_en) changes.title_en = s.title_en;
        if (s.excerpt_en && s.excerpt_en !== a.excerpt_en) changes.excerpt_en = s.excerpt_en;
        if (s.content_en && s.content_en !== a.content_en) changes.content_en = s.content_en;
      }

      if (Object.keys(changes).length === 0) {
        results.push({ slug: a.slug, skipped: "no_changes", confidence: s.confidence });
        continue;
      }

      const shouldApply = (s.confidence ?? 0) >= CONF_THRESHOLD;
      results.push({ slug: a.slug, confidence: s.confidence, action: shouldApply ? "apply" : "queue", fields: Object.keys(changes) });

      if (dryRun) continue;

      if (shouldApply) {
        // 1) Save snapshot
        const previousState = {
          title: a.title, meta_title: a.meta_title, meta_description: a.meta_description,
          title_en: a.title_en, excerpt_en: a.excerpt_en, content_en: a.content_en,
          content: a.content,
        };
        const { error: snapErr } = await supabase.from("blog_ai_snapshots").insert({
          article_id: a.id,
          triggered_by: "ai_pilot",
          previous_state: previousState,
          applied_changes: { ...changes, image_alts: s.image_alts ?? [] },
          confidence_score: Math.round((s.confidence ?? 0) * 100) / 100,
          ai_model: MODEL,
          rationale: s.rationale?.slice(0, 500),
        });
        if (snapErr) { errors.push(`${a.slug}: snapshot ${snapErr.message}`); continue; }

        // 2) Apply update
        const { error: upErr } = await supabase.from("blog_articles").update({
          ...changes,
          ai_last_optimized_at: now,
          ai_confidence_score: Math.round((s.confidence ?? 0) * 100) / 100,
          ai_pending_review: false,
        }).eq("id", a.id);
        if (upErr) { errors.push(`${a.slug}: update ${upErr.message}`); continue; }

        applied++;
        publishedUrls.push(`${SITE}/blog/${a.slug}`);
      } else {
        // Queue for approval
        await supabase.from("automation_approvals").insert({
          job_key: "blog.ai_autopilot",
          action_type: "apply_blog_optimization",
          entity_type: "blog_article",
          entity_id: a.id,
          severity: "info",
          proposal: { article_id: a.id, slug: a.slug, changes, image_alts: s.image_alts ?? [] },
          evidence: {
            confidence: s.confidence, rationale: s.rationale, model: MODEL,
            old_title: a.title, old_meta_title: a.meta_title, old_meta_description: a.meta_description,
          },
        });
        await supabase.from("blog_articles").update({
          ai_pending_review: true,
          ai_confidence_score: Math.round((s.confidence ?? 0) * 100) / 100,
        }).eq("id", a.id);
        queued++;
      }
    } catch (e) {
      errors.push(`${a.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Log run + IndexNow
  let indexnowStatus = "skipped";
  if (!dryRun && publishedUrls.length > 0) {
    try {
      const { data: pingData, error: pingErr } = await supabase.functions.invoke("indexnow-notify", {
        body: { urls: publishedUrls, triggered_by: "blog-ai-autopilot" },
      });
      indexnowStatus = pingErr ? `error:${pingErr.message}` : (pingData as any)?.status ?? "sent";
    } catch (e) {
      indexnowStatus = `error:${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (!dryRun) {
    await supabase.from("auto_publish_logs").insert({
      articles_published: applied,
      published_slugs: publishedUrls.map((u) => u.split("/").pop() || ""),
      indexnow_status: indexnowStatus,
      error_message: errors.length > 0 ? `blog_ai_autopilot | queued=${queued} | ${errors.slice(0, 5).join(" | ")}` : (queued > 0 ? `blog_ai_autopilot | queued=${queued}` : null),
    });
  }

  return new Response(JSON.stringify({
    dry_run: dryRun, processed: articles.length, applied, queued, indexnow_status: indexnowStatus, results, errors,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
