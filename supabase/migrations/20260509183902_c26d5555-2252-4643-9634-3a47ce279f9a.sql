UPDATE public.voice_agent_settings
SET elevenlabs_model_id = 'eleven_multilingual_v2',
    voice_stability = 0.40,
    voice_similarity_boost = 0.82,
    voice_style = 0.55,
    voice_speed = 1.00,
    voice_use_speaker_boost = true
WHERE id = 1;