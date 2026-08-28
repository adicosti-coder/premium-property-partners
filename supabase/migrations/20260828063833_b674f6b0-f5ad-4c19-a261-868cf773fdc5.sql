CREATE OR REPLACE FUNCTION public.submit_analysis_lead(
  p_name text,
  p_phone text,
  p_email text,
  p_property_type text,
  p_property_area numeric DEFAULT 0,
  p_message text DEFAULT NULL,
  p_simulation jsonb DEFAULT NULL,
  p_source text DEFAULT 'analiza_proprietate'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
BEGIN
  IF length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF length(v_phone) < 6 OR length(v_phone) > 30 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF v_email <> '' AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  -- Reuse an existing recent lead for the same phone so we do not create duplicates.
  SELECT status_token INTO v_token
  FROM public.leads
  WHERE regexp_replace(whatsapp_number, '\s', '', 'g') = v_phone
    AND created_at > now() - interval '30 days'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_token IS NOT NULL THEN
    UPDATE public.leads
      SET last_touch_at = now(),
          touch_count = touch_count + 1,
          simulation_data = coalesce(p_simulation, simulation_data),
          message = coalesce(nullif(btrim(coalesce(p_message, '')), ''), message)
      WHERE status_token = v_token;
    RETURN v_token;
  END IF;

  INSERT INTO public.leads (name, whatsapp_number, email, property_type, property_area, message, source, simulation_data)
  VALUES (
    left(v_name, 100),
    v_phone,
    nullif(v_email, ''),
    left(coalesce(nullif(btrim(coalesce(p_property_type, '')), ''), 'apartament'), 50),
    greatest(0, coalesce(p_property_area, 0)),
    left(coalesce(p_message, ''), 2000),
    left(coalesce(p_source, 'analiza_proprietate'), 60),
    p_simulation
  )
  RETURNING status_token INTO v_token;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_analysis_lead(text, text, text, text, numeric, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_analysis_lead(text, text, text, text, numeric, text, jsonb, text) TO anon, authenticated, service_role;