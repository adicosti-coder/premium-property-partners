-- Validation trigger to enforce bounds on andrei_retry_config in seo_settings
CREATE OR REPLACE FUNCTION public.validate_seo_settings_bounds()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_cooldown numeric;
  v_max_retries numeric;
BEGIN
  IF NEW.key = 'andrei_retry_config' THEN
    IF NEW.value IS NULL OR jsonb_typeof(NEW.value) <> 'object' THEN
      RAISE EXCEPTION 'andrei_retry_config must be a JSON object'
        USING ERRCODE = 'check_violation';
    END IF;

    v_cooldown := NULLIF(NEW.value->>'cooldownMin', '')::numeric;
    v_max_retries := NULLIF(NEW.value->>'maxRetries', '')::numeric;

    IF v_cooldown IS NULL OR v_cooldown < 5 OR v_cooldown > 720 THEN
      RAISE EXCEPTION 'cooldownMin must be between 5 and 720 (got %)', v_cooldown
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_max_retries IS NULL OR v_max_retries < 1 OR v_max_retries > 3
       OR v_max_retries <> floor(v_max_retries) THEN
      RAISE EXCEPTION 'maxRetries must be an integer between 1 and 3 (got %)', v_max_retries
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_seo_settings_bounds_trigger ON public.seo_settings;
CREATE TRIGGER validate_seo_settings_bounds_trigger
BEFORE INSERT OR UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_seo_settings_bounds();