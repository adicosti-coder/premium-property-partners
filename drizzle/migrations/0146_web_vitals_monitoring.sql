CREATE TABLE public.web_vital_samples (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL CHECK (metric IN ('LCP','CLS','INP','FCP','TTFB')),
  metric_id text NOT NULL CHECK (char_length(metric_id) BETWEEN 1 AND 80),
  value double precision NOT NULL CHECK (value >= 0),
  rating text CHECK (rating IN ('good','needs-improvement','poor')),
  device text NOT NULL CHECK (device IN ('mobile','desktop')),
  page_group text NOT NULL CHECK (char_length(page_group) BETWEEN 1 AND 120),
  release text NOT NULL CHECK (char_length(release) BETWEEN 1 AND 40),
  UNIQUE (metric, metric_id)
);
GRANT SELECT ON public.web_vital_samples TO authenticated;
GRANT ALL ON public.web_vital_samples TO service_role;
ALTER TABLE public.web_vital_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read web vitals" ON public.web_vital_samples
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX web_vital_samples_created_idx ON public.web_vital_samples (created_at DESC);
CREATE INDEX web_vital_samples_release_idx ON public.web_vital_samples (release, created_at);

CREATE TABLE public.web_vital_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  alert_key text NOT NULL UNIQUE,
  metric text NOT NULL,
  device text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning','error')),
  reason text NOT NULL,
  current_p75 double precision NOT NULL,
  baseline_p75 double precision,
  current_samples integer NOT NULL,
  baseline_samples integer,
  releases text[] NOT NULL DEFAULT '{}',
  email_sent boolean NOT NULL DEFAULT false,
  whatsapp_sent boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.web_vital_alerts TO authenticated;
GRANT ALL ON public.web_vital_alerts TO service_role;
ALTER TABLE public.web_vital_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read web vital alerts" ON public.web_vital_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public, validated write path for real-visitor measurements.
CREATE OR REPLACE FUNCTION public.record_web_vital(
  p_metric text, p_metric_id text, p_value double precision, p_rating text,
  p_device text, p_page_group text, p_release text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rating text := p_rating;
  v_page text := p_page_group;
BEGIN
  IF p_metric IS NULL OR p_metric NOT IN ('LCP','CLS','INP','FCP','TTFB') THEN RETURN; END IF;
  IF p_value IS NULL OR p_value <> p_value OR p_value < 0 THEN RETURN; END IF;
  IF p_value > (CASE WHEN p_metric = 'CLS' THEN 10 ELSE 60000 END) THEN RETURN; END IF;
  IF p_device IS NULL OR p_device NOT IN ('mobile','desktop') THEN RETURN; END IF;
  IF p_metric_id IS NULL OR char_length(p_metric_id) NOT BETWEEN 1 AND 80 THEN RETURN; END IF;
  IF v_rating IS NOT NULL AND v_rating NOT IN ('good','needs-improvement','poor') THEN v_rating := NULL; END IF;
  IF v_page IS NULL OR left(v_page, 1) <> '/' THEN v_page := '/'; END IF;
  v_page := left(v_page, 120);
  -- Flood guard: the site has a few hundred visits a week.
  IF (SELECT count(*) FROM public.web_vital_samples WHERE created_at > now() - interval '1 hour') > 5000 THEN
    RETURN;
  END IF;
  INSERT INTO public.web_vital_samples (metric, metric_id, value, rating, device, page_group, release)
  VALUES (p_metric, p_metric_id, p_value, v_rating, p_device, v_page,
          left(coalesce(nullif(trim(p_release), ''), 'necunoscut'), 40))
  ON CONFLICT (metric, metric_id) DO UPDATE
    SET value = greatest(public.web_vital_samples.value, EXCLUDED.value),
        rating = CASE WHEN EXCLUDED.value > public.web_vital_samples.value
                      THEN EXCLUDED.rating ELSE public.web_vital_samples.rating END;
END;
$$;
REVOKE ALL ON FUNCTION public.record_web_vital(text, text, double precision, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_web_vital(text, text, double precision, text, text, text, text) TO anon, authenticated, service_role;

-- p75 per metric and device for a time window (used by the regression check).
CREATE OR REPLACE FUNCTION public.web_vitals_window_stats(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(metric text, device text, samples bigint, p75 double precision, good_rate double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.metric, s.device, count(*)::bigint,
         percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value),
         avg(CASE WHEN s.rating = 'good' THEN 1 ELSE 0 END)::double precision
  FROM public.web_vital_samples s
  WHERE s.created_at >= p_from AND s.created_at < p_to
  GROUP BY s.metric, s.device
$$;
REVOKE ALL ON FUNCTION public.web_vitals_window_stats(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.web_vitals_window_stats(timestamptz, timestamptz) TO service_role;

-- Admin dashboard summary.
CREATE OR REPLACE FUNCTION public.admin_web_vitals_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now timestamptz := now();
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', v_now,
    'current', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
                FROM public.web_vitals_window_stats(v_now - interval '3 days', v_now) c),
    'baseline', (SELECT coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
                 FROM public.web_vitals_window_stats(v_now - interval '17 days', v_now - interval '3 days') b),
    'releases', (
      SELECT coalesce(jsonb_agg(r ORDER BY r->>'first_seen' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'release', rel.release,
          'first_seen', rel.first_seen,
          'stats', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                       'metric', x.metric, 'device', x.device, 'samples', x.n, 'p75', x.p75)), '[]'::jsonb)
                    FROM (SELECT s.metric, s.device, count(*) AS n,
                                 percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) AS p75
                          FROM public.web_vital_samples s
                          WHERE s.release = rel.release AND s.metric IN ('LCP','CLS','INP')
                          GROUP BY s.metric, s.device) x)
        ) AS r
        FROM (SELECT release, min(created_at) AS first_seen
              FROM public.web_vital_samples
              WHERE created_at > v_now - interval '60 days'
              GROUP BY release ORDER BY min(created_at) DESC LIMIT 6) rel
      ) q
    ),
    'pages', (
      SELECT coalesce(jsonb_agg(p ORDER BY (p->>'lcp_p75')::float8 DESC NULLS LAST), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'page_group', s.page_group,
          'samples', count(*) FILTER (WHERE s.metric = 'LCP'),
          'lcp_p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) FILTER (WHERE s.metric = 'LCP'),
          'cls_p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) FILTER (WHERE s.metric = 'CLS'),
          'inp_p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) FILTER (WHERE s.metric = 'INP')
        ) AS p
        FROM public.web_vital_samples s
        WHERE s.created_at > v_now - interval '7 days' AND s.device = 'mobile'
        GROUP BY s.page_group
        HAVING count(*) FILTER (WHERE s.metric = 'LCP') >= 5
        ORDER BY count(*) DESC LIMIT 12
      ) q
    ),
    'alerts', (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
               FROM (SELECT * FROM public.web_vital_alerts ORDER BY created_at DESC LIMIT 20) a)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_web_vitals_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_web_vitals_summary() TO authenticated, service_role;

SELECT cron.unschedule('web-vitals-regression-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'web-vitals-regression-check');
SELECT cron.schedule(
  'web-vitals-regression-check',
  '15 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/web-vitals-regression-check',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_reconcile_secret()),
    body := '{}'::jsonb
  );
  $$
);