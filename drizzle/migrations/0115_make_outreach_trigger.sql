ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS outreach_status text,
  ADD COLUMN IF NOT EXISTS outreach_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_error text;

CREATE INDEX IF NOT EXISTS idx_prospect_listings_outreach_status ON public.prospect_listings(outreach_status) WHERE outreach_status IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fire_make_outreach()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE secret text; v_phone text;
BEGIN
  IF COALESCE(NEW.agency_suspicion_score, 0) >= 70 OR COALESCE(NEW.seller_type,'') IN ('agency','agentie') THEN RETURN NEW; END IF;
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
END $$;

DROP TRIGGER IF EXISTS trg_fire_make_outreach ON public.prospect_listings;
CREATE TRIGGER trg_fire_make_outreach AFTER INSERT ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.fire_make_outreach();