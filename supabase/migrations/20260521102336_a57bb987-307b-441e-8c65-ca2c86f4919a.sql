-- Curățare loguri vechi de eroare "Invalid token" (bug deja remediat în autopilot)
DELETE FROM public.communication_logs
WHERE source = 'autopilot'
  AND outcome = 'error:Invalid token'
  AND created_at < now() - interval '2 days';

-- Curățare sesiuni vechi de Twilio cu eroarea "respins lista de evenimente" (fix deja aplicat)
UPDATE public.voice_call_sessions
SET error_message = NULL
WHERE status = 'failed'
  AND error_message ILIKE 'Twilio a respins lista%'
  AND created_at < now() - interval '2 days';