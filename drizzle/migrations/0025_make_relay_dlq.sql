-- Dead-letter queue for Make.com relay events. Until now a rejected webhook
-- ("Queue is full") was only logged, so the downstream automation was lost.
CREATE TABLE public.make_relay_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  last_status integer,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX make_relay_dlq_due_idx
  ON public.make_relay_dlq (next_attempt_at)
  WHERE status = 'pending';

GRANT SELECT ON public.make_relay_dlq TO authenticated;
GRANT ALL ON public.make_relay_dlq TO service_role;

ALTER TABLE public.make_relay_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read make relay dlq"
  ON public.make_relay_dlq
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));