// Lead Auto-Classify Agency
// Picks up to 25 unscored prospect_listings (created in last 14 days), runs Gemini batch
// classification, writes agency_suspicion_score (0-100) + reason. If score >= 85, creates a
// pending automation_approval (admin must confirm auto-blacklist).
// Supports dry_run: when true, runs full read+AI pipeline but skips ALL writes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";
const BATCH = 25;
const APPROVAL_THRESHOLD = 85;

type Listing = {
  id: string;
  title: string | null;
  description: string | null;
  contact_name: string | null;
  source_platform: string;
  source_url: string;
};

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

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const { data: pending, error } = await supabase
    .from("prospect_listings")
    .select("id, title, description, contact_name, source_platform, source_url")
    .is("agency_suspicion_score", null)
    .eq("is_active", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message, dry_run: dryRun }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ classified: 0, message: "no_pending", dry_run: dryRun }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let classified = 0;
  let approvalsCreated = 0;
  const sample: Array<{ id: string; score: number; reason: string; would_blacklist: boolean }> = [];

  try {
    const results = await classifyBatch(pending as Listing[]);
    const now = new Date().toISOString();

    for (const r of results) {
      const score = Math.max(0, Math.min(100, Math.round(r.score ?? 0)));
      const reason = (r.reason ?? "").slice(0, 200);
      const tag = score >= APPROVAL_THRESHOLD ? "agency-suspect" : null;
      const wouldBlacklist = score >= APPROVAL_THRESHOLD;

      if (sample.length < 10) sample.push({ id: r.id, score, reason, would_blacklist: wouldBlacklist });

      if (!dryRun) {
        const update: Record<string, unknown> = {
          agency_suspicion_score: score,
          agency_suspicion_reason: reason,
          agency_classified_at: now,
        };
        if (tag) {
          const { data: existing } = await supabase
            .from("prospect_listings").select("tags").eq("id", r.id).maybeSingle();
          const tags = new Set([...(existing?.tags ?? []), tag]);
          update.tags = Array.from(tags);
        }
        await supabase.from("prospect_listings").update(update).eq("id", r.id);
      }
      classified++;

      if (wouldBlacklist) {
        if (!dryRun) {
          const listing = pending.find((p) => p.id === r.id);
          await supabase.from("automation_approvals").insert({
            job_key: "lead.auto_classify_agency",
            action_type: "auto_blacklist_agency",
            entity_type: "prospect_listing",
            entity_id: r.id,
            severity: score >= 95 ? "critical" : "warning",
            proposal: {
              action: "Setează do_not_call=true și marchează ca agenție",
              score, reason,
              listing_url: listing?.source_url,
              contact_name: listing?.contact_name,
            },
            evidence: { ai_score: score, ai_reason: reason, model: MODEL, classified_at: now },
          });
        }
        approvalsCreated++;
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
      classified, dry_run: dryRun,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({
    dry_run: dryRun,
    classified: dryRun ? 0 : classified,
    would_classify: dryRun ? classified : undefined,
    approvals_created: dryRun ? 0 : approvalsCreated,
    would_create_approvals: dryRun ? approvalsCreated : undefined,
    batch_size: pending.length,
    sample,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
