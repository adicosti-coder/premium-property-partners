-- Nu mai înregistrăm rânduri de istoric fără preț: raportul pe zonă rămâne curat.
CREATE OR REPLACE FUNCTION public.record_prospect_price_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  blob text;
  ptype text;
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RETURN NEW;
  END IF;

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
$function$;

-- Completăm istoricul cu prețurile deja existente în anunțurile găsite,
-- ca raportul pe zonă să aibă date de la prima deschidere.
INSERT INTO public.prospect_price_history (listing_id, source_platform, source_url, zone, rooms, surface, price, property_type, recorded_at)
SELECT p.id, p.source_platform, p.source_url, p.zone, p.rooms, p.size, p.price,
  CASE
    WHEN lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'')) ~ 'garsonier' THEN 'garsoniera'
    WHEN lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'')) ~ '(teren|parcel)' THEN 'teren'
    WHEN lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'')) ~ '(casa|casă|vila|vilă|duplex)' THEN 'casa'
    WHEN lower(coalesce(p.title,'') || ' ' || coalesce(p.description,'')) ~ 'apartament' THEN 'apartament'
    WHEN p.rooms = 1 THEN 'garsoniera'
    WHEN p.rooms > 1 THEN 'apartament'
    ELSE NULL
  END,
  COALESCE(p.scraped_at, p.created_at, now())
FROM public.prospect_listings p
WHERE p.price IS NOT NULL AND p.price > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.prospect_price_history h
    WHERE h.listing_id = p.id AND h.price = p.price
  );