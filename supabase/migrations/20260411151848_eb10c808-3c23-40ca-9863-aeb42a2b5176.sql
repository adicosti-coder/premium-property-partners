
CREATE OR REPLACE FUNCTION public.notify_admins_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_id UUID;
  category_label TEXT;
  submitter_email TEXT;
BEGIN
  -- Get category label
  category_label := CASE NEW.listing_category::text
    WHEN 'vanzare' THEN 'Vânzare'
    WHEN 'inchiriere' THEN 'Închiriere'
    WHEN 'regim_hotelier' THEN 'Regim Hotelier'
    ELSE NEW.listing_category::text
  END;

  -- Get submitter email
  SELECT email INTO submitter_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify all admins
  FOR admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.user_notifications (
      user_id,
      title,
      message,
      type,
      action_url,
      action_label
    ) VALUES (
      admin_id,
      '📋 Anunț nou trimis pentru inspecție!',
      'Utilizatorul ' || COALESCE(submitter_email, 'necunoscut') || ' a trimis anunțul "' || LEFT(NEW.title, 60) || '" (' || category_label || ')' || COALESCE(' în ' || NEW.location, '') || '. Necesită programare inspecție.',
      'action',
      '/admin',
      'Revizuiește Anunțul'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_new_listing
  AFTER INSERT ON public.property_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_listing();
