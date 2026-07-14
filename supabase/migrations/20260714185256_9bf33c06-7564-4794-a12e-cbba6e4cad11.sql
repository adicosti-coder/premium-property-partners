
CREATE TABLE public.auto_publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  articles_published INTEGER NOT NULL DEFAULT 0,
  published_slugs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  indexnow_request_id BIGINT,
  indexnow_status TEXT NOT NULL DEFAULT 'skipped', -- 'sent' | 'skipped' | 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auto_publish_logs TO authenticated;
GRANT ALL ON public.auto_publish_logs TO service_role;

ALTER TABLE public.auto_publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read auto_publish_logs"
  ON public.auto_publish_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX auto_publish_logs_ran_at_idx
  ON public.auto_publish_logs (ran_at DESC);
