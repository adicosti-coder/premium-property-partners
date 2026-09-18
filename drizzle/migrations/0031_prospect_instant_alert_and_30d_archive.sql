-- Instant alert when a new owner listing lands (debounced 3 min)
CREATE OR REPLACE FUNCTION public.notify_new_prospect_listing_immediate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret text;
  last_at timestamptz;
BEGIN
  IF COALESCE(NEW.is_active, true) = false THEN
    RETURN NEW;
  END IF;

  SELECT last_alerted_at INTO last_at
  FROM public.prospect_new_listing_alert_state
  WHERE id = true;

  IF last_at IS NOT NULL AND last_at > now() - interval '3 minutes' THEN
    RETURN NEW;
  END IF;

  BEGIN
    secret := public.get_cron_reconcile_secret();
  EXCEPTION WHEN OTHERS THEN
    secret := NULL;
  END;

  IF secret IS NULL OR secret = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-new-listings-alert',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('trigger', 'instant')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_new_listing_alert ON public.prospect_listings;
CREATE TRIGGER trg_prospect_new_listing_alert
AFTER INSERT ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.notify_new_prospect_listing_immediate();

-- Auto-archive listings older than 30 days (price history is preserved)
SELECT cron.unschedule('archive-prospect-listings-30d')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-prospect-listings-30d');

SELECT cron.schedule(
  'archive-prospect-listings-30d',
  '40 3 * * *',
  $$
  UPDATE public.prospect_listings
  SET is_active = false,
      lifecycle_status = 'expired',
      admin_notes = COALESCE(admin_notes || E'\n', '') ||
        '[' || to_char(now() AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD HH24:MI') ||
        '] auto-arhivat (>30 zile in Anunturi noi gasite)'
  WHERE is_active = true
    AND lifecycle_status NOT IN ('interested', 'calling', 'callback', 'pending_credentials', 'posted')
    AND COALESCE(last_seen_at, scraped_at, created_at) < (now() - interval '30 days');
  $$
);
