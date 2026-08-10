CREATE OR REPLACE FUNCTION public.get_conversion_attribution_report(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_prev_from timestamptz;
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_result jsonb;
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_from := now() - make_interval(days => v_days);
  v_prev_from := now() - make_interval(days => v_days * 2);

  WITH scoped AS (
    SELECT
      l.id,
      l.created_at,
      l.lead_score,
      l.lead_grade,
      l.source,
      nullif(l.simulation_data -> 'attribution' ->> 'utm_source', '') AS utm_source,
      nullif(l.simulation_data -> 'attribution' ->> 'utm_medium', '') AS utm_medium,
      nullif(l.simulation_data -> 'attribution' ->> 'utm_campaign', '') AS utm_campaign,
      nullif(l.simulation_data -> 'attribution' ->> 'gclid', '') AS gclid,
      nullif(l.simulation_data -> 'attribution' ->> 'fbclid', '') AS fbclid,
      nullif(l.simulation_data -> 'attribution' ->> 'src', '') AS outreach_src,
      nullif(l.simulation_data -> 'attribution' ->> 'cta_variant', '') AS cta_variant,
      nullif(l.simulation_data -> 'attribution' ->> 'landing_path', '') AS landing_path
    FROM public.leads l
    WHERE l.created_at >= v_from
  ),
  labelled AS (
    SELECT
      s.*,
      CASE
        WHEN s.utm_source IS NOT NULL THEN s.utm_source || coalesce(' / ' || s.utm_medium, '')
        WHEN s.gclid IS NOT NULL THEN 'google_ads (gclid)'
        WHEN s.fbclid IS NOT NULL THEN 'meta_ads (fbclid)'
        WHEN s.outreach_src IS NOT NULL THEN 'outreach: ' || s.outreach_src
        ELSE 'direct / organic'
      END AS channel
    FROM scoped s
  ),
  by_channel AS (
    SELECT
      channel,
      count(*)::int AS leads,
      (count(*) FILTER (WHERE lead_score >= 60))::int AS hot_leads,
      round(avg(lead_score)::numeric, 1) AS avg_score,
      array_remove(array_agg(DISTINCT utm_campaign), NULL) AS campaigns
    FROM labelled
    GROUP BY channel
    ORDER BY leads DESC
  ),
  by_variant AS (
    SELECT coalesce(cta_variant, 'n/a') AS variant, count(*)::int AS leads
    FROM labelled GROUP BY 1 ORDER BY 2 DESC
  ),
  by_landing AS (
    SELECT coalesce(landing_path, 'necunoscut') AS landing_path, count(*)::int AS leads
    FROM labelled GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ),
  cta AS (
    SELECT count(DISTINCT coalesce(session_id, id::text))::int AS sessions
    FROM public.cta_analytics
    WHERE created_at >= v_from
  ),
  prev AS (
    SELECT count(*)::int AS leads
    FROM public.leads
    WHERE created_at >= v_prev_from AND created_at < v_from
  )
  SELECT jsonb_build_object(
    'period_days', v_days,
    'from', v_from,
    'to', now(),
    'total_leads', (SELECT count(*)::int FROM labelled),
    'hot_leads', (SELECT (count(*) FILTER (WHERE lead_score >= 60))::int FROM labelled),
    'avg_score', (SELECT round(avg(lead_score)::numeric, 1) FROM labelled),
    'previous_period_leads', (SELECT leads FROM prev),
    'cta_sessions', (SELECT sessions FROM cta),
    'conversion_rate', CASE
      WHEN (SELECT sessions FROM cta) > 0
        THEN round(((SELECT count(*) FROM labelled)::numeric / (SELECT sessions FROM cta)) * 100, 2)
      ELSE NULL END,
    'by_channel', coalesce((SELECT jsonb_agg(to_jsonb(b)) FROM by_channel b), '[]'::jsonb),
    'by_cta_variant', coalesce((SELECT jsonb_agg(to_jsonb(v)) FROM by_variant v), '[]'::jsonb),
    'by_landing_path', coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM by_landing p), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversion_attribution_report(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversion_attribution_report(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversion_attribution_report(integer) TO service_role;