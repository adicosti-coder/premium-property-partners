// SEO Benchmark Apply — securizat cu requireAdmin + validare strictă input.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const PATH_RE = /^\/[a-z0-9/_-]*$/;
const MAX_ANCHOR = 160;
const MAX_H2 = 200;
const MAX_DRAFT = 4000;
const MAX_KEYWORDS = 20;
const MAX_DRAFTS = 8;

function pathOf(u: string): string {
  try { return new URL(u).pathname.replace(/\/$/, "") || "/"; } catch { return "/"; }
}

function sanitizePath(p: unknown): string | null {
  if (typeof p !== "string") return null;
  const t = p.trim();
  if (!t || t.length > 200 || !PATH_RE.test(t)) return null;
  return t;
}

function sanitizeStr(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t || t.length > max) return null;
  return t;
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
    // Strict admin gate — JWT + role check
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
    const userId = auth.userId!;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const mode: string = body?.mode;
    const our_url = sanitizeStr(body?.our_url, 500);
    if (!our_url || !mode) return json({ error: "our_url and mode required" }, 400);

    let url_path: string;
    try { url_path = pathOf(our_url); } catch { return json({ error: "Invalid our_url" }, 400); }
    if (!PATH_RE.test(url_path)) return json({ error: "Invalid url_path" }, 400);

    if (mode === "schema") {
      const best_schema = body.best_schema;
      if (!best_schema || typeof best_schema !== "object") return json({ error: "best_schema required" }, 400);
      const schemaStr = JSON.stringify(best_schema);
      if (schemaStr.length > 50000) return json({ error: "Schema too large" }, 400);
      const { data: existing } = await sb.from("seo_overrides").select("id").eq("url_path", url_path).maybeSingle();
      if (existing) {
        await sb.from("seo_overrides")
          .update({ json_ld: best_schema, is_active: true, applied_by: userId, applied_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await sb.from("seo_overrides").insert({
          url_path, json_ld: best_schema, is_active: true,
          applied_by: userId, applied_at: new Date().toISOString(),
        });
      }
      return json({ ok: true, mode, url_path, applied: true });
    }

    if (mode === "local_links") {
      const keywords: unknown = body.missing_keywords;
      if (!Array.isArray(keywords) || keywords.length === 0) return json({ error: "missing_keywords required" }, 400);
      const clean = (keywords as unknown[]).slice(0, MAX_KEYWORDS).map((k) => sanitizeStr(k, 80)).filter(Boolean) as string[];
      if (!clean.length) return json({ error: "No valid keywords" }, 400);
      const slug = (k: string) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const rows = clean.map((kw) => ({
        source_url_path: url_path,
        target_url_path: `/cartiere/${slug(kw)}`,
        anchor_text: `apartamente ${kw} Timișoara`.slice(0, MAX_ANCHOR),
        reason: `Cartier menționat de competitor, lipsă la noi`,
        relevance_score: 80,
        status: "pending",
      }));
      const { error } = await sb.from("seo_internal_link_suggestions").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, mode, inserted: rows.length });
    }

    if (mode === "h2_briefs") {
      const raw: unknown = body.h2_titles;
      if (!Array.isArray(raw) || !raw.length) return json({ error: "h2_titles required" }, 400);
      const h2_titles = (raw as unknown[]).slice(0, MAX_DRAFTS).map((h) => sanitizeStr(h, MAX_H2)).filter(Boolean) as string[];
      if (!h2_titles.length) return json({ error: "No valid h2_titles" }, 400);
      const competitor_url = sanitizeStr(body.competitor_url, 500) || "";
      const drafts: any[] = [];
      for (const h2 of h2_titles) {
        const draft = await geminiBrief(h2, url_path);
        drafts.push({
          url_path, competitor_url, h2_title: h2, draft_content: draft,
          status: "draft", generated_by: userId,
        });
      }
      const { error } = await sb.from("seo_content_briefs").insert(drafts);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, mode, generated: drafts.length, drafts });
    }

    if (mode === "preview_full") {
      const raw: unknown = body.h2_titles;
      const h2_titles = Array.isArray(raw)
        ? (raw as unknown[]).slice(0, MAX_DRAFTS).map((h) => sanitizeStr(h, MAX_H2)).filter(Boolean) as string[]
        : [];
      const drafts: Array<{ h2_title: string; draft_content: string }> = [];
      for (const h2 of h2_titles) {
        const draft = await geminiBrief(h2, url_path);
        drafts.push({ h2_title: h2, draft_content: draft });
      }
      const slugP = (k: string) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const rawKw: unknown = body.missing_keywords;
      const kws = Array.isArray(rawKw)
        ? (rawKw as unknown[]).slice(0, MAX_KEYWORDS).map((k) => sanitizeStr(k, 80)).filter(Boolean) as string[]
        : [];
      const links = kws.map((kw) => ({
        keyword: kw,
        target_url_path: `/cartiere/${slugP(kw)}`,
        anchor_text: `apartamente ${kw} Timișoara`,
      }));
      return json({ ok: true, mode, url_path, drafts, links });
    }

    if (mode === "apply_full") {
      const summary: any = { schema: false, links: 0, briefs: 0 };
      const competitor_url = sanitizeStr(body.competitor_url, 500) || "";

      // 1. Schema
      if (body.best_schema && typeof body.best_schema === "object") {
        const schemaStr = JSON.stringify(body.best_schema);
        if (schemaStr.length > 50000) return json({ error: "Schema too large" }, 400);
        const { data: existing } = await sb.from("seo_overrides").select("id").eq("url_path", url_path).maybeSingle();
        if (existing) {
          await sb.from("seo_overrides").update({
            json_ld: body.best_schema, is_active: true,
            applied_by: userId, applied_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await sb.from("seo_overrides").insert({
            url_path, json_ld: body.best_schema, is_active: true,
            applied_by: userId, applied_at: new Date().toISOString(),
          });
        }
        summary.schema = true;
      }

      // 2. Internal links — strict validation + de-dup
      if (Array.isArray(body.links) && body.links.length > 0) {
        const seen = new Set<string>();
        const rows: any[] = [];
        for (const l of (body.links as unknown[]).slice(0, MAX_KEYWORDS)) {
          if (!l || typeof l !== "object") continue;
          const anchor = sanitizeStr((l as any).anchor_text, MAX_ANCHOR);
          const target = sanitizePath((l as any).target_url_path);
          if (!anchor || !target) continue;
          if (seen.has(target)) continue;
          seen.add(target);
          rows.push({
            source_url_path: url_path,
            target_url_path: target,
            anchor_text: anchor,
            reason: sanitizeStr((l as any).reason, 300) || "Cartier menționat de competitor, lipsă la noi",
            relevance_score: 80,
            status: "pending",
          });
        }
        if (rows.length) {
          const { error } = await sb.from("seo_internal_link_suggestions").insert(rows);
          if (!error) summary.links = rows.length;
        }
      }

      // 3. H2 drafts — strict validation
      if (Array.isArray(body.drafts) && body.drafts.length > 0) {
        const rows: any[] = [];
        for (const d of (body.drafts as unknown[]).slice(0, MAX_DRAFTS)) {
          if (!d || typeof d !== "object") continue;
          const h2 = sanitizeStr((d as any).h2_title, MAX_H2);
          const draft = sanitizeStr((d as any).draft_content, MAX_DRAFT);
          if (!h2 || !draft) continue;
          rows.push({
            url_path, competitor_url,
            h2_title: h2, draft_content: draft,
            status: "draft", generated_by: userId,
          });
        }
        if (rows.length) {
          const { error } = await sb.from("seo_content_briefs").insert(rows);
          if (!error) summary.briefs = rows.length;
        }
      }

      return json({ ok: true, mode, url_path, summary });
    }

    return json({ error: "unknown mode" }, 400);
  } catch (e) {
    console.error("[seo-benchmark-apply]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
