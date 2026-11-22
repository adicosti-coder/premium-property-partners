CREATE OR REPLACE FUNCTION public.fire_make_outreach()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE secret text; v_phone text; v_manual boolean := false;
BEGIN
  IF NEW.outreach_status IS NOT NULL THEN RETURN NEW; END IF;
  IF public.prospect_is_agency(NEW) THEN RETURN NEW; END IF;
  IF COALESCE(NEW.seller_type, '') <> 'privat' OR COALESCE(NEW.lead_score, 0) <= 60 THEN RETURN NEW; END IF;
  -- Anunțurile parcate (nepublicate pe site) pot primi mesajul; cele scoase de pe portal nu.
  IF COALESCE(NEW.expiry_check_status, '') IN ('inactiv_sursa', 'expired') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    v_manual := OLD.seller_type IS DISTINCT FROM NEW.seller_type;
    IF NOT v_manual THEN
      IF COALESCE(OLD.lead_score, 0) > 60 THEN RETURN NEW; END IF;
      IF NEW.created_at < now() - interval '7 days' THEN RETURN NEW; END IF;
    END IF;
  END IF;
  IF COALESCE(NEW.do_not_call, false) OR NEW.auto_blacklisted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.lifecycle_status IN ('rejected','expired','failed','posted') THEN RETURN NEW; END IF;
  v_phone := public.normalize_ro_phone(COALESCE(NEW.phone_normalized, NEW.contact_phone));
  IF v_phone IS NULL OR v_phone !~ '^\+407[0-9]{8}$' THEN RETURN NEW; END IF;
  BEGIN secret := public.get_cron_reconcile_secret(); EXCEPTION WHEN OTHERS THEN secret := NULL; END;
  IF secret IS NULL OR secret = '' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/outreach-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),
    body := jsonb_build_object('prospect_id', NEW.id)
  );
  RETURN NEW;
END $function$;

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
    'needs_phone', count(*) FILTER (WHERE open_row AND phone_normalized IS NULL AND COALESCE(contact_phone, '') = ''),
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