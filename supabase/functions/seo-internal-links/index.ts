// SEO Internal Linking Suggestions — AI scans the project's main pages
// and proposes 3-5 anchor + target pairs for a given source page.
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

const STATIC_HUB_PAGES: Array<{ path: string; title: string; topic: string }> = [
  { path: "/", title: "Acasă RealTrust", topic: "Investiții imobiliare Timișoara, regim hotelier, ROI 9.4%" },
  { path: "/cartiere", title: "Imobiliare Timișoara", topic: "Listări apartamente, regim hotelier, vânzare" },
  { path: "/pentru-proprietari", title: "Pentru Proprietari", topic: "Administrare regim hotelier, ROI, calculator" },
  { path: "/cazare", title: "Pentru Oaspeți", topic: "Cazare premium Timișoara, apartamente verificate" },
  { path: "/investitii", title: "Investiții", topic: "Catalog investiții imobiliare, dealroom, ROI" },
  { path: "/calculator-roi", title: "Calculator ROI", topic: "Compară ROI hotelier vs închiriere clasică" },
  { path: "/blog", title: "Blog ApArt Hotel", topic: "Ghiduri investiții și regim hotelier" },
  { path: "/cere-evaluare", title: "Evaluare proprietate", topic: "Form evaluare 4 pași" },
];

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
    const action = body.action || "suggest";

    if (action === "list") {
      const { data } = await sb
        .from("seo_internal_link_suggestions")
        .select("*")
        .eq("source_url_path", body.source_url_path)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ ok: true, suggestions: data || [] });
    }

    if (action === "update_status") {
      const { data: row } = await sb
        .from("seo_internal_link_suggestions")
        .select("*")
        .eq("id", body.suggestion_id)
        .maybeSingle();
      const { error } = await sb
        .from("seo_internal_link_suggestions")
        .update({
          status: body.status,
          applied_at: body.status === "applied" ? new Date().toISOString() : null,
          applied_by: body.status === "applied" ? u.user.id : null,
        })
        .eq("id", body.suggestion_id);
      if (error) throw error;
      if (row && body.status === "applied") {
        await sb.from("seo_audit_log").insert({
          action: "internal_link_applied",
          category: "internal_linking",
          url_path: row.source_url_path,
          source: body.auto ? "auto" : "manual",
          payload: {
            suggestion_id: row.id,
            source_url_path: row.source_url_path,
            target_url_path: row.target_url_path,
            anchor_text: row.anchor_text,
            relevance_score: row.relevance_score,
          },
          applied_by: u.user.id,
        });
      }
      return json({ ok: true });
    }

    if (action === "revert_log") {
      const logId = body.log_id;
      const { data: log } = await sb.from("seo_audit_log").select("*").eq("id", logId).maybeSingle();
      if (!log) return json({ error: "Log not found" }, 404);
      const sid = (log.payload as any)?.suggestion_id;
      if (sid) {
        await sb.from("seo_internal_link_suggestions")
          .update({ status: "rejected", applied_at: null, applied_by: null })
          .eq("id", sid);
      }
      await sb.from("seo_audit_log")
        .update({ reverted: true, reverted_at: new Date().toISOString() })
        .eq("id", logId);
      return json({ ok: true });
    }

    if (action === "revert_run") {
      const runId = body.run_id;
      if (!runId) return json({ error: "run_id required" }, 400);
      const { data: logs } = await sb
        .from("seo_audit_log")
        .select("id, payload, reverted")
        .eq("action", "internal_link_applied")
        .eq("source", "auto")
        .filter("payload->>run_id", "eq", runId);
      const ids = (logs || []).map((l: any) => l.id);
      const sids = (logs || [])
        .filter((l: any) => !l.reverted)
        .map((l: any) => (l.payload as any)?.suggestion_id)
        .filter(Boolean);
      if (sids.length) {
        await sb.from("seo_internal_link_suggestions")
          .update({ status: "rejected", applied_at: null, applied_by: null })
          .in("id", sids);
      }
      if (ids.length) {
        await sb.from("seo_audit_log")
          .update({ reverted: true, reverted_at: new Date().toISOString() })
          .in("id", ids);
      }
      return json({ ok: true, reverted: ids.length });
    }

    if (action === "list_runs") {
      // Group auto-apply logs by run_id
      const { data: logs } = await sb
        .from("seo_audit_log")
        .select("id, applied_at, reverted, payload, url_path")
        .eq("action", "internal_link_applied")
        .eq("source", "auto")
        .order("applied_at", { ascending: false })
        .limit(500);
      const runs = new Map<string, any>();
      for (const l of logs || []) {
        const rid = (l.payload as any)?.run_id || `single:${l.id}`;
        const r = runs.get(rid) || { run_id: rid, count: 0, reverted: 0, last_at: l.applied_at, pages: new Set<string>(), items: [] };
        r.count++;
        if (l.reverted) r.reverted++;
        r.pages.add(l.url_path);
        r.items.push(l);
        runs.set(rid, r);
      }
      const out = Array.from(runs.values()).map(r => ({
        ...r, pages: Array.from(r.pages), pages_count: r.pages.size,
      }));
      return json({ ok: true, runs: out });
    }

    // suggest
    const sourcePath = body.source_url_path as string;
    const sourceTitle = body.source_title || sourcePath;
    const sourceContext = body.source_context || "";
    const runId = body.run_id || null;
    if (!sourcePath) return json({ error: "source_url_path required" }, 400);
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Pull a few extra real listings/articles as candidate targets
    const candidates = [...STATIC_HUB_PAGES];
    const { data: recentAudits } = await sb
      .from("seo_audits")
      .select("url, title, suggested_meta")
      .neq("url", `https://www.realtrust.ro${sourcePath}`)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const a of recentAudits || []) {
      try {
        const u2 = new URL((a as any).url);
        candidates.push({ path: u2.pathname, title: (a as any).title || u2.pathname, topic: (a as any).suggested_meta || "" });
      } catch {/* ignore */}
    }

    const seen = new Set<string>();
    const dedup = candidates.filter((c) => {
      if (c.path === sourcePath || seen.has(c.path)) return false;
      seen.add(c.path);
      return true;
    }).slice(0, 30);

    const prompt = `Ești expert SEO. Pagina sursă este "${sourceTitle}" (${sourcePath}). Context: ${sourceContext.slice(0, 600)}

Propune 3-5 link-uri INTERNE relevante pe care le-aș adăuga în textul paginii sursă. Pentru fiecare alege un anchor text natural în română (4-8 cuvinte) și o pagină ȚINTĂ din lista de mai jos.

Pagini candidate:
${dedup.map((c) => `- ${c.path} | ${c.title} | ${c.topic}`).join("\n")}

Output JSON: {"suggestions":[{"target_url_path":"/...", "anchor_text":"...", "reason":"...", "relevance_score": 1-100}]}`;

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
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return json({ error: `AI ${res.status}: ${t.slice(0, 200)}` }, 500);
    }
    const data = await res.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data.choices[0].message.content); } catch {/* ignore */}
    const suggestions: any[] = (parsed.suggestions || []).slice(0, 7);

    const autoApplyThreshold = Number(body.auto_apply_threshold ?? 0);
    const maxAutoPerPage = Number(body.max_auto_per_page ?? 3);

    // Rate limit: count existing applied auto links for this source page
    let existingAutoCount = 0;
    if (autoApplyThreshold > 0) {
      const { count } = await sb
        .from("seo_internal_link_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("source_url_path", sourcePath)
        .eq("status", "applied");
      existingAutoCount = count || 0;
    }
    let autoBudget = Math.max(0, maxAutoPerPage - existingAutoCount);

    if (suggestions.length) {
      const now = new Date().toISOString();
      // Sort by score desc so best ones consume the auto budget first
      const ordered = [...suggestions].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      const rows = ordered.map((s) => {
        const score = Number(s.relevance_score || 0);
        const wantsAuto = autoApplyThreshold > 0 && score >= autoApplyThreshold;
        const auto = wantsAuto && autoBudget > 0;
        if (auto) autoBudget--;
        return {
          source_url_path: sourcePath,
          target_url_path: s.target_url_path,
          anchor_text: s.anchor_text,
          reason: s.reason || null,
          relevance_score: s.relevance_score || null,
          status: auto ? "applied" : "proposed",
          applied_at: auto ? now : null,
          applied_by: auto ? u.user.id : null,
        };
      });
      const { data: inserted } = await sb
        .from("seo_internal_link_suggestions")
        .insert(rows)
        .select("*");
      // Log auto-applied insertions
      const autoLogs = (inserted || [])
        .filter((r: any) => r.status === "applied")
        .map((r: any) => ({
          action: "internal_link_applied",
          category: "internal_linking",
          url_path: r.source_url_path,
          source: "auto",
          payload: {
            suggestion_id: r.id,
            source_url_path: r.source_url_path,
            target_url_path: r.target_url_path,
            anchor_text: r.anchor_text,
            relevance_score: r.relevance_score,
            threshold: autoApplyThreshold,
            run_id: runId,
            max_per_page: maxAutoPerPage,
          },
          applied_by: u.user.id,
        }));
      if (autoLogs.length) await sb.from("seo_audit_log").insert(autoLogs);
    }

    return json({ ok: true, suggestions, run_id: runId, auto_budget_remaining: autoBudget });
  } catch (e) {
    console.error("[internal-links]", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
