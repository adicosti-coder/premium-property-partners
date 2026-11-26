CREATE OR REPLACE FUNCTION public.private_confirmed_min_score()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.private_confirmed_at IS NOT NULL THEN
    NEW.lead_score := GREATEST(COALESCE(NEW.lead_score, 0), 75);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_private_confirmed_min_score ON public.prospect_listings;
CREATE TRIGGER zz_private_confirmed_min_score
BEFORE INSERT OR UPDATE ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.private_confirmed_min_score();

UPDATE public.prospect_listings
SET lead_score = GREATEST(COALESCE(lead_score, 0), 75)
WHERE private_confirmed_at IS NOT NULL AND COALESCE(lead_score, 0) < 75;