CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  processed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins read stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
GRANT SELECT ON public.stripe_webhook_events TO authenticated;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received ON public.stripe_webhook_events(received_at DESC);

ALTER TABLE public.admin_email_failures
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_retry_error text,
  ADD COLUMN IF NOT EXISTS resent_at timestamptz;