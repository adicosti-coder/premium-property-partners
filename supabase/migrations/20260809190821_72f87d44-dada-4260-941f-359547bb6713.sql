ALTER TABLE public.wa_outbound_queue
  ADD COLUMN IF NOT EXISTS wa_message_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_outbound_queue_wa_message_id
  ON public.wa_outbound_queue (wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_outbound_queue_phone_sent
  ON public.wa_outbound_queue (phone_normalized, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_outbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.wa_outbound_queue(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wa_outbound_events TO authenticated;
GRANT ALL ON public.wa_outbound_events TO service_role;

ALTER TABLE public.wa_outbound_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view outbound events"
ON public.wa_outbound_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages outbound events"
ON public.wa_outbound_events FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_outbound_events_queue
  ON public.wa_outbound_events (queue_id, created_at);

CREATE OR REPLACE FUNCTION public.log_wa_outbound_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, 'enqueued', jsonb_build_object('template', NEW.template_name, 'source', NEW.source, 'priority', NEW.priority));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, NEW.status, jsonb_build_object('attempts', NEW.attempts, 'error', NEW.last_error));
  END IF;

  IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at AND NEW.delivered_at IS NOT NULL THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, 'delivered', '{}'::jsonb);
  END IF;

  IF NEW.read_at IS DISTINCT FROM OLD.read_at AND NEW.read_at IS NOT NULL THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, 'read', '{}'::jsonb);
  END IF;

  IF NEW.replied_at IS DISTINCT FROM OLD.replied_at AND NEW.replied_at IS NOT NULL THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, 'replied', '{}'::jsonb);
  END IF;

  IF NEW.template_params IS DISTINCT FROM OLD.template_params THEN
    INSERT INTO public.wa_outbound_events (queue_id, event, detail)
    VALUES (NEW.id, 'edited', jsonb_build_object('params', NEW.template_params));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_wa_outbound_event ON public.wa_outbound_queue;
CREATE TRIGGER trg_log_wa_outbound_event
AFTER INSERT OR UPDATE ON public.wa_outbound_queue
FOR EACH ROW EXECUTE FUNCTION public.log_wa_outbound_event();