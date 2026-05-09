UPDATE public.voice_agent_settings
SET autopilot_enabled = false
WHERE id = 1;

INSERT INTO public.voice_agent_safety_state (id, calls_paused, paused_reason)
VALUES (true, true, 'Investigație: 0 conversații reale din 97 apeluri (toate <30s). Pauză manuală cerută de admin.')
ON CONFLICT (id) DO UPDATE
SET calls_paused = true,
    paused_reason = EXCLUDED.paused_reason;