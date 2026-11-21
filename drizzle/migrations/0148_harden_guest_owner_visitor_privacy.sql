-- 1. Property views keep only the referring origin and a coarse device class.
CREATE OR REPLACE FUNCTION public.normalize_property_view()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.referrer := lower(left(substring(NEW.referrer from '^(https?://[^/?#[:space:]]+)'), 200));
  NEW.user_agent := CASE
    WHEN NEW.user_agent IS NULL OR btrim(NEW.user_agent) = '' THEN NULL
    WHEN NEW.user_agent IN ('mobile', 'tablet', 'desktop') THEN NEW.user_agent
    WHEN NEW.user_agent ~* '(ipad|tablet)' THEN 'tablet'
    WHEN NEW.user_agent ~* '(mobi|android|iphone|ipod)' THEN 'mobile'
    ELSE 'desktop'
  END;
  NEW.page_path := left(NEW.page_path, 300);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_property_view ON public.property_views;
CREATE TRIGGER trg_normalize_property_view
BEFORE INSERT OR UPDATE ON public.property_views
FOR EACH ROW EXECUTE FUNCTION public.normalize_property_view();

-- 2. Public owner listings: anonymous visitors read only listing fields.
REVOKE SELECT ON public.owner_public_listings FROM anon;
GRANT SELECT (id, slug, title, description, price, currency, zone, rooms, size, image_url,
  source_url, source_platform, property_type, transaction_type, is_published,
  published_at, unpublished_at, created_at, updated_at)
  ON public.owner_public_listings TO anon;

CREATE OR REPLACE FUNCTION public.strip_owner_listing_consent_proof()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- The consent text lives only in wa_publish_consents (admin-only), never on the public row.
  NEW.consent_proof := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_owner_listing_consent_proof ON public.owner_public_listings;
CREATE TRIGGER trg_strip_owner_listing_consent_proof
BEFORE INSERT OR UPDATE ON public.owner_public_listings
FOR EACH ROW EXECUTE FUNCTION public.strip_owner_listing_consent_proof();

UPDATE public.owner_public_listings SET consent_proof = NULL WHERE consent_proof IS NOT NULL;
COMMENT ON COLUMN public.owner_public_listings.consent_proof IS 'DEPRECATED: consent text stays in wa_publish_consents; always NULL here (trigger trg_strip_owner_listing_consent_proof)';

-- 3. Internal jobs are not callable by signed-in users.
REVOKE EXECUTE ON FUNCTION public.anonymize_expired_leads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_expired_leads() TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_wa_outbound_backfill(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_wa_outbound_backfill(integer) TO service_role;

-- 4. Weekly retention for browsing history.
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_opens int := 0;
  deleted_clicks int := 0;
  deleted_memory int := 0;
  anonymized_views int := 0;
  deleted_interactions int := 0;
  started timestamptz := now();
BEGIN
  DELETE FROM public.email_open_tracking WHERE opened_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_opens = ROW_COUNT;

  DELETE FROM public.email_click_tracking WHERE clicked_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_clicks = ROW_COUNT;

  DELETE FROM public.visitor_memory
   WHERE coalesce(last_seen_at, updated_at, first_seen_at) < now() - interval '180 days';
  GET DIAGNOSTICS deleted_memory = ROW_COUNT;

  UPDATE public.property_views
     SET user_id = NULL, user_agent = NULL
   WHERE viewed_at < now() - interval '12 months'
     AND (user_id IS NOT NULL OR user_agent IS NOT NULL);
  GET DIAGNOSTICS anonymized_views = ROW_COUNT;

  DELETE FROM public.user_interactions WHERE created_at < now() - interval '365 days';
  GET DIAGNOSTICS deleted_interactions = ROW_COUNT;

  INSERT INTO public.cron_run_log(job_name, status, duration_ms, details)
  VALUES (
    'cleanup_old_tracking_data', 'success',
    EXTRACT(MILLISECONDS FROM (now() - started))::int,
    jsonb_build_object('deleted_opens', deleted_opens, 'deleted_clicks', deleted_clicks,
      'deleted_visitor_memory', deleted_memory, 'anonymized_property_views', anonymized_views,
      'deleted_user_interactions', deleted_interactions)
  );

  RETURN jsonb_build_object('ok', true, 'deleted_opens', deleted_opens, 'deleted_clicks', deleted_clicks,
    'deleted_visitor_memory', deleted_memory, 'anonymized_property_views', anonymized_views,
    'deleted_user_interactions', deleted_interactions);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_run_log(job_name, status, details)
  VALUES ('cleanup_old_tracking_data', 'failure', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_tracking_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_tracking_data() TO service_role;