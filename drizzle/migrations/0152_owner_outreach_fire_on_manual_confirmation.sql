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
  IF NEW.is_active IS FALSE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Manual confirmation as private owner (admin) starts the first message right away.
    v_manual := OLD.seller_type IS DISTINCT FROM NEW.seller_type;
    IF NOT v_manual THEN
      -- Automatic scoring: only when a fresh listing first rises above 60.
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

DROP TRIGGER IF EXISTS trg_fire_make_outreach ON public.prospect_listings;
CREATE TRIGGER trg_fire_make_outreach
  AFTER INSERT OR UPDATE OF lead_score, seller_type ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.fire_make_outreach();