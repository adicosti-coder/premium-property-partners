
CREATE OR REPLACE FUNCTION public.reconcile_import_pipeline(_since_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff timestamptz := now() - make_interval(hours => _since_hours);
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH s AS (
    SELECT
      count(*) FILTER (WHERE category = 'vanzare') AS scraped_vanzare,
      count(*) AS scraped_total,
      count(*) FILTER (
        WHERE category = 'vanzare' AND is_active = true
          AND prospect_type = 'proprietar'
          AND (price IS NOT NULL AND price > 0)
          AND zone IS NOT NULL
          AND coalesce(lead_score,0) >= 55
          AND (do_not_call IS NULL OR do_not_call = false)
          AND (agency_suspicion_score IS NULL OR agency_suspicion_score < 85)
      ) AS validated_publishable,
      count(*) FILTER (
        WHERE category = 'vanzare' AND (
          price IS NULL OR price = 0 OR zone IS NULL OR zone = ''
        )
      ) AS rejected_by_validation,
      count(*) FILTER (WHERE rejection_reason IS NOT NULL) AS explicitly_rejected
    FROM prospect_listings
    WHERE created_at >= _cutoff
  ),
  p AS (
    SELECT count(*) AS published_count
    FROM properties
    WHERE migrated_from_prospect_id IS NOT NULL
      AND imported_at >= _cutoff
  ),
  o AS (
    SELECT count(*) AS orphan_count
    FROM prospect_listings pl
    WHERE pl.created_at >= _cutoff
      AND pl.category = 'vanzare'
      AND pl.is_active = true
      AND pl.prospect_type = 'proprietar'
      AND pl.price IS NOT NULL AND pl.price > 0
      AND pl.zone IS NOT NULL
      AND coalesce(pl.lead_score,0) >= 55
      AND (pl.do_not_call IS NULL OR pl.do_not_call = false)
      AND (pl.agency_suspicion_score IS NULL OR pl.agency_suspicion_score < 85)
      AND NOT EXISTS (SELECT 1 FROM properties pr WHERE pr.migrated_from_prospect_id = pl.id)
  ),
  w AS (
    SELECT count(*) AS worker_failures
    FROM admin_audit_log
    WHERE action = 'auto_publish_worker_failed'
      AND created_at >= _cutoff
  )
  SELECT jsonb_build_object(
    'since_hours', _since_hours,
    'scraped_total', s.scraped_total,
    'scraped_vanzare', s.scraped_vanzare,
    'validated_publishable', s.validated_publishable,
    'rejected_by_validation', s.rejected_by_validation,
    'explicitly_rejected', s.explicitly_rejected,
    'published_count', p.published_count,
    'orphan_count', o.orphan_count,
    'worker_failures', w.worker_failures,
    'conversion_rate', CASE WHEN s.validated_publishable > 0
      THEN round((p.published_count::numeric / s.validated_publishable::numeric) * 100, 1)
      ELSE 0 END
  ) INTO _result
  FROM s, p, o, w;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_import_pipeline(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_orphan_prospects(_since_hours int DEFAULT 24, _limit int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  title text,
  source_platform text,
  source_url text,
  zone text,
  price numeric,
  rooms int,
  lead_score int,
  lifecycle_status text,
  admin_notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT pl.id, pl.title, pl.source_platform, pl.source_url, pl.zone, pl.price,
         pl.rooms, pl.lead_score, pl.lifecycle_status::text, pl.admin_notes, pl.created_at
  FROM prospect_listings pl
  WHERE pl.created_at >= (now() - make_interval(hours => _since_hours))
    AND pl.category = 'vanzare'
    AND pl.is_active = true
    AND pl.prospect_type = 'proprietar'
    AND pl.price IS NOT NULL AND pl.price > 0
    AND pl.zone IS NOT NULL
    AND coalesce(pl.lead_score,0) >= 55
    AND (pl.do_not_call IS NULL OR pl.do_not_call = false)
    AND (pl.agency_suspicion_score IS NULL OR pl.agency_suspicion_score < 85)
    AND NOT EXISTS (SELECT 1 FROM properties pr WHERE pr.migrated_from_prospect_id = pl.id)
  ORDER BY pl.lead_score DESC NULLS LAST, pl.created_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_orphan_prospects(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_publish_worker_failures(_limit int DEFAULT 30)
RETURNS TABLE(
  id uuid,
  entity_id text,
  created_at timestamptz,
  details jsonb,
  severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT al.id, al.entity_id::text, al.created_at, al.details, al.severity::text
  FROM admin_audit_log al
  WHERE al.action = 'auto_publish_worker_failed'
  ORDER BY al.created_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_publish_worker_failures(int) TO authenticated;
