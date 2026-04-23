
-- Add voice configuration columns to voice_agent_settings
ALTER TABLE public.voice_agent_settings
  ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id text NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  ADD COLUMN IF NOT EXISTS elevenlabs_model_id text NOT NULL DEFAULT 'eleven_multilingual_v2',
  ADD COLUMN IF NOT EXISTS voice_stability numeric NOT NULL DEFAULT 0.55,
  ADD COLUMN IF NOT EXISTS voice_similarity_boost numeric NOT NULL DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS voice_style numeric NOT NULL DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS voice_speed numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS voice_use_speaker_boost boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email text,
  ADD COLUMN IF NOT EXISTS notify_whatsapp_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_enabled boolean NOT NULL DEFAULT true;

-- Set default email to admin
UPDATE public.voice_agent_settings SET notify_email = 'adicosti@gmail.com' WHERE id = 1 AND notify_email IS NULL;

-- Create private storage bucket for TTS cache + recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Public read for TTS cache (Twilio needs to fetch them via Play)
DROP POLICY IF EXISTS "voice tts cache public read" ON storage.objects;
CREATE POLICY "voice tts cache public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = 'tts-cache');

-- Admin full access
DROP POLICY IF EXISTS "voice recordings admin all" ON storage.objects;
CREATE POLICY "voice recordings admin all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'voice-recordings' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'voice-recordings' AND public.has_role(auth.uid(), 'admin'));

-- Service role can manage (for edge functions)
DROP POLICY IF EXISTS "voice recordings service" ON storage.objects;
CREATE POLICY "voice recordings service"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'voice-recordings')
  WITH CHECK (bucket_id = 'voice-recordings');
