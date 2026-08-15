CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  message text,
  duration_ms integer,
  attempt integer,
  actor text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_id_created_at_idx
  ON public.lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_type_idx ON public.lead_events (event_type);

GRANT SELECT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead events"
  ON public.lead_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service role manages lead events"
  ON public.lead_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Internal logger used by triggers and edge functions
CREATE OR REPLACE FUNCTION public.log_lead_event(
  p_lead_id uuid,
  p_event_type text,
  p_status text DEFAULT 'info',
  p_message text DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_attempt integer DEFAULT NULL,
  p_actor text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.lead_events (
    lead_id, event_type, status, message, duration_ms, attempt, actor, metadata
  ) VALUES (
    p_lead_id,
    left(coalesce(p_event_type, 'unknown'), 60),
    left(coalesce(p_status, 'info'), 30),
    left(p_message, 500),
    p_duration_ms,
    p_attempt,
    left(coalesce(p_actor, 'system'), 60),
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_lead_event(uuid, text, text, text, integer, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_lead_event(uuid, text, text, text, integer, integer, text, jsonb) TO service_role;

-- Lead created event
CREATE OR REPLACE FUNCTION public.lead_events_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_lead_event(
    NEW.id,
    'lead_created',
    'success',
    coalesce('Sursă: ' || NEW.source, 'Lead nou primit'),
    NULL, NULL, 'website',
    jsonb_build_object('score', NEW.lead_score, 'grade', NEW.lead_grade, 'source', NEW.source)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_events_on_insert ON public.leads;
CREATE TRIGGER trg_lead_events_on_insert
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.lead_events_on_insert();

-- CRM sync status transitions + PDF delivery
CREATE OR REPLACE FUNCTION public.lead_events_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.crm_sync_status, '') IS DISTINCT FROM coalesce(OLD.crm_sync_status, '') THEN
    PERFORM public.log_lead_event(
      NEW.id,
      CASE WHEN coalesce(NEW.crm_sync_attempts, 0) > coalesce(OLD.crm_sync_attempts, 0)
        THEN 'crm_retry' ELSE 'crm_sync' END,
      CASE NEW.crm_sync_status
        WHEN 'synced' THEN 'success'
        WHEN 'failed' THEN 'error'
        ELSE 'info' END,
      coalesce(NEW.crm_sync_error, 'Status sincronizare: ' || coalesce(NEW.crm_sync_status, '—')),
      NULL,
      NEW.crm_sync_attempts,
      'crm-lead-sync',
      jsonb_build_object('status', NEW.crm_sync_status, 'next_retry_at', NEW.crm_next_retry_at)
    );
  END IF;

  IF NEW.report_delivered_at IS DISTINCT FROM OLD.report_delivered_at
     AND NEW.report_delivered_at IS NOT NULL THEN
    PERFORM public.log_lead_event(
      NEW.id,
      'pdf_generated',
      'success',
      'Raport PDF de randament generat și atașat lead-ului',
      NULL, NULL, 'deliver-yield-report',
      jsonb_build_object('path', NEW.report_pdf_path)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_events_on_update ON public.leads;
CREATE TRIGGER trg_lead_events_on_update
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.lead_events_on_update();