-- Admin-configurable rate limiting thresholds for guest POI reviews
CREATE TABLE IF NOT EXISTS public.poi_review_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  max_per_hour integer NOT NULL DEFAULT 3 CHECK (max_per_hour BETWEEN 1 AND 100),
  max_per_day integer NOT NULL DEFAULT 10 CHECK (max_per_day BETWEEN 1 AND 500),
  client_throttle_seconds integer NOT NULL DEFAULT 20 CHECK (client_throttle_seconds BETWEEN 0 AND 600),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.poi_review_settings TO authenticated;
GRANT ALL ON public.poi_review_settings TO service_role;
ALTER TABLE public.poi_review_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage poi review settings" ON public.poi_review_settings;
CREATE POLICY "Admins manage poi review settings"
ON public.poi_review_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.poi_review_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_poi_review_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim_hour integer := 3;
  lim_day integer := 10;
  last_hour integer;
  last_day integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT max_per_hour, max_per_day INTO lim_hour, lim_day
  FROM public.poi_review_settings WHERE id = true;

  lim_hour := COALESCE(lim_hour, 3);
  lim_day := COALESCE(lim_day, 10);

  SELECT COUNT(*) INTO last_hour
  FROM public.poi_reviews
  WHERE user_id = p_user_id AND created_at > now() - interval '1 hour';

  IF last_hour >= lim_hour THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO last_day
  FROM public.poi_reviews
  WHERE user_id = p_user_id AND created_at > now() - interval '1 day';

  RETURN last_day < lim_day;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_poi_review_throttle()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT client_throttle_seconds FROM public.poi_review_settings WHERE id = true), 20);
$$;

GRANT EXECUTE ON FUNCTION public.get_poi_review_throttle() TO anon, authenticated;