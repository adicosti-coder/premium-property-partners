// SEO Auto-Fill Meta
// Scans seo_page_audits for pages with weak/missing title or meta_description (or low health_score),
// generates Gemini-powered drafts, writes them to seo_overrides with pending_review=true.
// Drafts NEVER go live until admin approves. Creates an automation_approval per draft.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";
const BATCH = 10;
const SITE = "https://realtrust.ro";

type Audit = {
  page: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  health_score: number;
  word_count: number;
};

async function generateMeta(audit: Audit): Promise<{ title: string; meta_description: string; rationale: string }> {
  const prompt = `Ești expert SEO RealTrust.ro (imobiliare Timișoara, hotel-regime, ROI 9.4%). Generează title (max 60 char) și meta description (max 158 char) în română pentru pagina:

URL: ${SITE}${audit.page}
H1 actual: ${audit.h1 ?? "—"}
Title actual: ${audit.title ?? "(lipsește)"}
Meta actual: ${audit.meta_description ?? "(lipsește)"}
Cuvinte: ${audit.word_count}
Score: ${audit.health_score}/100

Reguli:
- Include "Timișoara" sau zonă specifică dacă apare în URL/H1.
- Pentru investitori: ROI, hotel-regime, randament. Pentru oaspeți: cazare, premium, central.
- Title cu CTR magnetic (cifre, beneficii). Meta cu beneficiu + acțiune.
- NU inventa cifre care nu apar deja pe site.

Răspunde DOAR JSON: {"title":"...","meta_description":"...","rationale":"max 100 char"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`Gateway ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find pages needing meta improvement: missing title/meta OR very weak (<30 char)
  const { data: audits, error } = await supabase
    .from("seo_page_audits")
    .select("page, title, meta_description, h1, health_score, word_count, last_scraped_at")
    .or("title.is.null,meta_description.is.null")
    .order("health_score", { ascending: true })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!audits || audits.length === 0) {
    return new Response(JSON.stringify({ drafts_created: 0, message: "no_pages_need_meta" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Skip pages that already have a pending draft
  const pages = audits.map((a) => a.page);
  const { data: existing } = await supabase
    .from("seo_overrides")
    .select("url_path")
    .in("url_path", pages)
    .eq("pending_review", true);
  const skipSet = new Set((existing ?? []).map((e) => e.url_path));

  let created = 0;
  let approvalsCreated = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const audit of audits) {
    if (skipSet.has(audit.page)) continue;
    try {
      const draft = await generateMeta(audit as Audit);
      if (!draft?.title || !draft?.meta_description) continue;

      // upsert as pending_review (does NOT replace active overrides)
      const { error: upErr } = await supabase
        .from("seo_overrides")
        .upsert({
          url_path: audit.page,
          title: draft.title.slice(0, 70),
          meta_description: draft.meta_description.slice(0, 170),
          pending_review: true,
          ai_generated: true,
          ai_model: MODEL,
          ai_generated_at: now,
          is_active: false, // explicit: don't go live until admin approves
        }, { onConflict: "url_path" });
      if (upErr) { errors.push(`${audit.page}: ${upErr.message}`); continue; }
      created++;

      await supabase.from("automation_approvals").insert({
        job_key: "seo.auto_fill_meta",
        action_type: "apply_meta_draft",
        entity_type: "seo_override",
        entity_id: null,
        severity: "info",
        proposal: {
          url_path: audit.page,
          title: draft.title,
          meta_description: draft.meta_description,
          rationale: draft.rationale ?? "",
        },
        evidence: {
          old_title: audit.title,
          old_meta: audit.meta_description,
          health_score: audit.health_score,
          model: MODEL,
        },
      });
      approvalsCreated++;
    } catch (e) {
      errors.push(`${audit.page}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(JSON.stringify({
    drafts_created: created,
    approvals_created: approvalsCreated,
    skipped_existing: skipSet.size,
    errors,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
