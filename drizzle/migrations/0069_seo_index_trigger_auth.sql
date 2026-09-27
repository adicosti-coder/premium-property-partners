CREATE OR REPLACE FUNCTION public.notify_seo_index_check_on_property()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RETURN NEW;
  END IF;
  v_url := 'https://realtrust.ro/proprietate/' || NEW.slug;
  v_secret := public.get_cron_reconcile_secret();
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/seo-indexing-alerts',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(v_secret,'')),
    body := jsonb_build_object('urls', jsonb_build_array(v_url))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;