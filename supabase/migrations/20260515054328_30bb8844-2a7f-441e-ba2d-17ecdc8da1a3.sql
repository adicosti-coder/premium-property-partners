-- Trigger: când se adaugă o proprietate nouă, cere Search Console să verifice indexarea pentru URL-ul ei
CREATE OR REPLACE FUNCTION public.notify_seo_index_check_on_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RETURN NEW;
  END IF;
  v_url := 'https://realtrust.ro/proprietate/' || NEW.slug;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/seo-indexing-alerts',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('urls', jsonb_build_array(v_url))
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- nu blocăm insertul dacă verificarea SEO eșuează
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seo_index_check_new_property ON public.properties;
CREATE TRIGGER trg_seo_index_check_new_property
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seo_index_check_on_property();