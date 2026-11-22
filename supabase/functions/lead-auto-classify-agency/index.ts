import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { autoFirstMessageSkip, isAgencyProspect, NEEDS_PHONE_TAG } from "../_shared/ownerOutreachEligibility.ts";
import { checkAgencyClassification } from "../_shared/liteOutputChecks.ts";
// Lead Auto-Classify Agency — rulat de orchestrator la 20 de minute (job `lead.auto_classify_agency`).
// 1. Anunțurile fără telefon nu consumă AI: primesc eticheta „necesita-telefon”.
// 2. Până la 40 de anunțuri noi (≤ 14 zile, nefinalizate, inclusiv parcate) cu telefon și fără clasificare:
//    filtrul de cuvinte (cu „fără agenții” și „Imobiliare” din titlu excluse) marchează agențiile fără AI,
//    restul primesc scor Gemini; triggerele din baza de date setează seller_type și blocked_agency.
//    Un rezultat AI suspect nu primește scor → rămâne „de verificat” + propunere de verificare.
// 3. Cel mult 5 particulari proaspăt clasificați și eligibili sunt trimiși la `outreach-dispatch` (auto),
//    care aplică intervalul 09:00–19:30, limita de 30 de zile pe număr și dezabonările.
// dry_run: citește și clasifică, fără nicio scriere și fără trimitere.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-3.1-flash-lite";
const BATCH = 40;
const MAX_BATCH = 50;
const NEEDS_PHONE_BATCH = 500;
const MAX_DISPATCH = 5;
const CLOSED = "(expired,rejected,failed,posted)";
const KEYWORD_AGENCY_SCORE = 80;
const APPROVAL_THRESHOLD = 85;

type Listing = {
  id: string;
  title: string | null;
  description: string | null;
  contact_name: string | null;
  source_platform: string;
  source_url: string;
  tags: string[] | null;
  seller_type: string | null;
  prospect_type: string | null;
  owner_sentiment: string | null;
  agency_suspicion_score: number | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function classifyBatch(items: Listing[]): Promise<Array<{ id: string; score: number; reason: string }>> {
  const prompt = `Ești un clasificator pentru anunțuri imobiliare din Timișoara. Pentru fiecare anunț, dă un scor 0-100 care arată cât de probabil e ca ofertantul să fie AGENȚIE imobiliară (nu proprietar direct). Semnale agenție: nume firmă, "agenție", "imobiliare", "real estate", "broker", "comision", multiple anunțuri identice, telefon de contact corporate, descriere generică/template, watermark pe imagini. Răspunde DOAR JSON în formatul: {"results":[{"id":"...","score":0-100,"reason":"max 80 char"}]}.

Anunțuri:
${items.map((i) => `- id=${i.id} | platform=${i.source_platform} | name=${i.contact_name ?? "—"} | title=${(i.title ?? "").slice(0, 120)} | desc=${(i.description ?? "").slice(0, 240)}`).join("\n")}`;

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
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed?.results) ? parsed.results : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;
  const limit = Math.max(1, Math.min(MAX_BATCH, Number(body?.limit) || BATCH));

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();

  // 1. Fără număr valid → etichetă clară, fără AI și fără outreach.
  let needsPhoneTagged = 0;
  {
    const { data: noPhone, error } = await supabase.from("prospect_listings")
      .select("id, tags")
      .is("phone_normalized", null)
      .not("lifecycle_status", "in", CLOSED)
      .or(`tags.is.null,tags.not.cs.{${NEEDS_PHONE_TAG}}`)
      .limit(NEEDS_PHONE_BATCH);
    if (error) return json({ error: error.message, step: "needs_phone", dry_run: dryRun }, 500);
    for (const row of noPhone ?? []) {
      if (!dryRun) {
        const { error: upErr } = await supabase.from("prospect_listings")
          .update({ tags: Array.from(new Set([...(row.tags ?? []), NEEDS_PHONE_TAG])) }).eq("id", row.id);
        if (upErr) continue;
      }
      needsPhoneTagged++;
    }
  }

  // 2. Anunțuri noi cu telefon, neclasificate (vânzare și închiriere, inclusiv parcate).
  const { data: pending, error } = await supabase
    .from("prospect_listings")
    .select("id, title, description, contact_name, source_platform, source_url, tags, seller_type, prospect_type, owner_sentiment, agency_suspicion_score")
    .is("agency_classified_at", null)
    .not("phone_normalized", "is", null)
    .not("lifecycle_status", "in", CLOSED)
    .or("seller_type.is.null,seller_type.neq.agentie")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return json({ error: error.message, dry_run: dryRun }, 500);
  if (!pending || pending.length === 0) {
    return json({ classified: 0, message: "no_pending", needs_phone_tagged: needsPhoneTagged, dry_run: dryRun });
  }

  let classified = 0;
  let keywordAgencies = 0;
  let approvalsCreated = 0;
  let flagged = 0;
  const sample: Array<{ id: string; score: number | null; reason: string; would_blacklist: boolean }> = [];
  const now = new Date().toISOString();

  // Filtrul de cuvinte existent: agențiile evidente nu consumă AI.
  const forAi: Listing[] = [];
  for (const l of pending as Listing[]) {
    if (!isAgencyProspect(l)) { forAi.push(l); continue; }
    keywordAgencies++;
    classified++;
    if (sample.length < 10) sample.push({ id: l.id, score: KEYWORD_AGENCY_SCORE, reason: "Semne de agenție (tip contact, nume, titlu sau etichete)", would_blacklist: false });
    if (!dryRun) {
      await supabase.from("prospect_listings").update({
        agency_suspicion_score: Math.max(KEYWORD_AGENCY_SCORE, Number(l.agency_suspicion_score ?? 0)),
        agency_suspicion_reason: "Semne de agenție (tip contact, nume, titlu sau etichete)",
        agency_classified_at: now,
      }).eq("id", l.id);
    }
  }

  const touched: string[] = [];
  try {
    const results = forAi.length ? await classifyBatch(forAi) : [];
    for (const r of results) {
      const src = forAi.find((p) => p.id === r.id);
      const issues = checkAgencyClassification(src, r, APPROVAL_THRESHOLD);
      if (!src) continue;
      const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
      const reason = (r.reason ?? "").slice(0, 200);
      const suspicious = issues.length > 0;
      const wouldBlacklist = !suspicious && score >= APPROVAL_THRESHOLD;
      if (sample.length < 10) sample.push({ id: r.id, score: suspicious ? null : score, reason, would_blacklist: wouldBlacklist });

      if (suspicious) {
        flagged++;
        if (!dryRun) {
          await supabase.from("automation_approvals").insert({
            job_key: "lead.auto_classify_agency",
            action_type: "review_ai_output",
            entity_type: "prospect_listing",
            entity_id: r.id,
            severity: "warning",
            proposal: { action: "Verifică manual clasificarea AI (rezultat suspect)", score, reason, issues, listing_url: src.source_url },
            evidence: { model: MODEL, issues, classified_at: now },
          });
        }
      }

      if (!dryRun) {
        // Rezultatul suspect nu se aplică: fără scor, anunțul rămâne „de verificat”.
        const update: Record<string, unknown> = suspicious
          ? { agency_suspicion_score: null, agency_suspicion_reason: `Clasificare AI neconcludentă (${issues.join("; ")}) — verificare manuală`.slice(0, 200), agency_classified_at: now }
          : { agency_suspicion_score: score, agency_suspicion_reason: reason, agency_classified_at: now };
        if (wouldBlacklist) update.tags = Array.from(new Set([...(src.tags ?? []), "agency-suspect"]));
        const { error: upErr } = await supabase.from("prospect_listings").update(update).eq("id", r.id);
        if (!upErr && !suspicious) touched.push(r.id);
      }
      classified++;

      if (wouldBlacklist) {
        if (!dryRun) {
          await supabase.from("automation_approvals").insert({
            job_key: "lead.auto_classify_agency",
            action_type: "auto_blacklist_agency",
            entity_type: "prospect_listing",
            entity_id: r.id,
            severity: score >= 95 ? "critical" : "warning",
            proposal: {
              action: "Setează do_not_call=true și marchează ca agenție",
              score, reason,
              listing_url: src.source_url,
              contact_name: src.contact_name,
            },
            evidence: { ai_score: score, ai_reason: reason, model: MODEL, classified_at: now },
          });
        }
        approvalsCreated++;
      }
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e), classified, keyword_agencies: keywordAgencies, dry_run: dryRun }, 500);
  }

  // 3. Primul mesaj pentru particularii proaspăt confirmați (strict, în loturi mici).
  const dispatch = { sent_or_queued: 0, skipped: 0, failed: 0, eligible: 0 };
  if (!dryRun && touched.length) {
    const { data: rows } = await supabase.from("prospect_listings")
      .select("id, seller_type, lead_score, agency_suspicion_score, owner_sentiment, prospect_type, contact_name, title, tags, outreach_status, phone_normalized, contact_phone, is_active, lifecycle_status, expiry_check_status, do_not_call, auto_blacklisted_at, published_at, created_at")
      .in("id", touched);
    const ready = (rows ?? []).filter((p) => autoFirstMessageSkip(p) === null);
    dispatch.eligible = ready.length;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    for (const p of ready.slice(0, MAX_DISPATCH)) {
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, "x-webhook-secret": serviceKey },
          body: JSON.stringify({ prospect_id: p.id, auto: true }),
          signal: AbortSignal.timeout(12_000),
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out?.ok) dispatch.sent_or_queued++;
        else if (res.ok) dispatch.skipped++;
        else { dispatch.failed++; console.error(`outreach-dispatch [${res.status}]`, JSON.stringify(out).slice(0, 300)); }
      } catch (e) {
        dispatch.failed++;
        console.error("outreach-dispatch error", String(e));
      }
    }
  }

  return json({
    dry_run: dryRun,
    classified: dryRun ? 0 : classified,
    would_classify: dryRun ? classified : undefined,
    keyword_agencies: keywordAgencies,
    approvals_created: dryRun ? 0 : approvalsCreated,
    flagged_suspicious: flagged,
    would_create_approvals: dryRun ? approvalsCreated : undefined,
    needs_phone_tagged: needsPhoneTagged,
    batch_size: pending.length,
    first_messages: dispatch,
    sample,
  });
});
