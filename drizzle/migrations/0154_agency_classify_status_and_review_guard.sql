CREATE OR REPLACE FUNCTION public.classify_seller_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text := NULLIF(regexp_replace(COALESCE(NEW.phone_normalized, NEW.contact_phone, ''), '\D', '', 'g'), '');
  v_tail text;
  v_count int := 0;
  v_signal text;
BEGIN
  IF v_phone IS NOT NULL THEN
    v_tail := right(v_phone, 9);
    IF EXISTS (SELECT 1 FROM agency_blocklist b WHERE b.phone_normalized IS NOT NULL AND right(regexp_replace(b.phone_normalized,'\D','','g'),9) = v_tail) THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := 'Număr în lista locală de agenții'; RETURN NEW;
    END IF;
    SELECT count(DISTINCT p.id) INTO v_count FROM prospect_listings p
     WHERE p.id <> NEW.id AND p.duplicate_of IS NULL AND p.id IS DISTINCT FROM NEW.duplicate_of
       AND right(regexp_replace(COALESCE(p.phone_normalized,p.contact_phone,''),'\D','','g'),9) = v_tail
       AND COALESCE(p.dedup_key,'') <> COALESCE(NEW.dedup_key,'#');
    IF v_count >= 2 THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := format('Același număr apare în %s alte anunțuri diferite', v_count); RETURN NEW;
    END IF;
  END IF;
  IF COALESCE(NEW.agency_suspicion_score, 0) >= 50 THEN
    NEW.seller_type := 'agentie'; NEW.seller_type_reason := COALESCE(NEW.agency_suspicion_reason, 'Scor suspiciune agenție ridicat'); RETURN NEW;
  END IF;
  v_signal := public.developer_agency_signal(NEW.title, NEW.description);
  IF v_signal IS NOT NULL THEN
    NEW.seller_type := 'de_verificat';
    NEW.seller_type_reason := format('Needs Review: text de dezvoltator/agenție („%s”) — aprobă manual înainte de apel', v_signal);
    RETURN NEW;
  END IF;
  -- Particular doar cu un scor real de clasificare (un rezultat AI suspect lasă scorul gol → rămâne de verificat).
  IF v_phone IS NOT NULL AND NEW.agency_classified_at IS NOT NULL AND NEW.agency_suspicion_score IS NOT NULL AND NEW.agency_suspicion_score < 25 THEN
    NEW.seller_type := 'privat'; NEW.seller_type_reason := 'Număr unic, fără semne de agenție'; RETURN NEW;
  END IF;
  IF NEW.agency_classified_at IS NOT NULL AND NEW.agency_suspicion_score IS NULL THEN
    NEW.seller_type := 'de_verificat';
    NEW.seller_type_reason := COALESCE(NEW.agency_suspicion_reason, 'Clasificare automată neconcludentă — verificare manuală');
    RETURN NEW;
  END IF;
  NEW.seller_type := 'de_verificat'; NEW.seller_type_reason := 'Date insuficiente pentru confirmare';
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
    'eligible_auto', count(*) FILTER (WHERE eligible AND open_row AND is_active IS DISTINCT FROM false
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

REVOKE ALL ON FUNCTION public.admin_agency_classify_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_agency_classify_status() TO authenticated, service_role;