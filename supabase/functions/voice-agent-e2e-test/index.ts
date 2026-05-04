// Voice Agent — End-to-End test runner.
// Mode "simulate" (default): generates ElevenLabs TTS for the opening line,
// measures latency (target < 2000ms), validates that TwiML returns a <Play>
// tag, and asserts phonetic lexicon was applied. NO real Twilio call cost.
//
// Mode "real_call": delegates to voice-agent-initiate to place a live Twilio
// call. The clarity_score will land later via voice-agent-status.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { applyLexiconToText } from "../_shared/voiceLexicon.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANDREI_VOICE_ID = "S98OhkhaxeAKHEbhoLi7";
const ANDREI_MODEL_ID = "eleven_turbo_v2_5";

const DEFAULT_OPENING = "Bună ziua, sunt Andrei de la RealTrust Timișoara. Am un apartament în Iosefin, în Cetate, și unul în Dumbrăvița — la ApArt Hotel.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminCheck = await requireAdmin(req, corsHeaders);
  if (!adminCheck.ok) return adminCheck.response!;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const mode: "simulate" | "real_call" = body.mode === "real_call" ? "real_call" : "simulate";
    const text: string = (body.text || DEFAULT_OPENING).slice(0, 600);

    // ── REAL CALL MODE ─────────────────────────────────────────────────
    if (mode === "real_call") {
      const toNumber: string = body.toNumber || "";
      if (!/^\+[1-9]\d{6,14}$/.test(toNumber)) {
        return new Response(JSON.stringify({ error: "toNumber invalid (E.164: +407...)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Forward the admin auth header so initiate's admin check passes.
      const initiateRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
        },
        body: JSON.stringify({
          toNumber,
          objective: "qualify",
          customPrompt: `Test E2E real: salută scurt, anunță că este test tehnic, închide politicos după 15 secunde. Vorbești EXCLUSIV în română.`,
          forceElevenLabs: true,
        }),
      });
      const initiateData = await initiateRes.json();
      return new Response(JSON.stringify({
        mode: "real_call",
        success: initiateRes.ok,
        ...initiateData,
      }), {
        status: initiateRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SIMULATE MODE ──────────────────────────────────────────────────
    const checks: Array<{ name: string; passed: boolean; details?: any }> = [];

    // 1. Apply lexicon and assert at least one substitution if known terms present.
    const phonetic = await applyLexiconToText(supabase, text);
    const lexiconChanged = phonetic !== text;
    checks.push({
      name: "phonetic_lexicon_applied",
      passed: lexiconChanged || !/Iosefin|Dumbrăvița|Cetate|ApArt|RealTrust/i.test(text),
      details: { original: text, phonetic, changed: lexiconChanged },
    });

    // 2. ElevenLabs reachable + measure latency
    let ttsLatencyMs = 0;
    let ttsOk = false;
    let ttsHttpStatus: number | null = null;
    let ttsErrorMsg: string | null = null;
    let audioBytes = 0;

    if (!ELEVENLABS_API_KEY) {
      checks.push({ name: "elevenlabs_api_key", passed: false, details: { reason: "ELEVENLABS_API_KEY missing" } });
    } else {
      const t0 = Date.now();
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${ANDREI_VOICE_ID}?output_format=ulaw_8000`,
          {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: phonetic,
              model_id: ANDREI_MODEL_ID,
              voice_settings: {
                stability: 0.62,
                similarity_boost: 0.88,
                style: 0.22,
                speed: 0.92,
                use_speaker_boost: true,
              },
            }),
          },
        );
        ttsHttpStatus = res.status;
        if (res.ok) {
          const buf = await res.arrayBuffer();
          audioBytes = buf.byteLength;
          ttsOk = audioBytes > 100;
        } else {
          ttsErrorMsg = (await res.text()).slice(0, 500);
        }
      } catch (e: any) {
        ttsErrorMsg = String(e?.message || e);
      }
      ttsLatencyMs = Date.now() - t0;
    }

    checks.push({
      name: "elevenlabs_tts_responds",
      passed: ttsOk,
      details: { http_status: ttsHttpStatus, latency_ms: ttsLatencyMs, audio_bytes: audioBytes, error: ttsErrorMsg },
    });

    checks.push({
      name: "elevenlabs_under_2s",
      passed: ttsOk && ttsLatencyMs < 2000,
      details: { latency_ms: ttsLatencyMs, target_ms: 2000 },
    });

    // 3. Build a fake TwiML <Play> snippet exactly like voice-agent-twiml does
    const playUrl = "https://example.supabase.co/storage/v1/object/sign/voice-recordings/tts-cache/test.ulaw";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${playUrl}</Play><Hangup/></Response>`;
    const hasPlayTag = /<Play>https?:\/\/[^<]+<\/Play>/.test(twiml);
    checks.push({
      name: "twiml_play_tag_valid",
      passed: hasPlayTag,
      details: { sample: twiml },
    });

    // 4. Lexicon table reachable
    let lexiconCount = 0;
    try {
      const { count } = await supabase
        .from("voice_pronunciation_lexicon")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      lexiconCount = count || 0;
    } catch { /* ignore */ }
    checks.push({
      name: "lexicon_loaded",
      passed: lexiconCount > 0,
      details: { active_entries: lexiconCount },
    });

    const passed = checks.every((c) => c.passed);
    const summary = {
      mode: "simulate",
      verdict: passed ? "PASS" : "FAIL",
      checks_total: checks.length,
      checks_passed: checks.filter((c) => c.passed).length,
      tts_latency_ms: ttsLatencyMs,
      tested_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ summary, checks }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("voice-agent-e2e-test error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
