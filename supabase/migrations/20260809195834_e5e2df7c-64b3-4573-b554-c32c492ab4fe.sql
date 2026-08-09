-- Notificare realtime IndexNow (+ resubmit sitemap Google) la schimbări de conținut public.
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
    headers := '{"Content-Type":"application/json"}'::jsonb,
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

DROP TRIGGER IF EXISTS trg_indexnow_properties ON public.properties;
CREATE TRIGGER trg_indexnow_properties
AFTER INSERT OR UPDATE OF slug, name, base_price_per_night, description_ro, image_path, images, is_active
ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.notify_indexnow_on_content_change();

DROP TRIGGER IF EXISTS trg_indexnow_blog_articles ON public.blog_articles;
CREATE TRIGGER trg_indexnow_blog_articles
AFTER INSERT OR UPDATE OF slug, title, content, cover_image, is_published
ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_indexnow_on_content_change();

DROP TRIGGER IF EXISTS trg_indexnow_residential_complexes ON public.residential_complexes;
CREATE TRIGGER trg_indexnow_residential_complexes
AFTER INSERT OR UPDATE OF slug, name, description_ro, meta_title_ro, is_active
ON public.residential_complexes
FOR EACH ROW
EXECUTE FUNCTION public.notify_indexnow_on_content_change();