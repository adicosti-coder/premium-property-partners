-- Daily trend of prospect injection rejections over last N days
CREATE OR REPLACE FUNCTION public.get_prospect_injection_rejection_trend(p_days integer DEFAULT 7)
RETURNS TABLE (
  day_label text,
  rejection_reason text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      current_date - (p_days - 1),
      current_date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    to_char(ds.day, 'DD Mon') AS day_label,
    coalesce(pl.rejection_reason, 'unknown')::text AS rejection_reason,
    count(pl.id)::bigint AS count
  FROM date_series ds
  LEFT JOIN public.prospect_listings pl
    ON pl.rejection_reason IS NOT NULL
    AND pl.created_at::date = ds.day
  GROUP BY ds.day, pl.rejection_reason
  ORDER BY ds.day ASC, count DESC;
$$;

COMMENT ON FUNCTION public.get_prospect_injection_rejection_trend IS 'Returns daily rejection counts by reason for trend visualization in admin dashboard';

-- Also create a simpler summary per-day for total rejections
CREATE OR REPLACE FUNCTION public.get_prospect_injection_daily_summary(p_days integer DEFAULT 7)
RETURNS TABLE (
  day_label text,
  total_rejected bigint,
  unique_platforms bigint,
  top_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      current_date - (p_days - 1),
      current_date,
      interval '1 day'
    )::date AS day
  ),
  daily_stats AS (
    SELECT
      pl.created_at::date AS day,
      count(*)::bigint AS total_rejected,
      count(DISTINCT pl.source_platform)::bigint AS unique_platforms,
      mode() WITHIN GROUP (ORDER BY pl.rejection_reason) AS top_reason
    FROM public.prospect_listings pl
    WHERE pl.rejection_reason IS NOT NULL
      AND pl.created_at::date >= current_date - (p_days - 1)
    GROUP BY pl.created_at::date
  )
  SELECT
    to_char(ds.day, 'DD Mon') AS day_label,
    COALESCE(ds_stats.total_rejected, 0)::bigint AS total_rejected,
    COALESCE(ds_stats.unique_platforms, 0)::bigint AS unique_platforms,
    COALESCE(ds_stats.top_reason, '—')::text AS top_reason
  FROM date_series ds
  LEFT JOIN daily_stats ds_stats ON ds_stats.day = ds.day
  ORDER BY ds.day ASC;
$$;

COMMENT ON FUNCTION public.get_prospect_injection_daily_summary IS 'Daily summary of injection rejections for trend line chart';

-- Grant execute to authenticated (admin RPC)
GRANT EXECUTE ON FUNCTION public.get_prospect_injection_rejection_trend(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_prospect_injection_daily_summary(integer) TO authenticated, anon;
