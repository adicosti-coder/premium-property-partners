-- Hard gate: niciun property nu poate fi is_active=true fără cel puțin o imagine.
-- Acoperă toate căile (PropertyManager admin, scrape-listing, auto-publish-listings, import manual).
-- Auto-depublică RT-061 și orice alt anunț activ fără foto, ca să nu mai apară pe site.

CREATE OR REPLACE FUNCTION public.enforce_property_has_images()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_count int := 0;
  v_arr_count int := 0;
BEGIN
  -- Permitem oricând draft (is_active=false).
  IF COALESCE(NEW.is_active, false) = false THEN
    RETURN NEW;
  END IF;

  -- Imagini din coloana array `images`
  v_arr_count := COALESCE(array_length(NEW.images, 1), 0);

  -- Imagini publicate în tabela property_images
  SELECT COUNT(*) INTO v_db_count
  FROM public.property_images
  WHERE property_id = NEW.id
    AND COALESCE(is_published, false) = true
    AND image_path IS NOT NULL
    AND image_path <> '';

  IF v_arr_count = 0
     AND v_db_count = 0
     AND (NEW.image_path IS NULL OR NEW.image_path = '') THEN
    RAISE EXCEPTION 'Anunțul "%" (cod: %) nu poate fi publicat fără cel puțin o imagine. Adaugă fotografii înainte de a-l activa.',
      COALESCE(NEW.name, '?'), COALESCE(NEW.property_code, '?')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_property_has_images ON public.properties;
CREATE TRIGGER trg_enforce_property_has_images
BEFORE INSERT OR UPDATE OF is_active, images, image_path ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_property_has_images();

-- Auto-depublică imediat anunțurile deja active fără foto (cleanup retroactiv).
UPDATE public.properties p
SET is_active = false
WHERE p.is_active = true
  AND COALESCE(array_length(p.images, 1), 0) = 0
  AND (p.image_path IS NULL OR p.image_path = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.property_images pi
    WHERE pi.property_id = p.id
      AND COALESCE(pi.is_published, false) = true
      AND pi.image_path IS NOT NULL
      AND pi.image_path <> ''
  );