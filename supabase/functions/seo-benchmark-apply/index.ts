// SEO Benchmark Apply — convertește rezultatele Benchmark în acțiuni:
//  - mode=schema       → upsert seo_overrides.json_ld pentru url_path
//  - mode=local_links  → insert seo_internal_link_suggestions (status=pending) pentru cartiere lipsă
//  - mode=h2_briefs    → generează drafturi H2 cu Gemini și salvează în seo_content_briefs
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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function pathOf(u: string): string {
  try { return new URL(u).pathname.replace(/\/$/, "") || "/"; } catch { return "/"; }
}

async function geminiBrief(h2: string, urlPath: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "";
  const prompt = `Scrie un draft de 80-120 cuvinte în limba română pentru un H2 nou pe pagina RealTrust ${urlPath}.
H2: "${h2}"
Context brand: RealTrust = imobiliare premium Timișoara, regim hotelier, ROI 9.4% net, fondator Adrian Costi.
Stil: profesional, persuasiv, factual. Include 1 keyword local (Timișoara/cartier) și 1 CTA subtil.
Răspunde DOAR cu textul paragrafului, fără markdown.`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) return "";
    const d = await r.json();
    return (d.choices?.[0]?.message?.content || "").trim();
  } catch { return ""; }
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
    const mode: "schema" | "local_links" | "h2_briefs" = body.mode;
    const our_url: string = body.our_url;
    if (!our_url || !mode) return json({ error: "our_url and mode required" }, 400);
    const url_path = pathOf(our_url);

    if (mode === "schema") {
      const best_schema = body.best_schema;
      if (!best_schema) return json({ error: "best_schema required" }, 400);
      // Upsert seo_overrides.json_ld
      const { data: existing } = await sb.from("seo_overrides").select("id").eq("url_path", url_path).maybeSingle();
      if (existing) {
        await sb.from("seo_overrides")
          .update({ json_ld: best_schema, is_active: true, applied_by: u.user.id, applied_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await sb.from("seo_overrides").insert({
          url_path, json_ld: best_schema, is_active: true,
          applied_by: u.user.id, applied_at: new Date().toISOString(),
        });
      }
      return json({ ok: true, mode, url_path, applied: true });
    }

    if (mode === "local_links") {
      const keywords: string[] = body.missing_keywords || [];
      if (!keywords.length) return json({ error: "missing_keywords required" }, 400);
      const slug = (k: string) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const rows = keywords.map((kw) => ({
        source_url_path: url_path,
        target_url_path: `/cartiere/${slug(kw)}`,
        anchor_text: `apartamente ${kw} Timișoara`,
        reason: `Cartier menționat de competitor, lipsă la noi`,
        relevance_score: 80,
        status: "pending",
      }));
      const { error } = await sb.from("seo_internal_link_suggestions").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, mode, inserted: rows.length });
    }

    if (mode === "h2_briefs") {
      const h2_titles: string[] = (body.h2_titles || []).slice(0, 8);
      const competitor_url: string = body.competitor_url || "";
      if (!h2_titles.length) return json({ error: "h2_titles required" }, 400);
      const drafts: any[] = [];
      for (const h2 of h2_titles) {
        const draft = await geminiBrief(h2, url_path);
        drafts.push({
          url_path, competitor_url, h2_title: h2, draft_content: draft,
          status: "draft", generated_by: u.user.id,
        });
      }
      const { error } = await sb.from("seo_content_briefs").insert(drafts);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, mode, generated: drafts.length, drafts });
    }

    return json({ error: "unknown mode" }, 400);
  } catch (e) {
    console.error("[seo-benchmark-apply]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
