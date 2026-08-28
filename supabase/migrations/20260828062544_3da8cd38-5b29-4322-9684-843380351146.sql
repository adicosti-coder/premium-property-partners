CREATE TABLE IF NOT EXISTS public.admin_404_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  user_agent text,
  hits integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_404_logs_path_key ON public.admin_404_logs (path);
CREATE INDEX IF NOT EXISTS admin_404_logs_last_seen_idx ON public.admin_404_logs (last_seen_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.admin_404_logs TO authenticated;
GRANT ALL ON public.admin_404_logs TO service_role;

ALTER TABLE public.admin_404_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read 404 logs" ON public.admin_404_logs;
CREATE POLICY "Admins can read 404 logs" ON public.admin_404_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete 404 logs" ON public.admin_404_logs;
CREATE POLICY "Admins can delete 404 logs" ON public.admin_404_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_404(_path text, _referrer text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text := left(coalesce(_path, ''), 500);
BEGIN
  IF p = '' OR left(p, 1) <> '/' THEN
    RETURN;
  END IF;

  INSERT INTO public.admin_404_logs (path, referrer, user_agent)
  VALUES (p, left(coalesce(_referrer, ''), 500), left(coalesce(_user_agent, ''), 300))
  ON CONFLICT (path) DO UPDATE
    SET hits = public.admin_404_logs.hits + 1,
        last_seen_at = now(),
        referrer = COALESCE(NULLIF(EXCLUDED.referrer, ''), public.admin_404_logs.referrer);
END;
$$;

REVOKE ALL ON FUNCTION public.log_404(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_404(text, text, text) TO anon, authenticated, service_role;