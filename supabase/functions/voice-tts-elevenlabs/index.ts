import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   ElevenLabs TTS for Voice Agent
   - Generates MP3 from text using ElevenLabs (Sarah voice by default)
   - Caches MP3 in storage bucket `voice-recordings/tts-cache/`
   - Returns public URL that Twilio <Play> can fetch
   - Supports preview mode (returns base64 audio inline)
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}?output_format=mp3_22050_32`,
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
        stability: typeof voice.stability === "number" ? voice.stability : 0.55,
        similarity_boost: typeof voice.similarity_boost === "number" ? voice.similarity_boost : 0.80,
        style: typeof voice.style === "number" ? voice.style : 0.40,
        speed: typeof voice.speed === "number" ? voice.speed : 1.0,
        use_speaker_boost: voice.use_speaker_boost !== false,
      };
    } else {
      const { data: settings } = await supabase
        .from("voice_agent_settings")
        .select("elevenlabs_voice_id, elevenlabs_model_id, voice_stability, voice_similarity_boost, voice_style, voice_speed, voice_use_speaker_boost")
        .eq("id", 1)
        .maybeSingle();
      voiceSettings = {
        voice_id: settings?.elevenlabs_voice_id || "S98OhkhaxeAKHEbhoLi7",
        model_id: settings?.elevenlabs_model_id || "eleven_multilingual_v2",
        stability: Number(settings?.voice_stability) || 0.55,
        similarity_boost: Number(settings?.voice_similarity_boost) || 0.80,
        style: Number(settings?.voice_style) || 0.40,
        speed: Number(settings?.voice_speed) || 1.0,
        use_speaker_boost: settings?.voice_use_speaker_boost !== false,
      };
    }

    // PREVIEW MODE: return base64 audio directly (don't cache)
    if (mode === "preview") {
      const audioBuffer = await generateMp3(text, voiceSettings, ELEVENLABS_API_KEY);
      const { encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
      const base64 = encode(new Uint8Array(audioBuffer));
      return new Response(JSON.stringify({ audioContent: base64, mime: "audio/mpeg" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CACHE MODE: hash text + settings → check storage → generate if missing
    const cacheKey = await sha256(JSON.stringify({ text, ...voiceSettings }));
    const filePath = `tts-cache/${cacheKey}.mp3`;

    // Check if already cached
    const { data: existing } = await supabase.storage
      .from("voice-recordings")
      .list("tts-cache", { search: `${cacheKey}.mp3`, limit: 1 });

    if (existing && existing.length > 0) {
      const signedUrl = await getSignedStorageUrl(supabase, filePath);
      return new Response(JSON.stringify({ url: signedUrl, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate fresh
    const audioBuffer = await generateMp3(text, voiceSettings, ELEVENLABS_API_KEY);

    const { error: upErr } = await supabase.storage
      .from("voice-recordings")
      .upload(filePath, new Uint8Array(audioBuffer), {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

    const signedUrl = await getSignedStorageUrl(supabase, filePath);
    return new Response(JSON.stringify({ url: signedUrl, cached: false }), {
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
