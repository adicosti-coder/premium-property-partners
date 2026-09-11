-- 1. IndexNow content-change trigger must authenticate itself now that the
--    edge function rejects anonymous callers.
CREATE OR REPLACE FUNCTION public.notify_indexnow_on_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_path text;
  v_slug text;
BEGIN
  v_slug := NEW.slug;
  IF v_slug IS NULL OR v_slug = '' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'properties' THEN
    IF COALESCE(NEW.is_active, false) IS NOT TRUE THEN
      RETURN NEW;
    END IF;
    v_path := '/proprietate/' || v_slug;
  ELSIF TG_TABLE_NAME = 'blog_articles' THEN
    IF COALESCE(NEW.is_published, false) IS NOT TRUE THEN
      RETURN NEW;
    END IF;
    v_path := '/blog/' || v_slug;
  ELSIF TG_TABLE_NAME = 'residential_complexes' THEN
    IF COALESCE(NEW.is_active, false) IS NOT TRUE THEN
      RETURN NEW;
    END IF;
    v_path := '/complex/' || v_slug;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/indexnow-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_reconcile_secret()
    ),
    body := jsonb_build_object(
      'urls', jsonb_build_array('https://realtrust.ro' || v_path),
      'triggered_by', 'db_trigger_' || TG_TABLE_NAME,
      'submit_sitemaps', true
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nu blocăm niciodată insert/update-ul dacă notificarea eșuează.
  RETURN NEW;
END;
$function$;

-- 2. Re-schedule automation cron jobs so they send the internal cron secret.
SELECT cron.schedule('voice-agent-sync-knowledge-daily', '30 3 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-sync-knowledge',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('triggered_at', now())
  );
$$);

SELECT cron.schedule('voice-drill-nightly', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-drill-runner',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('source','cron')
  );
$$);

SELECT cron.schedule('voice-ab-eval-nightly', '30 23 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-ab-script',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('action','auto_evaluate')
  );
$$);

SELECT cron.schedule('seo-opportunity-detector', '15 6 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/seo-opportunity-detector',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('blog-ai-autopilot-daily', '0 1 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/blog-ai-autopilot',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('limit', 5, 'triggered_by', 'cron')
  );
$$);

SELECT cron.schedule('indexnow-daily-enqueue-missing', '30 3 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/indexnow-verify-and-reindex',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('action','enqueue_missing')
  );
$$);

SELECT cron.schedule('indexnow-weekly-reindex', '0 4 * * 1', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/indexnow-verify-and-reindex',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('action','enqueue_missing')
  );
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/indexnow-verify-and-reindex',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('action','reindex_queue')
  );
$$);

SELECT cron.schedule('indexnow-daily-verify', '30 3 * * *', $$
  SELECT net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/indexnow-verify-and-reindex',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_reconcile_secret()),
    body := jsonb_build_object('action','verify','limit',40)
  );
$$);