-- Sincronizează vocea Voice Agent cu cea de la Digital Concierge (Andrei, ElevenLabs)
UPDATE public.voice_agent_settings
SET elevenlabs_voice_id = 'S98OhkhaxeAKHEbhoLi7',
    elevenlabs_model_id = 'eleven_turbo_v2_5',
    updated_at = now()
WHERE id = 1;

-- Schimbă și default-urile pentru viitor
ALTER TABLE public.voice_agent_settings
  ALTER COLUMN elevenlabs_voice_id SET DEFAULT 'S98OhkhaxeAKHEbhoLi7';
ALTER TABLE public.voice_agent_settings
  ALTER COLUMN elevenlabs_model_id SET DEFAULT 'eleven_turbo_v2_5';
