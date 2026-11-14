CREATE OR REPLACE FUNCTION public.normalize_property_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Păstrați în paritate cu src/lib/propertyDataRules.ts
  c_max_night constant numeric := 1000;
  c_min_sale  constant numeric := 5000;
  c_max_rent  constant numeric := 10000;
  v_ws constant text := '[[:space:]\u00a0\u200b\u200c\u200d\ufeff]';
  v_keeps_nightly boolean := COALESCE(NEW.listing_type, '') IN ('cazare', 'investitie');
BEGIN
  -- 1. Nume fără spații albe la capete (inclusiv NBSP / zero-width)
  IF NEW.name IS NOT NULL THEN
    NEW.name := regexp_replace(NEW.name, '^' || v_ws || '+|' || v_ws || '+$', '', 'g');
  END IF;

  -- 2. Preț pe noapte peste plafon = preț de vânzare/chirie pus greșit
  IF NEW.base_price_per_night IS NOT NULL AND NEW.base_price_per_night > c_max_night THEN
    IF NEW.capital_necesar IS NULL THEN
      IF COALESCE(NEW.listing_type, '') IN ('vanzare', 'investitie') AND NEW.base_price_per_night >= c_min_sale THEN
        NEW.capital_necesar := NEW.base_price_per_night;
      ELSIF NEW.listing_type = 'inchiriere' AND NEW.base_price_per_night <= c_max_rent THEN
        NEW.capital_necesar := NEW.base_price_per_night;
      END IF;
    END IF;
    IF v_keeps_nightly AND TG_OP = 'UPDATE' AND OLD.base_price_per_night IS NOT NULL
       AND OLD.base_price_per_night <= c_max_night THEN
      NEW.base_price_per_night := OLD.base_price_per_night;
    ELSE
      NEW.base_price_per_night := NULL;
    END IF;
  END IF;

  IF NEW.weekend_price_per_night IS NOT NULL AND NEW.weekend_price_per_night > c_max_night THEN
    IF v_keeps_nightly AND TG_OP = 'UPDATE' AND OLD.weekend_price_per_night IS NOT NULL
       AND OLD.weekend_price_per_night <= c_max_night THEN
      NEW.weekend_price_per_night := OLD.weekend_price_per_night;
    ELSE
      NEW.weekend_price_per_night := NULL;
    END IF;
  END IF;

  -- 3. Preț de vânzare/investiție nerealist de mic (ex. 11 €, 22 €, 500 €)
  IF COALESCE(NEW.listing_type, '') IN ('vanzare', 'investitie')
     AND NEW.capital_necesar IS NOT NULL AND NEW.capital_necesar < c_min_sale THEN
    NEW.capital_necesar := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.normalize_property_fields() IS
  'Curăță numele (trim), plafonează prețul pe noapte la 1000 € (mută prețul de vânzare/chirie în capital_necesar dacă lipsește) și anulează capitalul de vânzare sub 5000 €.';

DROP TRIGGER IF EXISTS trg_normalize_property_fields ON public.properties;
CREATE TRIGGER trg_normalize_property_fields
BEFORE INSERT OR UPDATE OF name, listing_type, base_price_per_night, weekend_price_per_night, capital_necesar
ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.normalize_property_fields();