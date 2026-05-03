
CREATE OR REPLACE FUNCTION public.redeem_owner_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code_row record;
  v_sanitized text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 3 OR length(trim(p_code)) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  v_sanitized := upper(regexp_replace(trim(p_code), '[^A-Za-z0-9\-]', '', 'g'));

  SELECT id, property_id, is_used
    INTO v_code_row
  FROM public.owner_codes
  WHERE code = v_sanitized
  FOR UPDATE;

  IF NOT FOUND OR v_code_row.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_used_code');
  END IF;

  UPDATE public.owner_codes
     SET is_used = true,
         used_by = v_user_id,
         used_at = COALESCE(used_at, now())
   WHERE id = v_code_row.id;

  INSERT INTO public.owner_properties (user_id, property_id)
  VALUES (v_user_id, v_code_row.property_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'property_id', v_code_row.property_id);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_owner_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_owner_code(text) TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own property links" ON public.owner_properties;
DROP POLICY IF EXISTS "Authenticated users can use codes" ON public.owner_codes;

CREATE OR REPLACE FUNCTION public.check_appointment_phone_rate_limit(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF p_phone IS NULL OR length(p_phone) < 7 THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.chatbot_appointments
  WHERE contact_phone = p_phone
    AND created_at > now() - interval '10 minutes';

  RETURN recent_count < 5;
END;
$$;

DROP POLICY IF EXISTS "Public can create valid appointments" ON public.chatbot_appointments;

CREATE POLICY "Public can create valid appointments"
ON public.chatbot_appointments
FOR INSERT
WITH CHECK (
  length(contact_name) BETWEEN 2 AND 120
  AND length(contact_phone) BETWEEN 7 AND 40
  AND appointment_type IS NOT NULL
  AND length(appointment_type) BETWEEN 2 AND 80
  AND (contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
  AND (user_id IS NULL OR user_id = auth.uid())
  AND public.check_appointment_phone_rate_limit(contact_phone)
);
