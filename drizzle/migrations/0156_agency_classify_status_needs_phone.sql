CREATE OR REPLACE FUNCTION public.admin_agency_classify_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  r record;
  v_since timestamptz := now() - interval '14 days';
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT p.*,
      COALESCE(p.lifecycle_status::text, '') NOT IN ('expired', 'rejected', 'failed', 'posted') AS open_row,
      (p.seller_type = 'privat' AND COALESCE(p.lead_score, 0) > 60
        AND COALESCE(p.phone_normalized, '') ~ '^\+407[0-9]{8}$'
        AND NOT public.prospect_is_agency(p)
        AND COALESCE(p.outreach_status, '') <> 'blocked_agency') AS eligible
    FROM public.prospect_listings p
  )
  SELECT jsonb_build_object(
    'pending_with_phone', count(*) FILTER (WHERE agency_classified_at IS NULL AND open_row AND phone_normalized IS NOT NULL
                                             AND created_at >= v_since AND COALESCE(seller_type, '') <> 'agentie'),
    'pending_total', count(*) FILTER (WHERE agency_classified_at IS NULL AND open_row),
    'needs_phone', count(*) FILTER (WHERE open_row AND phone_normalized IS NULL),
    'eligible', count(*) FILTER (WHERE eligible),
    'eligible_sale', count(*) FILTER (WHERE eligible AND category::text = 'vanzare'),
    'eligible_rent', count(*) FILTER (WHERE eligible AND category::text <> 'vanzare'),
    'eligible_missing_link', count(*) FILTER (WHERE eligible AND short_code IS NULL),
    'eligible_auto', count(*) FILTER (WHERE eligible AND open_row
                                        AND COALESCE(expiry_check_status, '') NOT IN ('inactiv_sursa', 'expired')
                                        AND COALESCE(published_at, created_at) >= v_since
                                        AND outreach_status IS NULL
                                        AND NOT COALESCE(do_not_call, false) AND auto_blacklisted_at IS NULL)
  ) INTO v FROM base;

  SELECT started_at, finished_at, status, error, output_summary, triggered_by INTO r
  FROM public.automation_runs WHERE job_key = 'lead.auto_classify_agency'
  ORDER BY started_at DESC LIMIT 1;

  RETURN v || jsonb_build_object('last_run', CASE WHEN FOUND THEN jsonb_build_object(
    'started_at', r.started_at, 'finished_at', r.finished_at, 'status', r.status,
    'error', r.error, 'summary', r.output_summary, 'triggered_by', r.triggered_by) ELSE NULL END);
END $function$;