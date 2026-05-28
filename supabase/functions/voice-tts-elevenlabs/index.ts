import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { applyLexiconToText } from "../_shared/voiceLexicon.ts";
import { humanizeForTTS } from "../_shared/voiceProsody.ts";

/* ──────────────────────────────────────────────────────────────
   ElevenLabs TTS for Voice Agent
   - Generates MP3 from text using ElevenLabs Andrei voice by default
   - Caches MP3 in storage bucket `voice-recordings/tts-cache/`
   - Returns public URL that Twilio <Play> can fetch
   - Supports preview mode (returns base64 audio inline)
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANDREI_VOICE_ID = "S98OhkhaxeAKHEbhoLi7";
// flash_v2_5 → ~50% lower latency vs turbo, identical quality for short RO replies
const ANDREI_MODEL_ID = "eleven_flash_v2_5";

// ── Circuit breaker for ElevenLabs ─────────────────────────────
// In-memory module state (per edge isolate). When ElevenLabs is slow or fails,
// we trip the breaker for FALLBACK_WINDOW_MS and reroute to OpenAI TTS.
// 2500ms aligns with realistic flash_v2_5 end-to-end latency for typical
// 1-3 sentence Twilio replies (incl. network + storage upload). Anything
// over this is genuinely degraded.
const LATENCY_THRESHOLD_MS = 2500;
const FALLBACK_WINDOW_MS = 60_000;
let breakerOpenUntil = 0;
const tripBreaker = (reason: string) => {
  breakerOpenUntil = Date.now() + FALLBACK_WINDOW_MS;
  console.warn(`[voice-tts] circuit breaker tripped (${reason}) for ${FALLBACK_WINDOW_MS}ms`);
};
const isBreakerOpen = () => Date.now() < breakerOpenUntil;


async function generateOpenAITTS(text: string, apiKey: string): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", voice: "onyx", input: text, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}


async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignedStorageUrl(supabase: any, filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("voice-recordings")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message || "missing signed URL"}`);
  }

  return data.signedUrl;
}

interface VoiceSettings {
  voice_id: string;
  model_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

async function generateMp3(text: string, v: VoiceSettings, apiKey: string): Promise<ArrayBuffer> {
  // optimize_streaming_latency=4 → maximum latency optimization (works on
  // non-stream endpoint too). Reduces TTFB ~30-40% for flash_v2_5.
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}?output_format=mp3_22050_32&optimize_streaming_latency=4`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: v.model_id,
        voice_settings: {
          stability: v.stability,
          similarity_boost: v.similarity_boost,
          style: v.style,
          use_speaker_boost: v.use_speaker_boost,
          speed: v.speed,
        },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }
  return res.arrayBuffer();
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice, mode } = await req.json();

    if (!text || typeof text !== "string" || text.length < 1 || text.length > 4000) {
      return new Response(JSON.stringify({ error: "Invalid text (1-4000 chars required)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load saved voice settings if not provided
    let voiceSettings: VoiceSettings;
    if (voice && voice.voice_id) {
      voiceSettings = {
        voice_id: voice.voice_id,
        model_id: voice.model_id || "eleven_multilingual_v2",
        stability: typeof voice.stability === "number" ? voice.stability : 0.48,
        similarity_boost: typeof voice.similarity_boost === "number" ? voice.similarity_boost : 0.88,
        style: typeof voice.style === "number" ? voice.style : 0.35,
        speed: typeof voice.speed === "number" ? voice.speed : 1.05,
        use_speaker_boost: voice.use_speaker_boost !== false,
      };
    } else {
      const { data: settings } = await supabase
        .from("voice_agent_settings")
        .select("elevenlabs_voice_id, elevenlabs_model_id, voice_stability, voice_similarity_boost, voice_style, voice_speed, voice_use_speaker_boost")
        .eq("id", 1)
        .maybeSingle();
      voiceSettings = {
        voice_id: settings?.elevenlabs_voice_id || ANDREI_VOICE_ID,
        model_id: settings?.elevenlabs_model_id || ANDREI_MODEL_ID,
        stability: settings?.voice_stability != null ? Number(settings.voice_stability) : 0.48,
        similarity_boost: settings?.voice_similarity_boost != null ? Number(settings.voice_similarity_boost) : 0.88,
        style: settings?.voice_style != null ? Number(settings.voice_style) : 0.35,
        speed: settings?.voice_speed != null ? Number(settings.voice_speed) : 1.05,
        use_speaker_boost: settings?.voice_use_speaker_boost !== false,
      };
    }

    // Humanize prosody (expand abbreviations, add natural pauses) THEN apply
    // phonetic lexicon — order matters so "RealTrust" still maps cleanly.
    const humanized = humanizeForTTS(text);
    const phoneticText = await applyLexiconToText(supabase, humanized);

    // Best-effort: log TTS failures so the admin Debug Live panel sees them.
    const tryLogTtsError = async (err: any, status?: number) => {
      try {
        await supabase.from("voice_agent_tts_errors").insert({
          source: "elevenlabs",
          error_type: status ? "elevenlabs_http_error" : "exception",
          http_status: status ?? null,
          message: String(err?.message || err).slice(0, 1000),
          text_snippet: phoneticText.slice(0, 300),
          voice_id: voiceSettings.voice_id,
        });
      } catch { /* non-fatal */ }
    };

    // Helper: try ElevenLabs first (unless breaker open); on slow/fail, switch to OpenAI TTS.
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const generateWithFallback = async (): Promise<{ buf: ArrayBuffer; provider: string; latency_ms: number; fallback_used: boolean }> => {
      const startedAt = Date.now();
      // Breaker open → skip ElevenLabs entirely
      if (isBreakerOpen() && OPENAI_API_KEY) {
        const buf = await generateOpenAITTS(phoneticText, OPENAI_API_KEY);
        return { buf, provider: "openai", latency_ms: Date.now() - startedAt, fallback_used: true };
      }
      try {
        const buf = await generateMp3(phoneticText, voiceSettings, ELEVENLABS_API_KEY);
        const latency_ms = Date.now() - startedAt;
        if (latency_ms > LATENCY_THRESHOLD_MS) {
          tripBreaker(`latency ${latency_ms}ms > ${LATENCY_THRESHOLD_MS}ms`);
          await tryLogTtsError({ message: `slow_response_${latency_ms}ms` });
        }
        return { buf, provider: "elevenlabs", latency_ms, fallback_used: false };
      } catch (e: any) {
        await tryLogTtsError(e);
        tripBreaker(`error: ${e?.message?.slice(0, 80)}`);
        if (OPENAI_API_KEY) {
          const buf = await generateOpenAITTS(phoneticText, OPENAI_API_KEY);
          return { buf, provider: "openai", latency_ms: Date.now() - startedAt, fallback_used: true };
        }
        throw e;
      }
    };

    // PREVIEW MODE: return base64 audio directly (don't cache)
    if (mode === "preview") {
      const { buf, provider, latency_ms, fallback_used } = await generateWithFallback();
      const { encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
      const base64 = encode(new Uint8Array(buf));
      return new Response(JSON.stringify({
        audioContent: base64, mime: "audio/mpeg",
        provider, latency_ms, fallback_used,
        // Client may fall back to Web Speech API when no server provider is available.
        web_speech_fallback: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CACHE MODE: hash text + settings → check storage → generate if missing
    const cacheKey = await sha256(JSON.stringify({ text: phoneticText, ...voiceSettings }));
    const filePath = `tts-cache/${cacheKey}.mp3`;

    // Check if already cached
    const { data: existing } = await supabase.storage
      .from("voice-recordings")
      .list("tts-cache", { search: `${cacheKey}.mp3`, limit: 1 });

    if (existing && existing.length > 0) {
      const signedUrl = await getSignedStorageUrl(supabase, filePath);
      return new Response(JSON.stringify({ url: signedUrl, cached: true, provider: "cache", fallback_used: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate fresh (with fallback)
    const { buf: audioBuffer, provider, latency_ms, fallback_used } = await generateWithFallback();


    const { error: upErr } = await supabase.storage
      .from("voice-recordings")
      .upload(filePath, new Uint8Array(audioBuffer), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

    const signedUrl = await getSignedStorageUrl(supabase, filePath);
    return new Response(JSON.stringify({ url: signedUrl, cached: false, provider, latency_ms, fallback_used }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("voice-tts-elevenlabs error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
