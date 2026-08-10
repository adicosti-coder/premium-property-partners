CREATE TABLE IF NOT EXISTS public.tracking_alert_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  threshold_pct integer NOT NULL DEFAULT 50 CHECK (threshold_pct BETWEEN 5 AND 95),
  min_sessions integer NOT NULL DEFAULT 20 CHECK (min_sessions >= 0),
  notify_emails text[] NOT NULL DEFAULT ARRAY['contact@realtrust.ro'],
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.tracking_alert_settings TO authenticated;
GRANT ALL ON public.tracking_alert_settings TO service_role;
ALTER TABLE public.tracking_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tracking alert settings"
ON public.tracking_alert_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.tracking_alert_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tracking_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_on date NOT NULL DEFAULT current_date,
  current_day date,
  previous_day date,
  current_sessions integer NOT NULL DEFAULT 0,
  previous_sessions integer NOT NULL DEFAULT 0,
  drop_pct numeric,
  alerted boolean NOT NULL DEFAULT false,
  notified_emails text[],
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tracking_alert_log_checked_on_key ON public.tracking_alert_log (checked_on);

GRANT SELECT ON public.tracking_alert_log TO authenticated;
GRANT ALL ON public.tracking_alert_log TO service_role;
ALTER TABLE public.tracking_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read tracking alert log"
ON public.tracking_alert_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_ga4_daily_sessions(p_days integer DEFAULT 21)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := greatest(2, least(coalesce(p_days, 21), 120));
  v_result jsonb;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.day), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT period_start AS day,
           sum(sessions)::int AS sessions,
           sum(conversions)::int AS conversions
    FROM public.seo_ga4_metrics
    WHERE period_start >= current_date - v_days
    GROUP BY period_start
  ) d;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ga4_daily_sessions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ga4_daily_sessions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ga4_daily_sessions(integer) TO service_role;