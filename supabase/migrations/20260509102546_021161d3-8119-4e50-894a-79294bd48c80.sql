
UPDATE public.voice_call_sessions
SET status = 'completed', updated_at = now(),
    error_message = COALESCE(error_message, 'auto-reset: status intermediar blocat (>2 zile, ended_at prezent)')
WHERE status IN ('in-progress','in_progress','initiated','initiating','ringing','completing')
  AND ended_at IS NOT NULL
  AND ended_at < now() - interval '15 minutes';

UPDATE public.voice_call_sessions
SET status = 'canceled', ended_at = COALESCE(ended_at, now()), updated_at = now(),
    error_message = COALESCE(error_message, 'auto-reset: queued blocat fără pornire')
WHERE status IN ('queued','initiating','initiated')
  AND ended_at IS NULL
  AND COALESCE(updated_at, started_at) < now() - interval '1 hour';
