CREATE OR REPLACE FUNCTION public.sync_property_size_from_usable_area()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.usable_area IS NOT NULL AND NEW.usable_area > 0 THEN
    NEW.size := round(NEW.usable_area)::int;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_property_size ON public.properties;
CREATE TRIGGER trg_sync_property_size BEFORE INSERT OR UPDATE OF usable_area, size ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.sync_property_size_from_usable_area();