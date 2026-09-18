ALTER TABLE public.prospect_price_history
  ADD COLUMN IF NOT EXISTS property_type TEXT;

CREATE INDEX IF NOT EXISTS idx_prospect_price_history_zone_type
  ON public.prospect_price_history (zone, property_type, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.record_prospect_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blob text;
  ptype text;
BEGIN
  IF TG_OP = 'INSERT' OR COALESCE(OLD.price, -1) IS DISTINCT FROM COALESCE(NEW.price, -1) THEN
    blob := lower(coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
    ptype := CASE
      WHEN blob ~ 'garsonier' THEN 'garsoniera'
      WHEN blob ~ '(teren|parcel|lot de)' THEN 'teren'
      WHEN blob ~ '(casa|casă|vila|vilă|duplex)' THEN 'casa'
      WHEN blob ~ '(spatiu comercial|spațiu comercial|birou)' THEN 'comercial'
      WHEN blob ~ 'apartament' THEN 'apartament'
      WHEN NEW.rooms = 1 THEN 'garsoniera'
      WHEN NEW.rooms > 1 THEN 'apartament'
      ELSE NULL
    END;

    INSERT INTO public.prospect_price_history (listing_id, source_platform, source_url, zone, rooms, surface, price, property_type)
    VALUES (NEW.id, NEW.source_platform, NEW.source_url, NEW.zone, NEW.rooms, NEW.size, NEW.price, ptype);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.prospect_price_history h
SET property_type = CASE
  WHEN lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')) ~ 'garsonier' THEN 'garsoniera'
  WHEN lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')) ~ '(teren|parcel|lot de)' THEN 'teren'
  WHEN lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')) ~ '(casa|casă|vila|vilă|duplex)' THEN 'casa'
  WHEN lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')) ~ '(spatiu comercial|spațiu comercial|birou)' THEN 'comercial'
  WHEN lower(coalesce(p.title, '') || ' ' || coalesce(p.description, '')) ~ 'apartament' THEN 'apartament'
  WHEN h.rooms = 1 THEN 'garsoniera'
  WHEN h.rooms > 1 THEN 'apartament'
  ELSE NULL
END
FROM public.prospect_listings p
WHERE h.listing_id = p.id AND h.property_type IS NULL;
