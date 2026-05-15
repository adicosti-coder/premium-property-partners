// SEO × Andrei bridge — connects SEO opportunities to Andrei's voice agent.
// Reads top commercial-intent SEO opportunities (striking_distance, ctr_low),
// finds matching prospect_listings (by search_keywords overlap, location, or query tokens),
// and triggers voice-agent-auto-dial for those with phone + lifecycle eligible.
// Cron 06:30 daily, also callable manually from admin UI.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Romanian commercial-intent keywords for real estate (Timișoara focus)
const COMMERCIAL_TOKENS = [
  "regim hotelier", "investitie", "investiție", "randament", "roi",
  "apartament", "garsoniera", "garsonieră", "casa", "casă", "vila", "vilă",
  "vanzare", "vânzare", "vand", "vând", "de vanzare", "de vânzare",
  "inchiriere", "închiriere", "chirie", "de inchiriat", "de închiriat",
  "fara comision", "fără comision", "direct proprietar", "proprietar",
  "timisoara", "timișoara", "cetate", "iosefin", "fabric", "dumbravita", "dumbrăvița", "aradului",
  "cazare", "airbnb", "booking",
];

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length >= 3);

function isCommercialQuery(q: string): boolean {
  const n = norm(q);
  return COMMERCIAL_TOKENS.some((t) => n.includes(norm(t)));
}

function matchScore(queryTokens: string[], prospectBlob: string, prospectKeywords: string[]): { score: number; matched: string[] } {
  const blob = norm(prospectBlob);
  const kwBlob = norm((prospectKeywords || []).join(" "));
  const matched: string[] = [];
  let score = 0;
  for (const t of queryTokens) {
    if (blob.includes(t)) { score += 2; matched.push(t); }
    else if (kwBlob.includes(t)) { score += 1; matched.push(t); }
  }
  return { score, matched };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body for cron */ }
    const dryRun = body.dry_run === true;

    // ── Retry mode ─────────────────────────────────────────────────────────
    if (body.retry_bridge_id) {
      const RETRY_COOLDOWN_MIN = Math.max(5, body.cooldown_min ?? 30);
      const MAX_RETRIES = Math.max(1, body.max_retries ?? 3);
      const bridgeId: string = body.retry_bridge_id;

      // Walk to root (parent_bridge_id IS NULL) to enforce per-lineage retry budget
      const { data: target, error: tErr } = await sb
        .from("seo_andrei_bridge")
        .select("id, opportunity_id, prospect_id, query, page, matched_keywords, score_after, retry_count, last_retry_at, triggered_at, parent_bridge_id, call_session_id, status")
        .eq("id", bridgeId).maybeSingle();
      if (tErr || !target) return json({ error: "Bridge not found" }, 404);

      let rootId = target.parent_bridge_id || target.id;
      const { data: root } = await sb.from("seo_andrei_bridge")
        .select("id, retry_count, last_retry_at, triggered_at").eq("id", rootId).maybeSingle();
      const rootRow = root || target;

      // Eligibility: status failed OR call session failed/no-answer
      let sessionStatus: string | null = null;
      if (target.call_session_id) {
        const { data: s } = await sb.from("voice_call_sessions").select("status").eq("id", target.call_session_id).maybeSingle();
        sessionStatus = s?.status || null;
      }
      const isFailLike = ["failed", "no-answer", "no_answer", "noanswer", "busy", "voicemail"].includes((sessionStatus || "").toLowerCase());
      const eligible = target.status === "failed" || isFailLike;
      if (!eligible) return json({ error: `Bridge not retry-eligible (status=${target.status}, session=${sessionStatus})` }, 400);

      // Cooldown
      const lastTs = new Date(rootRow.last_retry_at || rootRow.triggered_at).getTime();
      const sinceMin = (Date.now() - lastTs) / 60000;
      if (sinceMin < RETRY_COOLDOWN_MIN) {
        return json({ error: `Cooldown activ. Mai așteaptă ${Math.ceil(RETRY_COOLDOWN_MIN - sinceMin)} min.`, cooldown_remaining_min: Math.ceil(RETRY_COOLDOWN_MIN - sinceMin) }, 429);
      }
      const currentRetries = rootRow.retry_count || 0;
      if (currentRetries >= MAX_RETRIES) {
        return json({ error: `Limită retry atinsă (${currentRetries}/${MAX_RETRIES}).` }, 400);
      }

      // Fetch prospect for current snapshot
      const { data: prospect } = await sb.from("prospect_listings")
        .select("id, title, phone_normalized, lifecycle_status, is_active").eq("id", target.prospect_id).maybeSingle();
      if (!prospect || !prospect.is_active || !prospect.phone_normalized) {
        return json({ error: "Prospect inactiv sau fără telefon" }, 400);
      }

      let dialResp: any = { skipped: "dry_run" };
      let callSessionId: string | null = null;
      let status = "queued";
      const newRetryCount = currentRetries + 1;

      if (!dryRun) {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-auto-dial`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}`, "x-webhook-secret": SERVICE_KEY },
            body: JSON.stringify({
              prospect_id: prospect.id, manual: true, source: "seo_andrei_bridge_retry",
              context_note: `RETRY #${newRetryCount} — apel SEO×Andrei pentru "${target.query}" (bridge ${rootId.slice(0, 8)})`,
            }),
          });
          dialResp = await r.json();
          callSessionId = dialResp.session_id || dialResp.sessionId || null;
          status = r.ok ? (dialResp.skipped ? "skipped" : "called") : "failed";
        } catch (e: any) {
          dialResp = { error: e?.message || "fetch failed" };
          status = "failed";
        }
      }

      // Insert new bridge row as a retry child of root
      const { data: newBridge } = await sb.from("seo_andrei_bridge").insert({
        opportunity_id: target.opportunity_id,
        prospect_id: target.prospect_id,
        query: target.query, page: target.page,
        matched_keywords: target.matched_keywords,
        match_reason: `retry #${newRetryCount} of bridge ${rootId.slice(0, 8)}`,
        score_before: target.score_after, score_after: target.score_after,
        call_session_id: callSessionId,
        auto_dial_response: dialResp,
        status,
        parent_bridge_id: rootId,
        retry_count: newRetryCount,
      }).select().maybeSingle();

      // Update root retry counters
      if (!dryRun) {
        await sb.from("seo_andrei_bridge").update({
          retry_count: newRetryCount, last_retry_at: new Date().toISOString(),
        }).eq("id", rootId);
      }

      return json({ success: true, mode: "retry", retry_count: newRetryCount, max_retries: MAX_RETRIES, status, call_session_id: callSessionId, bridge_id: newBridge?.id, dial: dialResp });
    }
    // ── End retry mode ─────────────────────────────────────────────────────

    const maxCalls: number = Math.max(1, Math.min(10, body.max_calls ?? 3));
    const minOppScore: number = body.min_opp_score ?? 50;
    const minMatchScore: number = body.min_match_score ?? 4;
    const minProspectScore: number = body.min_prospect_score ?? 60;

    // 1. Fetch top commercial SEO opportunities (open, last 14d)
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const { data: opps, error: oppsErr } = await sb
      .from("seo_opportunities")
      .select("id, type, query, page, score, potential_clicks, current_position")
      .in("type", ["striking_distance", "ctr_low"])
      .eq("status", "open")
      .gte("created_at", since)
      .gte("score", minOppScore)
      .not("query", "is", null)
      .order("score", { ascending: false })
      .limit(40);
    if (oppsErr) return json({ error: oppsErr.message }, 500);

    const commercialOpps = (opps || []).filter((o: any) => isCommercialQuery(o.query));
    if (commercialOpps.length === 0) {
      return json({ success: true, message: "No commercial-intent SEO opportunities found.", checked: opps?.length || 0, bridged: 0 });
    }

    // 2. Fetch eligible prospects (active, has phone, status new/queued, score >= threshold, not already bridged today)
    const { data: prospects, error: prErr } = await sb
      .from("prospect_listings")
      .select("id, title, description, location, search_keywords, phone_normalized, lifecycle_status, lead_score, prospect_type, is_active")
      .not("phone_normalized", "is", null)
      .in("lifecycle_status", ["new", "queued"])
      .eq("is_active", true)
      .neq("prospect_type", "agentie")
      .gte("lead_score", minProspectScore)
      .order("lead_score", { ascending: false })
      .limit(500);
    if (prErr) return json({ error: prErr.message }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const { data: alreadyBridged } = await sb
      .from("seo_andrei_bridge")
      .select("prospect_id")
      .eq("triggered_date", today);
    const bridgedSet = new Set((alreadyBridged || []).map((r: any) => r.prospect_id));

    // 3. For each opportunity, find best matching prospect; assemble bridges
    const bridges: any[] = [];
    const usedProspects = new Set<string>();
    for (const opp of commercialOpps) {
      const qTokens = tokens(opp.query).filter((t) => t.length >= 4);
      if (qTokens.length === 0) continue;
      let best: { prospect: any; score: number; matched: string[] } | null = null;
      for (const p of prospects || []) {
        if (usedProspects.has(p.id) || bridgedSet.has(p.id)) continue;
        const blob = `${p.title || ""} ${p.description || ""} ${p.location || ""}`;
        const { score, matched } = matchScore(qTokens, blob, p.search_keywords || []);
        if (score < minMatchScore) continue;
        if (!best || score > best.score) best = { prospect: p, score, matched };
      }
      if (!best) continue;
      usedProspects.add(best.prospect.id);
      bridges.push({
        opportunity: opp,
        prospect: best.prospect,
        match_score: best.score,
        matched_keywords: best.matched,
      });
      if (bridges.length >= maxCalls) break;
    }

    if (bridges.length === 0) {
      return json({ success: true, message: "No prospect matches found for commercial SEO opportunities.", commercial_opps: commercialOpps.length, eligible_prospects: prospects?.length || 0, bridged: 0 });
    }

    // 4. Trigger auto-dial for each + log into seo_andrei_bridge
    const results: any[] = [];
    for (const b of bridges) {
      const scoreBefore = b.prospect.lead_score;
      const scoreAfter = Math.max(scoreBefore, 85);

      // Boost prospect score so it surfaces in the dialer queue too
      if (!dryRun && scoreAfter > scoreBefore) {
        await sb.from("prospect_listings")
          .update({ lead_score: scoreAfter, admin_notes: `[SEO×Andrei] boost from query "${b.opportunity.query}" (+${scoreAfter - scoreBefore}pts)` })
          .eq("id", b.prospect.id);
      }

      let dialResp: any = { skipped: "dry_run" };
      let callSessionId: string | null = null;
      let status = "queued";

      if (!dryRun) {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-auto-dial`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "x-webhook-secret": SERVICE_KEY,
            },
            body: JSON.stringify({
              prospect_id: b.prospect.id,
              manual: true,
              source: "seo_andrei_bridge",
              context_note: `Apel declanșat de oportunitate SEO: "${b.opportunity.query}" (poziție ${b.opportunity.current_position}, +${b.opportunity.potential_clicks} clk potențial)`,
            }),
          });
          dialResp = await r.json();
          callSessionId = dialResp.session_id || dialResp.sessionId || null;
          status = r.ok ? (dialResp.skipped ? "skipped" : "called") : "failed";
        } catch (e: any) {
          dialResp = { error: e?.message || "fetch failed" };
          status = "failed";
        }
      }

      const { data: bridgeRow } = await sb.from("seo_andrei_bridge").insert({
        opportunity_id: b.opportunity.id,
        prospect_id: b.prospect.id,
        query: b.opportunity.query,
        page: b.opportunity.page,
        matched_keywords: b.matched_keywords,
        match_reason: `query "${b.opportunity.query}" → ${b.matched_keywords.length} kw match (score ${b.match_score})`,
        score_before: scoreBefore,
        score_after: scoreAfter,
        call_session_id: callSessionId,
        auto_dial_response: dialResp,
        status,
      }).select().maybeSingle();

      results.push({
        bridge_id: bridgeRow?.id,
        opportunity_id: b.opportunity.id,
        prospect_id: b.prospect.id,
        query: b.opportunity.query,
        match_score: b.match_score,
        matched: b.matched_keywords,
        status,
        call_session_id: callSessionId,
      });
    }

    // 5. Log into cron_run_log if available
    try {
      await sb.from("cron_run_log").insert({
        job_name: "seo-andrei-bridge",
        status: "success",
        finished_at: new Date().toISOString(),
        duration_ms: 0,
        details: { commercial_opps: commercialOpps.length, prospects_eligible: prospects?.length || 0, bridged: results.length, dry_run: dryRun },
      });
    } catch { /* table may not exist */ }

    return json({
      success: true,
      commercial_opps: commercialOpps.length,
      eligible_prospects: prospects?.length || 0,
      bridged: results.length,
      dry_run: dryRun,
      results,
    });
  } catch (e) {
    console.error("seo-andrei-bridge", e);
    return json({ error: (e as Error).message }, 500);
  }
});
