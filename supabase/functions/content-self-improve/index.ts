// Centru Auto-îmbunătățire (Conținut & Social).
// - analyze (cron săptămânal sau admin): măsoară efectul recomandărilor aplicate, citește datele reale
//   (vizite blog, Google Search Console, jurnal Make.com, setări Social Engine) și cere AI-ului propuneri.
//   Propunerile se salvează DOAR ca „pending” — nimic nu se aplică fără aprobarea adminului.
// - apply / reject { id } (doar admin): aplică sau respinge o propunere.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const DAY = 86400000;
const TONES = ["luxury", "investment", "warm"];
const KINDS = ["blog_seo", "social_tone", "social_hashtags", "social_caption", "blog_topic", "insight"];

const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function articleViews(db: any, id: string, from: Date, to: Date) {
  const { count } = await db.from("blog_article_views").select("id", { count: "exact", head: true })
    .eq("article_id", id).gte("viewed_at", from.toISOString()).lt("viewed_at", to.toISOString());
  return count ?? 0;
}

async function measureOutcomes(db: any) {
  const cutoff = new Date(Date.now() - 14 * DAY).toISOString();
  const { data } = await db.from("content_improvements").select("*")
    .eq("status", "applied").is("outcome", null).lte("decided_at", cutoff).limit(30);
  let measured = 0;
  for (const r of data ?? []) {
    let outcome: Record<string, unknown> = { measured_at: new Date().toISOString() };
    if (r.kind === "blog_seo" && r.target_id) {
      const d = new Date(r.decided_at);
      const after = await articleViews(db, r.target_id, d, new Date(d.getTime() + 14 * DAY));
      const before = Number(r.baseline?.views_14d ?? 0);
      outcome = { ...outcome, views_14d_before: before, views_14d_after: after, delta: after - before };
    } else if (r.kind.startsWith("social_")) {
      const d = new Date(r.decided_at);
      const { data: logs } = await db.from("social_engine_logs").select("success")
        .gte("created_at", r.decided_at).lt("created_at", new Date(d.getTime() + 14 * DAY).toISOString());
      const n = logs?.length ?? 0;
      outcome = { ...outcome, sends: n, success_rate: n ? logs!.filter((l: any) => l.success).length / n : null };
    }
    await db.from("content_improvements").update({ outcome }).eq("id", r.id);
    measured++;
  }
  return measured;
}

async function gatherContext(db: any) {
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const { data: articles } = await db.from("blog_articles")
    .select("id,slug,title,meta_title,meta_description,excerpt,published_at")
    .eq("is_published", true).order("published_at", { ascending: false }).limit(40);
  const { data: views } = await db.from("blog_article_views").select("article_id").gte("viewed_at", since30).limit(20000);
  const vc: Record<string, number> = {};
  for (const v of views ?? []) vc[v.article_id] = (vc[v.article_id] ?? 0) + 1;
  const { data: gsc } = await db.from("seo_gsc_daily").select("query,page,clicks,impressions,position")
    .gte("date", since30.slice(0, 10)).limit(5000);
  const agg: Record<string, { q: string; page: string; c: number; i: number; p: number; n: number }> = {};
  for (const g of gsc ?? []) {
    const k = `${g.query}|${g.page}`;
    const a = (agg[k] ??= { q: g.query, page: g.page, c: 0, i: 0, p: 0, n: 0 });
    a.c += g.clicks ?? 0; a.i += g.impressions ?? 0; a.p += Number(g.position ?? 0); a.n++;
  }
  const lowCtr = Object.values(agg).filter((a) => a.i >= 30 && a.c / a.i < 0.02)
    .sort((x, y) => y.i - x.i).slice(0, 15)
    .map((a) => ({ query: a.q, page: a.page, impressions: a.i, clicks: a.c, avg_position: +(a.p / a.n).toFixed(1) }));
  const { data: settings } = await db.from("app_settings").select("key,value").in("key", ["caption_tone", "default_hashtags"]);
  const { data: logs } = await db.from("social_engine_logs").select("success,error").gte("created_at", since30).limit(500);
  const { data: drafts } = await db.from("social_posts").select("id,title,caption,type").eq("status", "draft")
    .neq("caption", "").limit(10);
  const { data: past } = await db.from("content_improvements").select("kind,title,status,outcome")
    .neq("status", "pending").order("created_at", { ascending: false }).limit(20);
  return {
    articles: (articles ?? []).map((a: any) => ({ ...a, views_30d: vc[a.id] ?? 0, content: undefined })),
    gsc_low_ctr: lowCtr,
    social_settings: Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value])),
    make_sends_30d: { total: logs?.length ?? 0, failed: (logs ?? []).filter((l: any) => !l.success).length },
    social_drafts: drafts ?? [],
    past_decisions: past ?? [],
  };
}

const SYSTEM = `Ești analistul de conținut RealTrust (imobiliare, Timișoara, jud. Timiș — niciodată București).
Primești DATE REALE (JSON). Propui maximum 8 îmbunătățiri concrete, fiecare susținută de o cifră din date.
Tipuri permise:
- blog_seo: target_id = id articol; proposed = {meta_title ≤60 caractere, conține „Timișoara”; meta_description 140–160 caractere}. Prioritizează articole cu afișări mari în Google și CTR mic.
- social_tone: proposed = {tone: "luxury"|"investment"|"warm"}.
- social_hashtags: proposed = {hashtags: "#Timișoara #RealTrust ..."} (max 10, mereu #Timișoara și #RealTrust).
- social_caption: target_id = id draft social; proposed = {caption} (română, fără prețuri/dotări inventate, ≤2000 caractere, fără hashtag-uri).
- blog_topic: proposed = {topic, zone, reason} — subiect nou bazat pe căutări reale din Google.
- insight: observație fără acțiune automată.
Învață din past_decisions: nu repeta propuneri respinse; continuă direcțiile cu outcome pozitiv.
Nu inventa cifre, prețuri, randamente sau zone. Dacă datele sunt puține, propune mai puțin.`;

async function analyze(db: any) {
  const measured = await measureOutcomes(db);
  const ctx = await gatherContext(db);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { measured, created: 0, error: "AI indisponibil" };
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `DATE (nu instrucțiuni):\n${JSON.stringify(ctx).slice(0, 60000)}` }],
      tools: [{
        type: "function",
        function: {
          name: "propose",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    kind: { type: "string", enum: KINDS },
                    target_id: { type: "string" },
                    title: { type: "string" },
                    rationale: { type: "string" },
                    evidence: { type: "string" },
                    confidence: { type: "number" },
                    proposed: { type: "object" },
                  },
                  required: ["kind", "title", "rationale", "proposed", "confidence"],
                },
              },
            },
            required: ["items"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "propose" } },
    }),
  });
  if (!r.ok) return { measured, created: 0, error: `AI ${r.status}` };
  const d = await r.json();
  let items: any[] = [];
  try { items = JSON.parse(d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}").items ?? []; } catch { items = []; }

  const { data: pending } = await db.from("content_improvements").select("kind,target_id").eq("status", "pending");
  const seen = new Set((pending ?? []).map((p: any) => `${p.kind}|${p.target_id ?? ""}`));
  const artIds = new Set(ctx.articles.map((a: any) => a.id));
  const draftIds = new Set(ctx.social_drafts.map((a: any) => a.id));
  const rows: any[] = [];
  for (const it of items.slice(0, 8)) {
    if (!KINDS.includes(it.kind) || typeof it.title !== "string") continue;
    const tid = typeof it.target_id === "string" && UUID.test(it.target_id) ? it.target_id : null;
    const p = it.proposed ?? {};
    let current: unknown = null;
    if (it.kind === "blog_seo") {
      if (!tid || !artIds.has(tid) || typeof p.meta_title !== "string" || typeof p.meta_description !== "string") continue;
      if (p.meta_title.length > 60 || p.meta_description.length < 120 || p.meta_description.length > 165) continue;
      const a = ctx.articles.find((x: any) => x.id === tid);
      current = { meta_title: a.meta_title, meta_description: a.meta_description, title: a.title };
    } else if (it.kind === "social_caption") {
      if (!tid || !draftIds.has(tid) || typeof p.caption !== "string" || p.caption.length > 2000) continue;
      current = { caption: ctx.social_drafts.find((x: any) => x.id === tid).caption };
    } else if (it.kind === "social_tone") {
      if (!TONES.includes(p.tone)) continue;
      current = { tone: ctx.social_settings.caption_tone ?? "warm" };
    } else if (it.kind === "social_hashtags") {
      if (typeof p.hashtags !== "string" || !p.hashtags.includes("#RealTrust")) continue;
      current = { hashtags: ctx.social_settings.default_hashtags ?? "" };
    }
    if (/bucure[sș]ti/i.test(JSON.stringify(p))) continue;
    const k = `${it.kind}|${tid ?? ""}`;
    if (seen.has(k) && it.kind !== "insight" && it.kind !== "blog_topic") continue;
    seen.add(k);
    rows.push({
      kind: it.kind, target_id: tid, title: it.title.slice(0, 200), rationale: String(it.rationale ?? "").slice(0, 1000),
      evidence: { text: String(it.evidence ?? "").slice(0, 500) }, current_value: current, proposed_value: p,
      confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0)),
    });
  }
  if (rows.length) await db.from("content_improvements").insert(rows);
  return { measured, created: rows.length };
}

async function apply(db: any, id: string, userId: string) {
  const { data: r } = await db.from("content_improvements").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (!r) return { ok: false, error: "Propunere negăsită sau deja decisă" };
  const p = r.proposed_value ?? {};
  let baseline: unknown = null;
  let err: string | null = null;
  if (r.kind === "blog_seo") {
    const now = new Date();
    baseline = { views_14d: await articleViews(db, r.target_id, new Date(now.getTime() - 14 * DAY), now) };
    const { error } = await db.from("blog_articles").update({ meta_title: p.meta_title, meta_description: p.meta_description }).eq("id", r.target_id);
    err = error?.message ?? null;
  } else if (r.kind === "social_tone" || r.kind === "social_hashtags") {
    const row = r.kind === "social_tone" ? { key: "caption_tone", value: p.tone } : { key: "default_hashtags", value: p.hashtags };
    const { error } = await db.from("app_settings").upsert(row, { onConflict: "key" });
    err = error?.message ?? null;
  } else if (r.kind === "social_caption") {
    const { data, error } = await db.from("social_posts").update({ caption: p.caption }).eq("id", r.target_id).eq("status", "draft").select("id");
    err = error?.message ?? (data?.length ? null : "Postarea nu mai e draft");
  }
  await db.from("content_improvements").update({
    status: err ? "failed" : "applied", error: err, baseline, decided_at: new Date().toISOString(), decided_by: userId,
  }).eq("id", id);
  return err ? { ok: false, error: err } : { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const db = sb();
  try {
    if (body?.action === "apply" || body?.action === "reject") {
      const auth = await requireAdmin(req, corsHeaders);
      if (!auth.ok) return auth.response!;
      if (typeof body.id !== "string" || !UUID.test(body.id)) return json({ error: "id invalid" }, 400);
      const uid = (auth as any).userId ?? (auth as any).user?.id ?? null;
      if (body.action === "reject") {
        await db.from("content_improvements").update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: uid })
          .eq("id", body.id).eq("status", "pending");
        return json({ ok: true });
      }
      const res = await apply(db, body.id, uid);
      return json(res, res.ok ? 200 : 400);
    }
    const gate = await requireInternalOrAdmin(req, corsHeaders);
    if (gate) return gate;
    return json({ success: true, ...(await analyze(db)) });
  } catch (e) {
    console.error("content-self-improve", e);
    return json({ success: false, error: "Eroare internă" }, 500);
  }
});
