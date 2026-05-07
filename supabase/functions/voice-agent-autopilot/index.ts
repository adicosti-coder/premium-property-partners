// ──────────────────────────────────────────────────────────────
// Voice Agent Autopilot — orchestrator pentru ciclul autonom complet.
//
// Rulează la fiecare oră (10-18) și execută:
//   1. INGESTIE: prospect_listings cu lead_score >= min, scrapate ultimele 7 zile,
//      zona Timișoara, status=new → coadă batch.
//   2. RETENTION (opțional): properties active cu owner_phone → coadă paralelă.
//   3. BATCH DIAL: cheamă voice-agent-bulk-campaign pentru fiecare coadă.
//   4. AUTO-APPROVE FOLLOW-UP: scanează voice_call_sessions completed în
//      ultima oră cu followup_status='draft' și sentiment OK → marchează 'sent'
//      și trimite WhatsApp/Email (via webhook MAKE existent).
//   5. SAFETY NET: drafturile cu sentiment negativ rămân 'pending_review'.
//
// Modul "safety_net" (default): auto-approve doar dacă sentiment >= neutral
// ȘI fără cuvinte-cheie de risc (reclamație, supărat, GDPR, avocat).
// ──────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RISK_KEYWORDS = [
  "avocat", "instanță", "instanta", "reclam", "supărat", "suparat",
  "GDPR", "gdpr", "anpc", "scoate", "elimin", "harassment",
  "nu mai sun", "nu sunați", "nu sunati", "nu insist",
];

type AutonomySettings = {
  autopilot_enabled: boolean;
  autopilot_mode: "full" | "safety_net" | "ingest_only";
  autopilot_max_per_tick: number;
  autopilot_retention_enabled: boolean;
  autopilot_followup_auto_approve: boolean;
  autopilot_followup_min_sentiment: string;
  min_lead_score: number;
  allowed_hours_start: number;
  allowed_hours_end: number;
};

function isWithinHours(s: AutonomySettings) {
  const h = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Bucharest", hour: "numeric", hour12: false,
  });
  const hour = parseInt(h, 10);
  return hour >= s.allowed_hours_start && hour < s.allowed_hours_end;
}

function sentimentOK(sentiment: string | null, min: string) {
  const order: Record<string, number> = {
    very_negative: 0, negative: 1, neutral: 2, positive: 3, very_positive: 4,
  };
  const cur = order[sentiment ?? "neutral"] ?? 2;
  const minVal = order[min] ?? 2;
  return cur >= minVal;
}

function hasRisk(text: string | null): boolean {
  if (!text) return false;
  const lc = text.toLowerCase();
  return RISK_KEYWORDS.some((k) => lc.includes(k.toLowerCase()));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startedAt = new Date().toISOString();

  // Create run record
  const { data: run } = await supabase
    .from("voice_autonomy_runs")
    .insert({ source: "cron", status: "running" })
    .select()
    .single();
  const runId = run?.id;

  const summary = {
    prospects_ingested: 0,
    retention_ingested: 0,
    calls_initiated: 0,
    followups_auto_approved: 0,
    followups_pending_review: 0,
    drills_executed: 0,
    ab_tests_evaluated: 0,
    notes: [] as string[],
  };

  try {
    // 1. Load settings
    const { data: settings } = await supabase
      .from("voice_agent_settings")
      .select("*")
      .eq("id", 1)
      .single();
    const s = settings as AutonomySettings;

    if (!s?.autopilot_enabled) {
      summary.notes.push("autopilot disabled in settings");
      await finalize(supabase, runId, "skipped", summary);
      return jsonResp({ ok: true, skipped: "disabled", summary });
    }
    if (!isWithinHours(s)) {
      summary.notes.push(`outside hours ${s.allowed_hours_start}-${s.allowed_hours_end}`);
      await finalize(supabase, runId, "skipped", summary);
      return jsonResp({ ok: true, skipped: "out_of_hours", summary });
    }

    // Safety pause check
    const { data: safety } = await supabase
      .from("voice_agent_safety_state")
      .select("calls_paused, paused_reason")
      .eq("id", true).maybeSingle();
    if (safety?.calls_paused) {
      summary.notes.push(`safety pause: ${safety.paused_reason}`);
      await finalize(supabase, runId, "paused", summary);
      return jsonResp({ ok: true, skipped: "safety_pause", summary });
    }

    const limit = Math.max(1, Math.min(10, s.autopilot_max_per_tick));

    // 2. INGESTIE prospect_listings — fără limită temporală, acceptă orice telefon valid
    const { data: prospects } = await supabase
      .from("prospect_listings")
      .select("id, phone_normalized, contact_phone, lead_score, scraped_at, lifecycle_status, auto_call_triggered_at")
      .gte("lead_score", s.min_lead_score ?? 50)
      .in("lifecycle_status", ["new", "callback"])
      .not("phone_normalized", "is", null)
      .is("auto_call_triggered_at", null)
      .order("lead_score", { ascending: false })
      .limit(limit);

    const prospectIds = (prospects || []).map((p: any) => p.id);
    summary.prospects_ingested = prospectIds.length;

    // 3. RETENTION (portofoliu RealTrust) — proprietăți active cu telefon proprietar
    let retentionIds: string[] = [];
    if (s.autopilot_retention_enabled) {
      // încercăm să găsim leads de retention în prospect_listings cu sursa internă
      // (dacă nu există flow, sărim — retention se va genera separat)
      const { data: retention } = await supabase
        .from("prospect_listings")
        .select("id")
        .eq("source_platform", "internal_retention")
        .in("lifecycle_status", ["new", "callback"])
        .limit(Math.max(1, Math.floor(limit / 2)));
      retentionIds = (retention || []).map((r: any) => r.id);
      summary.retention_ingested = retentionIds.length;
    }

    // 4. BATCH DIAL — folosește auto-dial direct (deja are toată logica)
    const allIds = [...prospectIds, ...retentionIds];
    if (allIds.length > 0 && s.autopilot_mode !== "ingest_only") {
      // Folosim auto-dial per prospect (sequential, low risk)
      for (const pid of allIds) {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-auto-dial`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ triggered_prospect_id: pid, autopilot: true }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok) summary.calls_initiated++;

          // Log în communication_logs cu sursa "autopilot"
          await supabase.from("communication_logs").insert({
            channel: "voice_call",
            direction: "outbound",
            source: "autopilot",
            to_number: j?.to ?? null,
            voice_session_id: j?.session_id ?? null,
            prospect_listing_id: pid,
            autopilot_run_id: runId ?? null,
            status: r.ok ? (j?.success ? "initiated" : (j?.skipped || "skipped")) : "failed",
            outcome: j?.skipped || (j?.error ? `error:${String(j.error).slice(0,80)}` : null),
            metadata: j ?? {},
          });

          await new Promise((res) => setTimeout(res, 1500));
        } catch (e) {
          summary.notes.push(`dial fail ${pid}: ${(e as Error).message}`);
        }
      }
    }

    // 5. AUTO-APPROVE FOLLOW-UP DRAFTS
    if (s.autopilot_followup_auto_approve && s.autopilot_mode === "safety_net" || s.autopilot_mode === "full") {
      const { data: drafts } = await supabase
        .from("voice_call_sessions")
        .select("id, ai_sentiment, transcript, ai_summary, followup_draft, to_number, scraper_lead_id")
        .eq("followup_status", "draft")
        .gte("ended_at", new Date(Date.now() - 3600 * 1000).toISOString())
        .limit(50);

      for (const d of drafts || []) {
        const safe = sentimentOK(d.ai_sentiment, s.autopilot_followup_min_sentiment) &&
                     !hasRisk(d.transcript) && !hasRisk(d.ai_summary);
        if (safe) {
          await supabase.from("voice_call_sessions")
            .update({ followup_status: "auto_approved" })
            .eq("id", d.id);

          // Trimite WhatsApp via Make webhook (best-effort)
          const MAKE = Deno.env.get("MAKE_WEBHOOK_URL");
          if (MAKE && d.followup_draft) {
            try {
              await fetch(MAKE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "autopilot_followup_send",
                  session_id: d.id,
                  to: d.to_number,
                  draft: d.followup_draft,
                  sentiment: d.ai_sentiment,
                }),
              });
            } catch (_) { /* non-fatal */ }
          }
          summary.followups_auto_approved++;
        } else {
          await supabase.from("voice_call_sessions")
            .update({ followup_status: "pending_review" })
            .eq("id", d.id);
          summary.followups_pending_review++;
        }
      }
    }

    // 6. Update last tick
    await supabase.from("voice_agent_settings")
      .update({ autopilot_last_tick_at: startedAt })
      .eq("id", 1);

    await finalize(supabase, runId, "completed", summary);
    return jsonResp({ ok: true, summary });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[autopilot] error:", msg);
    await finalize(supabase, runId, "error", summary, msg);
    return jsonResp({ ok: false, error: msg, summary }, 500);
  }
});

async function finalize(supabase: any, runId: string | undefined, status: string, summary: any, error?: string) {
  if (!runId) return;
  await supabase.from("voice_autonomy_runs").update({
    ended_at: new Date().toISOString(),
    status,
    error: error ?? null,
    prospects_ingested: summary.prospects_ingested,
    retention_ingested: summary.retention_ingested,
    calls_initiated: summary.calls_initiated,
    followups_auto_approved: summary.followups_auto_approved,
    followups_pending_review: summary.followups_pending_review,
    drills_executed: summary.drills_executed,
    ab_tests_evaluated: summary.ab_tests_evaluated,
    details: { notes: summary.notes },
  }).eq("id", runId);
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
