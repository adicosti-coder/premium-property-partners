CREATE OR REPLACE FUNCTION public.notify_admins_new_poi_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  admin_id UUID;
  poi_name TEXT;
  cron_secret TEXT;
BEGIN
  IF COALESCE(NEW.status, 'pending') <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO poi_name FROM public.points_of_interest WHERE id = NEW.poi_id;

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.user_notifications (user_id, title, message, type, action_url, action_label)
    VALUES (
      admin_id,
      '⭐ Recenzie nouă de moderat',
      COALESCE(NEW.guest_name, 'Un oaspete') || ' a lăsat ' || NEW.rating || '/5 pentru "' ||
        COALESCE(poi_name, 'o locație') || '"' ||
        COALESCE(': ' || LEFT(NEW.comment, 120), '') || '. Necesită moderare.',
      'action',
      '/admin?tab=poi-reviews',
      'Moderează recenzia'
    );
  END LOOP;

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/notify-poi-review',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', COALESCE(cron_secret, '')),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admins_new_poi_review failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_poi_review ON public.poi_reviews;
CREATE TRIGGER trg_notify_admins_new_poi_review
  AFTER INSERT ON public.poi_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_poi_review();

DROP TRIGGER IF EXISTS trg_notify_admins_updated_poi_review ON public.poi_reviews;
CREATE TRIGGER trg_notify_admins_updated_poi_review
  AFTER UPDATE OF rating, comment, status ON public.poi_reviews
  FOR EACH ROW
  WHEN (NEW.status = 'pending' AND (OLD.status IS DISTINCT FROM 'pending' OR OLD.rating IS DISTINCT FROM NEW.rating OR OLD.comment IS DISTINCT FROM NEW.comment))
  EXECUTE FUNCTION public.notify_admins_new_poi_review();