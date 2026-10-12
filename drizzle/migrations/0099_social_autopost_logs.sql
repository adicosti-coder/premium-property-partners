ALTER TABLE public.social_post_drafts
  ADD COLUMN IF NOT EXISTS fb_post_id text,
  ADD COLUMN IF NOT EXISTS ig_media_id text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

CREATE TABLE public.social_autopost_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid,
  property_slug text,
  title text,
  platform text NOT NULL,
  status text NOT NULL,
  external_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_autopost_logs TO authenticated;
GRANT ALL ON public.social_autopost_logs TO service_role;
ALTER TABLE public.social_autopost_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read social autopost logs" ON public.social_autopost_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX social_autopost_logs_created_idx ON public.social_autopost_logs(created_at DESC);