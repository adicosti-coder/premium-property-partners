ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS alert_status text,
  ADD COLUMN IF NOT EXISTS alert_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_last_error text,
  ADD COLUMN IF NOT EXISTS alert_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.wa_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized text NOT NULL,
  prospect_listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'ro',
  template_params jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_outbound_queue TO authenticated;
GRANT ALL ON public.wa_outbound_queue TO service_role;

ALTER TABLE public.wa_outbound_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wa outbound queue"
  ON public.wa_outbound_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS wa_outbound_queue_pending_phone_idx
  ON public.wa_outbound_queue (phone_normalized)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS wa_outbound_queue_status_sched_idx
  ON public.wa_outbound_queue (status, priority DESC, scheduled_at);

CREATE TRIGGER wa_outbound_queue_touch
  BEFORE UPDATE ON public.wa_outbound_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
