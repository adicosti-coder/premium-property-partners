CREATE OR REPLACE FUNCTION public.record_prospect_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR COALESCE(OLD.price, -1) IS DISTINCT FROM COALESCE(NEW.price, -1) THEN
    INSERT INTO public.prospect_price_history (listing_id, source_platform, source_url, zone, rooms, surface, price)
    VALUES (NEW.id, NEW.source_platform, NEW.source_url, NEW.zone, NEW.rooms, NEW.size, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;
