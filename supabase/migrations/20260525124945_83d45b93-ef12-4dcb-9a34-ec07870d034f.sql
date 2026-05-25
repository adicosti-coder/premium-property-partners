-- Trigger: notify Make.com webhook when a prospect lead enters pending_review
CREATE OR REPLACE FUNCTION public.notify_triage_lead_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  function_url text := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/notify-triage-lead';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8';
BEGIN
  -- Fire only on transition INTO pending_review
  IF NEW.lifecycle_status::text = 'pending_review'
     AND (TG_OP = 'INSERT' OR OLD.lifecycle_status::text IS DISTINCT FROM 'pending_review') THEN

    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'record', to_jsonb(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
      ),
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_triage_lead ON public.prospect_listings;

CREATE TRIGGER trg_notify_triage_lead
AFTER INSERT OR UPDATE OF lifecycle_status ON public.prospect_listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_triage_lead_webhook();